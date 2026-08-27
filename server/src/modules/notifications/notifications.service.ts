import { HttpStatus, Injectable } from '@nestjs/common';
import { Notification, Prisma } from '@prisma/client';

import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/common/database/prisma.service';
import { buildPaginationMeta, getSkip } from '@/common/utils/pagination.util';
import type { PaginationMeta } from '@/common/types/api-response.types';
import { FilesService } from '@/modules/files/files.service';
import { R2Service } from '@/modules/files/r2.service';
import { NotificationsGateway } from '@/modules/notifications/notifications.gateway';
import {
  notificationInclude,
  type NotificationResponse,
  type TiptapContent,
  type TiptapNode,
} from '@/modules/notifications/mappers/notification.mapper';
import type {
  CreateNotificationInput,
  ListNotificationsQuery,
  UpdateNotificationInput,
} from '@/modules/notifications/schemas/notification.schema';
import { tiptapJsonToHtml } from '@/modules/blogs/utils/tiptap-json-to-html';
import { type PaginationQuery } from '@/common/schemas/shared.schema';

export interface NotificationRoomInfo {
  id: string;
  label: string;
  type: string;
  members: number;
}

type TiptapDoc = {
  type: 'doc';
  content?: TiptapNode[];
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Service: R2Service,
    private readonly filesService: FilesService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async list(
    schoolId: string,
    query: ListNotificationsQuery,
  ): Promise<{ items: NotificationResponse[]; meta: PaginationMeta }> {
    // Filter notifications by SCHOOL room type
    const schoolRoomConditions = {
      rooms: {
        some: {
          roomType: 'SCHOOL',
        },
      },
    };

    const where: Prisma.NotificationWhereInput = {
      schoolId,
      ...schoolRoomConditions,
    };

    // Additional filter by user rooms if provided
    if (query.rooms && query.rooms.length > 0) {
      const roomConditions = query.rooms.map((room) => ({
        roomType: room.roomType,
        ...(room.targetId ? { targetId: room.targetId } : { targetId: null }),
      }));

      where.rooms = {
        some: {
          OR: [...roomConditions, { roomType: 'SCHOOL' }],
        },
      };
    }

    const [total, notifications] = await this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip: getSkip(query.page, query.limit),
        take: query.limit,
        include: notificationInclude,
      }),
    ]);

    const items = await Promise.all(
      notifications.map(async (notification) => {
        const thumbnailUrl = await this.getThumbnailUrl(notification);
        return this.toNotificationResponseWithContent(
          notification,
          thumbnailUrl,
        );
      }),
    );

    return {
      items,
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async findById(schoolId: string, id: string): Promise<NotificationResponse> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, schoolId },
      include: notificationInclude,
    });

    if (!notification) {
      throw new AppException(
        'NOTIFICATION_NOT_FOUND',
        'Không tìm thấy thông báo',
        HttpStatus.NOT_FOUND,
      );
    }

    const thumbnailUrl = await this.getThumbnailUrl(notification);
    return this.toNotificationResponseWithContent(notification, thumbnailUrl);
  }

  async findBySlug(
    schoolId: string,
    slug: string,
  ): Promise<NotificationResponse> {
    const notification = await this.prisma.notification.findFirst({
      where: { schoolId, slug },
      include: notificationInclude,
    });

    if (!notification) {
      throw new AppException(
        'NOTIFICATION_NOT_FOUND',
        'Không tìm thấy thông báo',
        HttpStatus.NOT_FOUND,
      );
    }

    const thumbnailUrl = await this.getThumbnailUrl(notification);
    return this.toNotificationResponseWithContent(notification, thumbnailUrl);
  }

  async create(
    schoolId: string,
    createdById: string,
    input: CreateNotificationInput,
  ): Promise<NotificationResponse> {
    let content: TiptapDoc = input.content;
    let thumbnailStorageKey: string | null = null;
    // Promote temp files if any
    if (input.tempFiles && input.tempFiles.length > 0) {
      const filesToPromote = input.tempFiles.map((f) => ({
        fileId: f.fileId,
        purpose: 'NOTIFICATION_IMAGE' as const,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
        originalName: f.originalName,
      }));

      const promoted = await this.filesService.batchPromoteTemp(
        schoolId,
        createdById,
        filesToPromote,
      );

      // Build fileId -> storageKey map
      const fileIdToStorageKey = new Map<string, string>();
      for (const file of promoted.files) {
        if (file.storageKey) {
          fileIdToStorageKey.set(file.id, file.storageKey);
        }
      }

      // Replace temp URLs in JSON content with storage keys
      content = this.replaceTempUrlsInJson(content, fileIdToStorageKey);
    }

    // Promote thumbnail if provided
    if (input.thumbnailFileId && input.thumbnailMimeType) {
      const thumbnailPromoted = await this.filesService.batchPromoteTemp(
        schoolId,
        createdById,
        [
          {
            fileId: input.thumbnailFileId,
            purpose: 'NOTIFICATION_THUMBNAIL',
            mimeType: input.thumbnailMimeType,
            sizeBytes: 0,
            originalName: input.thumbnailFileId,
          },
        ],
      );

      if (thumbnailPromoted.files.length > 0) {
        thumbnailStorageKey = thumbnailPromoted.files[0].storageKey ?? null;
      }
    }

    // Create notification with rooms
    const slug =
      input.slug || (await this.generateUniqueSlug(schoolId, input.title));

    const notification = await this.prisma.notification.create({
      data: {
        schoolId,
        title: input.title,
        slug,
        content: content as unknown as Prisma.InputJsonValue,
        thumbnailStorageKey,
        createdById,
        rooms: {
          create: input.rooms.map((room) => ({
            roomType: room.roomType,
            targetId: room.targetId ?? null,
          })),
        },
      },
      include: notificationInclude,
    });

    const thumbnailUrl = await this.getThumbnailUrl(notification);
    const response = await this.toNotificationResponseWithContent(
      notification,
      thumbnailUrl,
    );

    // Broadcast via WebSocket
    await this.broadcastToRooms(schoolId, response);

    return response;
  }

  /**
   * Tạo thông báo khi giáo viên lưu điểm.
   * Gửi đến phòng COURSE (lớp môn học) để phụ huynh nhận thông báo.
   */
  private buildNotificationContent(
    mainText: string,
    callToAction = 'Quý phụ huynh vui lòng kiểm tra sổ điểm của con em mình.',
  ): string {
    return tiptapJsonToHtml({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: mainText }] },
        { type: 'paragraph', content: [{ type: 'text', text: callToAction }] },
      ],
    });
  }

  async scoreNotification(
    schoolId: string,
    createdById: string,
    courseSectionId: string,
    courseSectionName: string,
    actionType: 'UPDATED' | 'LOCKED',
    assessmentName?: string[],
  ): Promise<void> {
    const isLocked = actionType === 'LOCKED';
    const assessmentText = assessmentName?.join(', ') ?? '';

    const mainText = isLocked
      ? `Điểm của lớp môn ${courseSectionName} đã được khóa.`
      : `Điểm ${assessmentText} của lớp môn ${courseSectionName} đã được cập nhật.`;

    const title = isLocked
      ? `Khóa điểm lớp ${courseSectionName}`
      : `Cập nhật đầu điểm ${assessmentText} của lớp ${courseSectionName}`;

    const content = this.buildNotificationContent(mainText);
    const slug = await this.generateUniqueSlug(schoolId, title);

    const notification = await this.prisma.notification.create({
      data: {
        schoolId,
        title,
        slug,
        content,
        createdById,
        rooms: {
          create: {
            roomType: 'COURSE',
            targetId: courseSectionId,
          },
        },
      },
      include: notificationInclude,
    });

    const response = await this.toNotificationResponseWithContent(
      notification,
      null,
    );

    await this.broadcastToRooms(schoolId, response);
  }

  async lockSemesterOrAcademicYearSchoolNotification(
    academicYearName: string,
    schoolId: string,
    createdById: string,
    actionType: 'SEMESTER' | 'ACADEMIC_YEAR',
    semesterName?: string,
  ): Promise<void> {
    const isSemester = actionType === 'SEMESTER';

    const mainText = isSemester
      ? `Học kỳ ${semesterName} năm học ${academicYearName} đã hoàn thành.`
      : `Năm học ${academicYearName} đã hoàn thành.`;

    const title = isSemester
      ? `Học kỳ ${semesterName} năm học ${academicYearName} đã hoàn thành.`
      : `Năm học ${academicYearName} đã hoàn thành.`;

    const content = this.buildNotificationContent(mainText);
    const slug = await this.generateUniqueSlug(schoolId, title);

    const notification = await this.prisma.notification.create({
      data: {
        schoolId,
        title,
        slug,
        content,
        createdById,
        rooms: {
          create: {
            roomType: 'SCHOOL',
            targetId: schoolId,
          },
        },
      },
      include: notificationInclude,
    });

    const response = await this.toNotificationResponseWithContent(
      notification,
      null,
    );

    await this.broadcastToRooms(schoolId, response);
  }

  async listByRoom(
    schoolId: string,
    rooms: { roomType: string; targetId: string }[],
    query: PaginationQuery,
  ): Promise<{ items: NotificationResponse[]; meta: PaginationMeta }> {
    // 1. Chuẩn hóa điều kiện lọc theo cặp roomType và targetId
    const roomConditions = rooms.map((room) => ({
      roomType: room.roomType.toUpperCase(),
      targetId: room.targetId || null,
    }));

    // 2. Xây dựng câu lệnh điều kiện `where` cho Prisma
    const where: Prisma.NotificationWhereInput = {
      schoolId,
      rooms: {
        some: {
          OR: roomConditions,
        },
      },
    };

    // 3. Thực thi transaction để lấy tổng số lượng và danh sách phân trang song song
    const [total, data] = await this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: getSkip(query.page, query.limit),
        take: query.limit,
        include: notificationInclude,
      }),
    ]);

    // 4. Xử lý async để gán thumbnailUrl và chuyển đổi sang dạng Response DTO
    const items = await Promise.all(
      data.map(async (notification) => {
        const thumbnailUrl = await this.getThumbnailUrl(notification);
        return this.toNotificationResponseWithContent(
          notification,
          thumbnailUrl,
        );
      }),
    );

    // 5. Trả về kết quả kèm metadata phân trang
    return {
      items,
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  getAvailableRooms(schoolId: string): NotificationRoomInfo[] {
    return [
      {
        id: `school:${schoolId}`,
        label: 'Toàn trường',
        type: 'SCHOOL',
        members: 0,
      },
      {
        id: `homeroom:${schoolId}`,
        label: 'Lớp chủ nhiệm',
        type: 'HOMEROOM',
        members: 0,
      },
      {
        id: `grade:${schoolId}`,
        label: 'Khối lớp',
        type: 'GRADE',
        members: 0,
      },
      {
        id: `course:${schoolId}`,
        label: 'Môn học',
        type: 'COURSE',
        members: 0,
      },
    ];
  }

  async update(
    schoolId: string,
    slug: string,
    updatedById: string,
    input: UpdateNotificationInput,
  ): Promise<NotificationResponse> {
    console.log(input);
    const existing = await this.prisma.notification.findFirst({
      where: { schoolId, slug },
      include: notificationInclude,
    });

    if (!existing) {
      throw new AppException(
        'NOTIFICATION_NOT_FOUND',
        'Không tìm thấy thông báo',
        HttpStatus.NOT_FOUND,
      );
    }

    let content: TiptapDoc | undefined;
    if (input.content !== undefined) {
      content = input.content;
    }

    let thumbnailStorageKey: string | null | undefined =
      existing.thumbnailStorageKey;

    // Promote temp files if any
    if (input.tempFiles && input.tempFiles.length > 0) {
      const filesToPromote = input.tempFiles.map((f) => ({
        fileId: f.fileId,
        purpose: 'NOTIFICATION_IMAGE' as const,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
        originalName: f.originalName,
      }));

      const promoted = await this.filesService.batchPromoteTemp(
        schoolId,
        updatedById,
        filesToPromote,
      );

      // Build fileId -> storageKey map
      const fileIdToStorageKey = new Map<string, string>();
      for (const file of promoted.files) {
        if (file.storageKey) {
          fileIdToStorageKey.set(file.id, file.storageKey);
        }
      }

      // Replace temp URLs in JSON content if content is also provided
      if (content) {
        content = this.replaceTempUrlsInJson(content, fileIdToStorageKey);
      }
    }

    // Promote thumbnail if provided (new thumbnail selected)
    if (input.thumbnailFileId && input.thumbnailMimeType) {
      const thumbnailPromoted = await this.filesService.batchPromoteTemp(
        schoolId,
        updatedById,
        [
          {
            fileId: input.thumbnailFileId,
            purpose: 'NOTIFICATION_THUMBNAIL',
            mimeType: input.thumbnailMimeType,
            sizeBytes: 0,
            originalName: input.thumbnailFileId,
          },
        ],
      );

      // Delete old thumbnail if needed
      if (input.thumbnailNeedToDelete) {
        await this.filesService.deleteFiles(
          [input.thumbnailNeedToDelete],
          schoolId,
        );
      }

      if (thumbnailPromoted.files.length > 0) {
        thumbnailStorageKey = thumbnailPromoted.files[0].storageKey ?? null;
      }
    } else if (input.thumbnailNeedToDelete && !input.thumbnailFileId) {
      // Thumbnail was removed
      await this.filesService.deleteFiles(
        [input.thumbnailNeedToDelete],
        schoolId,
      );
      thumbnailStorageKey = null;
    }

    const data: Prisma.NotificationUpdateInput = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(content !== undefined
        ? { content: content as unknown as Prisma.InputJsonValue }
        : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(thumbnailStorageKey !== undefined ? { thumbnailStorageKey } : {}),
    };

    // Regenerate slug if title changes but slug is not provided
    if (input.title !== undefined && input.slug === undefined) {
      data.slug = await this.generateUniqueSlug(schoolId, input.title);
    }

    // Update rooms if provided
    if (input.rooms !== undefined) {
      // Delete existing rooms
      await this.prisma.notificationRoom.deleteMany({
        where: { notificationId: existing.id },
      });

      if (input.fileNeedToDelete && input.fileNeedToDelete.length > 0) {
        console.log('input.fileNeedToDelete', input.fileNeedToDelete);
        await this.filesService.deleteFiles(input.fileNeedToDelete, schoolId);
      }

      // Create new rooms
      await this.prisma.notificationRoom.createMany({
        data: input.rooms.map((room) => ({
          notificationId: existing.id,
          roomType: room.roomType,
          targetId: room.targetId ?? null,
        })),
      });
    }

    const notification = await this.prisma.notification.update({
      where: { id: existing.id },
      data,
      include: notificationInclude,
    });

    const thumbnailUrl = await this.getThumbnailUrl(notification);
    return this.toNotificationResponseWithContent(notification, thumbnailUrl);
  }

  async delete(schoolId: string, slug: string): Promise<void> {
    const notification = await this.prisma.notification.findFirst({
      where: { schoolId, slug },
    });

    if (!notification) {
      throw new AppException(
        'NOTIFICATION_NOT_FOUND',
        'Không tìm thấy thông báo',
        HttpStatus.NOT_FOUND,
      );
    }

    // Delete thumbnail file if exists
    if (notification.thumbnailStorageKey) {
      await this.filesService.deleteFiles(
        [notification.thumbnailStorageKey],
        schoolId,
      );
    }

    // Delete notification (cascade will delete rooms)
    await this.prisma.notification.delete({
      where: { id: notification.id },
    });
  }

  private async broadcastToRooms(
    schoolId: string,
    notification: NotificationResponse,
  ): Promise<void> {
    const rooms = notification.rooms.map((room) => {
      if (room.targetId) {
        return `${room.roomType.toLowerCase()}:${room.targetId}`;
      }
      return `${room.roomType.toLowerCase()}:${notification.schoolId}`;
    });

    for (const room of rooms) {
      await this.notificationsGateway.broadcastToRoom(schoolId, room, {
        id: notification.id,
        title: notification.title,
        contentHtml: notification.contentHtml,
        thumbnailUrl: notification.thumbnailUrl,
        createdAt: notification.createdAt,
      });
    }
  }

  private replaceTempUrlsInJson(
    doc: TiptapDoc,
    fileIdToStorageKey: Map<string, string>,
  ): TiptapDoc {
    const replaceNode = (node: TiptapNode): TiptapNode => {
      if (node.type === 'image') {
        const attrs = node.attrs || {};
        const src = attrs.src as string | undefined;

        if (src) {
          const match = src.match(/\/files\/([^/]+)\/temp/);
          if (match) {
            const fileId = match[1];
            const storageKey = fileIdToStorageKey.get(fileId);
            if (storageKey) {
              return {
                ...node,
                attrs: {
                  ...attrs,
                  src: storageKey,
                  'data-file-id': fileId,
                },
              };
            }
          }
        }
      }

      if (node.content) {
        return {
          ...node,
          content: node.content.map(replaceNode),
        };
      }

      return node;
    };

    return {
      type: 'doc',
      content: doc.content?.map(replaceNode),
    };
  }

  private async getThumbnailUrl(notification: {
    thumbnailStorageKey: string | null;
  }): Promise<string | null> {
    if (!notification.thumbnailStorageKey) return null;

    try {
      return await this.r2Service.createPresignedUrl(
        notification.thumbnailStorageKey,
      );
    } catch {
      return null;
    }
  }

  private async toNotificationResponseWithContent(
    notification: {
      id: string;
      schoolId: string;
      title: string;
      slug: string;
      content: Prisma.InputJsonValue | null;
      thumbnailStorageKey: string | null;
      createdById: string | null;
      createdAt: Date;
      updatedAt: Date;
      rooms: Array<{
        roomType: string;
        targetId: string | null;
      }>;
      createdBy?: { fullName: string | null } | null;
    },
    thumbnailUrl: string | null,
  ): Promise<NotificationResponse> {
    let contentHtml = '';

    const rawContent = notification.content as {
      type?: string;
      content?: TiptapNode[];
    } | null;
    const content: TiptapContent =
      rawContent && rawContent.type === 'doc'
        ? (rawContent as TiptapContent)
        : null;

    if (content?.content) {
      const contentWithImageUrl = await Promise.all(
        content.content.map(async (ct) => {
          if (ct.type !== 'image' || !ct.attrs?.src) return ct;

          const newCt = { ...ct } as TiptapNode & { attrs: { src: string } };
          newCt.attrs.src = await this.r2Service.createPresignedUrl(
            ct.attrs.src as string,
          );

          return newCt;
        }),
      );

      contentHtml = tiptapJsonToHtml({
        type: 'doc',
        content: contentWithImageUrl,
      });
    }

    return {
      id: notification.id,
      schoolId: notification.schoolId,
      title: notification.title,
      slug: notification.slug,
      content,
      contentHtml,
      thumbnailUrl,
      thumbnailStorageKey: notification.thumbnailStorageKey,
      rooms: notification.rooms.map((room) => ({
        roomType: room.roomType as 'SCHOOL' | 'HOMEROOM' | 'GRADE' | 'COURSE',
        targetId: room.targetId,
      })),
      createdById: notification.createdById,
      createdByName: notification.createdBy?.fullName ?? null,
      createdAt: notification.createdAt.toISOString(),
      updatedAt: notification.updatedAt.toISOString(),
    };
  }

  private async generateUniqueSlug(
    schoolId: string,
    title: string,
  ): Promise<string> {
    // Convert title to URL-friendly slug
    const baseSlug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .substring(0, 100);

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.notification.findFirst({
        where: { schoolId, slug },
      });

      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }
}
