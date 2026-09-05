import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {
    const config = this.getConfig();

    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password || undefined,
      db: config.db ?? 0,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) {
          this.logger.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      this.logger.log('Redis connected');
    });

    this.client.on('error', (err) => {
      this.isConnected = false;
      this.logger.error(`Redis error: ${err.message}`);
    });

    this.client.on('close', () => {
      this.isConnected = false;
      this.logger.warn('Redis connection closed');
    });
  }

  private getConfig(): RedisConfig {
    return {
      host: this.configService.get<string>('REDIS_HOST') || 'localhost',
      port: this.configService.get<number>('REDIS_PORT') || 6379,
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      db: this.configService.get<number>('REDIS_DB') ?? 0,
    };
  }

  async onModuleInit() {
    try {
      await this.client.connect();
    } catch (error) {
      this.logger.error(`Failed to connect to Redis: ${error}`);
    }
  }

  async onModuleDestroy() {
    await this.client.quit(); // Đóng kết nối Redis khi app shutdown
  }

  // Khi user đăng nhập vào phòng, thêm user vào danh sách user trong phòng
  async addUserToRoom(roomId: string, userId: string): Promise<void> {
    await this.client.sadd(roomId, userId);
  }

  async getUsersInRoom(roomId: string): Promise<string[]> {
    return this.client.smembers(roomId);
  }

  // ==================== CHIỀU 1: USER -> SOCKETS (1 User có nhiều Sockets/Tabs) ====================

  async addUserSocket(
    schoolId: string,
    userId: string,
    socketId: string,
  ): Promise<void> {
    await this.client.sadd(
      `school:${schoolId}:user:${userId}:sockets`,
      socketId,
    );
  }

  async removeUserSocket(
    schoolId: string,
    userId: string,
    socketId: string,
  ): Promise<void> {
    await this.client.srem(
      `school:${schoolId}:user:${userId}:sockets`,
      socketId,
    );
  }

  async getUserSockets(schoolId: string, userId: string): Promise<string[]> {
    return this.client.smembers(`school:${schoolId}:user:${userId}:sockets`);
  }

  // ==================== CHIỀU 2: SOCKET -> USER (1 Socket chỉ thuộc về 1 User) ====================

  // Dùng lệnh SET thay vì SADD vì 1 socketId chỉ map với 1 userId
  async addSocketUser(
    schoolId: string,
    socketId: string,
    userId: string,
  ): Promise<void> {
    await this.client.set(`school:${schoolId}:socket:${socketId}`, userId);
  }

  // Xóa key ánh xạ ngược khi disconnect
  async removeSocketUser(schoolId: string, socketId: string): Promise<void> {
    await this.client.del(`school:${schoolId}:socket:${socketId}`);
  }

  // Lấy ra userId dựa vào socketId
  async getUserIdBySocket(
    schoolId: string,
    socketId: string,
  ): Promise<string | null> {
    return this.client.get(`school:${schoolId}:socket:${socketId}`);
  }

  async getAllOnlineUsers(schoolId: string): Promise<Set<string>> {
    const pattern = `school:${schoolId}:socket:*`;
    const userIds: Set<string> = new Set();

    let cursor = '0';
    do {
      // Duyệt mảng keys an toàn bằng cursor
      const [nextCursor, keys] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        '100',
      );
      cursor = nextCursor;

      for (const key of keys) {
        const userId = await this.client.get(key);
        if (userId) {
          userIds.add(userId);
        }
      }
    } while (cursor !== '0');

    return userIds;
  }

  async isRefreshTokenInBlacklist(refreshToken: string): Promise<boolean> {
    const result = await this.client.get(`auth:rt:${refreshToken}`);
    return result !== null;
  }

  async filterUsersInRoom(room: string, users: string[]) {
    console.log(room);
    if (users.length === 0) return [];
    const result: string[] = [];
    for (const id of users) {
      const isHas = await this.client.sismember(room, id);
      if (isHas === 1) {
        result.push(id);
      }
    }

    return result;
  }

  async addUserToWhiteList(sessionId: string, userId: string) {
    const result = await this.client.setex(
      `session:${sessionId}`,
      7 * 24 * 60 * 60, // Số giây (7 ngày)
      userId,
    );
    return result;
  }

  async getSessionFromWhiteList(sessionId: string) {
    const result = await this.client.exists(`session:${sessionId}`);
    return result > 0;
  }

  async deleteOneSessionFromWhitelist(sessionId: string) {
    await this.client.del(`session:${sessionId}`);
  }

  async deleteManySessionFromWhitelist(sessionIdKeys: Set<string>) {
    await this.client.unlink(...sessionIdKeys);
  }
}
