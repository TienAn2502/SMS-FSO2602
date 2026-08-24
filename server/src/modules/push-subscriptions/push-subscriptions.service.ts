import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@/common/database/prisma.service';
import { buildPaginationMeta, getSkip } from '@/common/utils/pagination.util';
import type {
  CreatePushSubscriptionInput,
  ListPushSubscriptionsQuery,
} from '@/modules/push-subscriptions/schemas/push-subscription.schema';
import type {
  PushSubscriptionResponse,
  PushSubscriptionListResponse,
} from '@/modules/push-subscriptions/dto/push-subscription-response.dto';
import * as webpush from 'web-push';
import { ConfigService } from '@nestjs/config';

type PushSubscriptionPrisma = Prisma.PushSubscriptionGetPayload<
  Record<string, never>
>;

@Injectable()
export class PushSubscriptionsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    webpush.setVapidDetails(
      'mailto:admin@school.edu.vn',
      this.configService.getOrThrow<string>('VAPID_PUBLIC_KEY'),
      this.configService.getOrThrow<string>('VAPID_PRIVATE_KEY'),
    );
  }

  async create(
    userId: string,
    input: CreatePushSubscriptionInput,
  ): Promise<PushSubscriptionResponse> {
    const subscription = await this.prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: {
        userId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
      },
      update: {
        userId,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
      },
    });

    return this.toResponse(subscription);
  }

  async list(
    userId: string,
    query: ListPushSubscriptionsQuery,
  ): Promise<PushSubscriptionListResponse> {
    const where: Prisma.PushSubscriptionWhereInput = { userId };

    const [total, subscriptions] = await this.prisma.$transaction([
      this.prisma.pushSubscription.count({ where }),
      this.prisma.pushSubscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: getSkip(query.page, query.limit),
        take: query.limit,
      }),
    ]);

    return {
      items: subscriptions.map((sub) => this.toResponse(sub)),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async findByUserId(userId: string): Promise<PushSubscriptionResponse[]> {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions.map((sub) => this.toResponse(sub));
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({
      where: { id, userId },
    });
  }

  async deleteByEndpoint(userId: string, endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({
      where: { endpoint, userId },
    });
  }

  async deleteAll(userId: string): Promise<number> {
    const result = await this.prisma.pushSubscription.deleteMany({
      where: { userId },
    });

    return result.count;
  }

  private toResponse(
    subscription: PushSubscriptionPrisma,
  ): PushSubscriptionResponse {
    return {
      id: subscription.id,
      userId: subscription.userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
      createdAt: subscription.createdAt.toISOString(),
      updatedAt: subscription.updatedAt.toISOString(),
    };
  }

  async findManyByUserId(
    userIds: Set<string>,
  ): Promise<PushSubscriptionResponse[]> {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: {
        userId: {
          in: Array.from(userIds),
        },
      },
    });

    return subscriptions.map((sub) => this.toResponse(sub));
  }

  async sendNotification(pushSubscription: PushSubscriptionResponse) {
    console.log('pushSubscription', pushSubscription);
    if (!pushSubscription) {
      return;
    }
    const subscription: webpush.PushSubscription = {
      endpoint: pushSubscription.endpoint,
      keys: {
        p256dh: pushSubscription.p256dh,
        auth: pushSubscription.auth,
      },
    };
    const res = await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: 'Thông báo mới',
        body: 'Bạn có một thông báo mới.',
        // icon: '/icon.png',
      }),
    );
    console.log('res', res);
  }
}
