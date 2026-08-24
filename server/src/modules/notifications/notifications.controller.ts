import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '@/common/auth/auth.types';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { R2Service } from '@/modules/files/r2.service';
import {
  createNotificationSchema,
  listNotificationsQuerySchema,
  updateNotificationSchema,
  type CreateNotificationInput,
  type ListNotificationsQuery,
  type UpdateNotificationInput,
} from '@/modules/notifications/schemas/notification.schema';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import z from 'zod';

@ApiTags('Notifications')
@ApiCookieAuth('access_token')
@Controller('notifications')
@UseGuards(TenantGuard, RolesGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly r2Service: R2Service,
  ) {}

  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @Get()
  @ApiOperation({ summary: 'Danh sách thông báo' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listNotificationsQuerySchema))
    query: ListNotificationsQuery,
  ) {
    const result = await this.notificationsService.list(
      user.activeSchoolId,
      query,
    );

    return {
      success: true,
      data: result.items,
      meta: result.meta,
      message: null,
    };
  }

  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @Post('rooms')
  @ApiOperation({ summary: 'Danh sách thông báo theo phòng' })
  async listByRoom(
    @Body() body: { roomType: string; targetId: string }[],
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.notificationsService.listByRoom(
      user.activeSchoolId,
      body,
    );

    return {
      success: true,
      data: result,
      message: null,
    };
  }
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Chi tiết thông báo theo slug' })
  async findBySlug(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug', new ZodValidationPipe(z.string())) slug: string,
  ) {
    const data = await this.notificationsService.findBySlug(
      user.activeSchoolId,
      slug,
    );

    return {
      success: true,
      data,
      message: null,
    };
  }

  @Get('refresh-urls')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Refresh signed URLs for notifications' })
  async refreshUrls(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { storageKeys: string[] },
  ) {
    const urls: Record<string, string> = {};

    for (const key of body.storageKeys) {
      try {
        urls[key] = await this.r2Service.createPresignedUrl(key);
      } catch {
        // Skip failed URLs
      }
    }

    return {
      success: true,
      data: urls,
      message: null,
    };
  }

  @Get('rooms/available')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Danh sách phòng thông báo khả dụng' })
  async getAvailableRooms(@CurrentUser() user: AuthenticatedUser) {
    const rooms = await this.notificationsService.getAvailableRooms(
      user.activeSchoolId,
    );

    return {
      success: true,
      data: rooms,
      message: null,
    };
  }

  @Roles(UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Gửi thông báo' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createNotificationSchema))
    body: CreateNotificationInput,
  ) {
    const data = await this.notificationsService.create(
      user.activeSchoolId,
      user.id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Gửi thông báo thành công',
    };
  }

  @Roles(UserRole.SCHOOL_ADMIN)
  @Patch(':slug')
  @ApiOperation({ summary: 'Cập nhật thông báo' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug', new ZodValidationPipe(z.string())) slug: string,
    @Body(new ZodValidationPipe(updateNotificationSchema))
    body: UpdateNotificationInput,
  ) {
    const data = await this.notificationsService.update(
      user.activeSchoolId,
      slug,
      user.id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Cập nhật thông báo thành công',
    };
  }

  @Roles(UserRole.SCHOOL_ADMIN)
  @Delete(':slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa thông báo' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug', new ZodValidationPipe(z.string())) slug: string,
  ) {
    await this.notificationsService.delete(user.activeSchoolId, slug);

    return {
      success: true,
      data: null,
      message: 'Xóa thông báo thành công',
    };
  }
}
