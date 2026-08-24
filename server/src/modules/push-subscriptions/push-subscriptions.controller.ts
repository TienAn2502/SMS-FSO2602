import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
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
import { uuidParamSchema } from '@/common/schemas/shared.schema';
import { PushSubscriptionsService } from '@/modules/push-subscriptions/push-subscriptions.service';
import {
  createPushSubscriptionSchema,
  listPushSubscriptionsQuerySchema,
  type CreatePushSubscriptionInput,
  type ListPushSubscriptionsQuery,
} from '@/modules/push-subscriptions/schemas/push-subscription.schema';

@ApiTags('Push Subscriptions')
@ApiCookieAuth('access_token')
@Controller('push-subscriptions')
@UseGuards(TenantGuard, RolesGuard)
@Roles(
  UserRole.SCHOOL_ADMIN,
  UserRole.TEACHER,
  UserRole.STUDENT,
  UserRole.PARENT,
)
export class PushSubscriptionsController {
  constructor(
    private readonly pushSubscriptionsService: PushSubscriptionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách đăng ký push notification' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listPushSubscriptionsQuerySchema))
    query: ListPushSubscriptionsQuery,
  ) {
    const result = await this.pushSubscriptionsService.list(user.id, query);

    return {
      success: true,
      data: result.items,
      meta: result.meta,
      message: null,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết đăng ký push notification' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    const subscriptions = await this.pushSubscriptionsService.findByUserId(
      user.id,
    );
    const subscription = subscriptions.find((sub) => sub.id === id);

    if (!subscription) {
      return {
        success: false,
        data: null,
        message: 'Không tìm thấy đăng ký push notification',
      };
    }

    return {
      success: true,
      data: subscription,
      message: null,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Đăng ký push notification' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createPushSubscriptionSchema))
    body: CreatePushSubscriptionInput,
  ) {
    const data = await this.pushSubscriptionsService.create(user.id, body);

    return {
      success: true,
      data,
      message: 'Đăng ký push notification thành công',
    };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa tất cả đăng ký push notification' })
  async deleteAll(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.pushSubscriptionsService.deleteAll(user.id);

    return {
      success: true,
      data: { deletedCount: count },
      message: `Đã xóa ${count} đăng ký push notification`,
    };
  }

  @Delete('endpoint')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa đăng ký push notification theo endpoint' })
  async deleteByEndpoint(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { endpoint: string },
  ) {
    await this.pushSubscriptionsService.deleteByEndpoint(
      user.id,
      body.endpoint,
    );

    return {
      success: true,
      data: null,
      message: 'Xóa đăng ký push notification thành công',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa đăng ký push notification' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    await this.pushSubscriptionsService.delete(user.id, id);

    return {
      success: true,
      data: null,
      message: 'Xóa đăng ký push notification thành công',
    };
  }
}
