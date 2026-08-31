import {
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import cookie from 'cookie';
import { JwtTokenService } from '@/common/auth/jwt-token.service';
import { RedisService } from '@/common/database/redis.service';
import { PushSubscriptionsService } from '@/modules/push-subscriptions/push-subscriptions.service';

export interface NotificationPayload {
  id: string;
  title: string;
  contentHtml: string;
  thumbnailUrl: string | null;
  createdAt: string;
}

@WebSocketGateway({
  namespace: 'notifications',
  transports: ['websocket'],
  cors: {
    credentials: true,
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  socketServer!: Server;

  constructor(
    private readonly jwtTokenService: JwtTokenService,
    private readonly redisService: RedisService,
    private readonly pushSubscriptionsService: PushSubscriptionsService,
  ) {}

  afterInit(server: Socket) {
    console.log('Notifications Gateway initialized', server);
  }

  async handleConnection(client: Socket) {
    // Join rooms
    const rooms = client.handshake.auth.rooms as string[];
    const cookieHeader = client.handshake.headers.cookie;
    if (!cookieHeader) {
      client.disconnect();
      return;
    }

    const cookies = cookie.parseCookie(cookieHeader) as Record<string, string>;
    const token = cookies['access_token'];

    if (!token) {
      client.disconnect();
      return;
    }

    const payload = this.jwtTokenService.verifyAccessToken(token);
    if (!payload || !payload.sub) {
      client.disconnect();
      return;
    }

    const userId = payload.sub;
    const activeSchoolId = payload.activeSchoolId;

    if (activeSchoolId) {
      await this.redisService.addUserSocket(activeSchoolId, userId, client.id);
      await this.redisService.addSocketUser(activeSchoolId, client.id, userId);
    }

    (client.data as { schoolId: string; userId: string }).schoolId =
      activeSchoolId || '';
    (client.data as { schoolId: string; userId: string }).userId = userId;

    if (rooms?.length) {
      for (const room of rooms) {
        await client.join(room);
      }
    }
  }

  async handleDisconnect(client: Socket) {
    // console.log('Client disconnected ' + client.id);
    const schoolId = (client.data as { schoolId: string; userId: string })
      .schoolId;
    const userId = (client.data as { schoolId: string; userId: string }).userId;
    if (schoolId && userId) {
      await this.redisService.removeUserSocket(schoolId, userId, client.id);
      await this.redisService.removeSocketUser(schoolId, client.id);
    }
  }

  async broadcastToRoom(
    schoolId: string,
    room: string,
    notification: NotificationPayload,
  ) {
    this.socketServer.to(room).emit('notification', notification);

    const usersInRoom = new Set<string>(
      await this.redisService.getUsersInRoom(room),
    );

    const onlineUsersSet = await this.redisService.getAllOnlineUsers(schoolId);

    const offlineUserInSpecificRoom: Set<string> = new Set<string>();

    for (const userId of usersInRoom) {
      if (!onlineUsersSet.has(userId)) {
        offlineUserInSpecificRoom.add(userId);
      }
    }

    const pushSubscriptions =
      await this.pushSubscriptionsService.findManyByUserId(
        offlineUserInSpecificRoom,
      );

    for (const pushSubscription of pushSubscriptions) {
      await this.pushSubscriptionsService.sendNotification(pushSubscription);
    }
  }
}
