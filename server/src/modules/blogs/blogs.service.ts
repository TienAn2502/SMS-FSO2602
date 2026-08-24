import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, FilePurpose } from '@prisma/client';

import { AppException } from '@/common/exceptions/app.exception';
import { PrismaService } from '@/common/database/prisma.service';
import { buildPaginationMeta, getSkip } from '@/common/utils/pagination.util';
import type { PaginationMeta } from '@/common/types/api-response.types';
import { FilesService } from '@/modules/files/files.service';
import { R2Service } from '@/modules/files/r2.service';
import {
  blogInclude,
  toBlogResponse,
  type BlogResponse,
} from '@/modules/blogs/mappers/blog.mapper';
import type {
  CreateBlogInput,
  ListBlogsQuery,
  UpdateBlogInput,
} from '@/modules/blogs/schemas/blog.schema';

interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
}

type TiptapDoc = {
  type: 'doc';
  content?: TiptapNode[];
};

@Injectable()
export class BlogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Service: R2Service,
    private readonly filesService: FilesService,
  ) {}

  async list(
    schoolId: string,
    query: ListBlogsQuery,
  ): Promise<{ items: BlogResponse[]; meta: PaginationMeta }> {
    const where: Prisma.BlogWhereInput = {
      schoolId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              {
                title: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                author: {
                  fullName: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.BlogOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    const [total, blogs] = await this.prisma.$transaction([
      this.prisma.blog.count({ where }),
      this.prisma.blog.findMany({
        where,
        orderBy,
        skip: getSkip(query.page, query.limit),
        take: query.limit,
        include: blogInclude,
      }),
    ]);

    const items = await Promise.all(
      blogs.map(async (blog) => {
        const thumbnailUrl = await this.getThumbnailUrl(blog);
        return toBlogResponse(blog, thumbnailUrl);
      }),
    );

    return {
      items,
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async findById(schoolId: string, slug: string): Promise<BlogResponse> {
    const blog = await this.findBlogInTenant(schoolId, slug);
    const thumbnailUrl = await this.getThumbnailUrl(blog);
    return toBlogResponse(blog, thumbnailUrl);
  }

  async create(
    schoolId: string,
    authorId: string,
    input: CreateBlogInput,
  ): Promise<BlogResponse> {
    const slug = await this.generateUniqueSlug(schoolId, input.title);

    let content: TiptapDoc = input.content;
    let thumbnailStorageKey: string | null = null;

    // Promote temp files if any
    if (input.tempFiles.length > 0) {
      const filesToPromote = input.tempFiles.map((f) => ({
        fileId: f.fileId,
        purpose: 'BLOG_IMAGE' as const,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
        originalName: f.originalName,
      }));

      const promoted = await this.filesService.batchPromoteTemp(
        schoolId,
        authorId,
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
        authorId,
        [
          {
            fileId: input.thumbnailFileId,
            purpose: 'BLOG_THUMBNAIL',
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

    const blog = await this.prisma.blog.create({
      data: {
        schoolId,
        authorId,
        title: input.title,
        slug,
        content: content as unknown as Prisma.InputJsonValue,
        status: input.status,
        thumbnailStorageKey,
        metaTitle: input.metaTitle ?? null,
        metaDescription: input.metaDescription ?? null,
        publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
      },
      include: blogInclude,
    });

    const thumbnailUrl = await this.getThumbnailUrl(blog);
    return toBlogResponse(blog, thumbnailUrl);
  }

  async update(
    schoolId: string,
    slug: string,
    input: UpdateBlogInput,
  ): Promise<BlogResponse> {
    const existingBlog = await this.findBlogInTenant(schoolId, slug);

    let content: TiptapDoc | undefined;
    if (input.content !== undefined) {
      content = input.content;
    }

    let thumbnailStorageKey: string | null | undefined =
      existingBlog.thumbnailStorageKey;

    // Promote temp files if any
    if (input.tempFiles && input.tempFiles.length > 0) {
      const filesToPromote = input.tempFiles.map((f) => ({
        fileId: f.fileId,
        purpose: 'BLOG_IMAGE' as FilePurpose,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
        originalName: f.originalName,
      }));

      const promoted = await this.filesService.batchPromoteTemp(
        schoolId,
        existingBlog.authorId,
        filesToPromote,
      );

      // Build fileId -> storageKey map
      const fileIdToStorageKey = new Map<string, string>();
      for (const file of promoted.files) {
        if (file.storageKey) {
          fileIdToStorageKey.set(file.id, file.storageKey);
        }
      }
    }

    // Promote thumbnail if provided (new thumbnail selected)
    if (input.thumbnailFileId && input.thumbnailMimeType) {
      const thumbnailPromoted = await this.filesService.batchPromoteTemp(
        schoolId,
        existingBlog.authorId,
        [
          {
            fileId: input.thumbnailFileId,
            purpose: 'BLOG_THUMBNAIL',
            mimeType: input.thumbnailMimeType,
            sizeBytes: 0,
            originalName: input.thumbnailFileId,
          },
        ],
      );

      if (input.thumbnailNeedToDelete) {
        await this.filesService.deleteFiles(
          [input.thumbnailNeedToDelete],
          schoolId,
        );
      }

      if (thumbnailPromoted.files.length > 0) {
        thumbnailStorageKey = thumbnailPromoted.files[0].storageKey ?? null;
      }
    }

    const data: Prisma.BlogUpdateInput = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(content !== undefined
        ? { content: content as unknown as Prisma.InputJsonValue }
        : {}),
      ...(input.status !== undefined
        ? {
            status: input.status,
            publishedAt:
              input.status === 'PUBLISHED' && !existingBlog.publishedAt
                ? new Date()
                : existingBlog.publishedAt,
          }
        : {}),
      ...(thumbnailStorageKey !== undefined ? { thumbnailStorageKey } : {}),
      ...(input.metaTitle !== undefined ? { metaTitle: input.metaTitle } : {}),
      ...(input.metaDescription !== undefined
        ? { metaDescription: input.metaDescription }
        : {}),
    };

    // Delete unneeded files
    if (input.fileNeedToDelete && input.fileNeedToDelete.length > 0) {
      await this.filesService.deleteFiles(input.fileNeedToDelete, schoolId);
    }

    const blog = await this.prisma.blog.update({
      where: { schoolId_slug: { schoolId, slug } },
      data,
      include: blogInclude,
    });

    const thumbnailUrl = await this.getThumbnailUrl(blog);
    return toBlogResponse(blog, thumbnailUrl);
  }

  async delete(schoolId: string, slug: string): Promise<void> {
    const blog = await this.findBlogInTenant(schoolId, slug);
    await this.prisma.blog.delete({
      where: { schoolId_slug: { schoolId, slug: blog.slug } },
    });
  }

  private async findBlogInTenant(schoolId: string, slug: string) {
    const blog = await this.prisma.blog.findFirst({
      where: { schoolId, slug },
      include: blogInclude,
    });

    if (!blog) {
      throw new AppException(
        'BLOG_NOT_FOUND',
        'Không tìm thấy bài viết',
        HttpStatus.NOT_FOUND,
      );
    }

    const content = blog.content as { content?: TiptapNode[] } | null;

    if (content?.content) {
      const blogContentWithImageUrl = await Promise.all(
        content.content.map(async (ct) => {
          if (ct.type !== 'image' || !ct.attrs?.src) return ct; // không phải ảnh thì bỏ qua

          // preSignUrl để hiển thị ảnh mỗi lần vào xem chi tiết blog (vì đã setup thời gian hiển thị cho ảnh thấp)
          const newCt = { ...ct } as TiptapNode & { attrs: { src: string } };
          newCt.attrs.src = await this.r2Service.createPresignedUrl(
            ct.attrs.src as string,
          );

          return newCt;
        }),
      );

      content.content = blogContentWithImageUrl;
    }

    return blog;
  }

  private async generateUniqueSlug(
    schoolId: string,
    title: string,
  ): Promise<string> {
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
      const existing = await this.prisma.blog.findFirst({
        where: { schoolId, slug },
      });

      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private async getThumbnailUrl(blog: {
    thumbnailStorageKey: string | null;
  }): Promise<string | null> {
    if (!blog.thumbnailStorageKey) return null;

    try {
      return await this.r2Service.createPresignedUrl(blog.thumbnailStorageKey);
    } catch {
      return null;
    }
  }

  /**
   * Recursively traverse TiTip JSON và replace temp URLs với storage keys
   * Temp URLs có dạng: /api/files/{fileId}/temp
   */
  private replaceTempUrlsInJson(
    doc: TiptapDoc,
    fileIdToStorageKey: Map<string, string>,
  ): TiptapDoc {
    const replaceNode = (node: TiptapNode): TiptapNode => {
      // Nếu là image node, thay src bằng storageKey
      if (node.type === 'image') {
        const attrs = node.attrs || {};
        const src = attrs.src as string | undefined;

        if (src) {
          // Parse temp URL: /api/files/{fileId}/temp
          const match = src.match(/\/files\/([^/]+)\/temp/);
          if (match) {
            const fileId = match[1];
            const storageKey = fileIdToStorageKey.get(fileId);
            if (storageKey) {
              return {
                ...node,
                attrs: {
                  ...attrs,
                  src: storageKey, // Store storageKey thay vì URL
                  'data-file-id': fileId,
                },
              };
            }
          }
        }
      }

      // Recursively process children
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
}
