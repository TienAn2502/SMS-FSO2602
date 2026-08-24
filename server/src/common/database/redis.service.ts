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
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  isReady(): boolean {
    return this.isConnected;
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  // String operations
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<'OK' | null> {
    if (ttlSeconds) {
      return this.client.set(key, value, 'EX', ttlSeconds);
    }
    return this.client.set(key, value);
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const json = JSON.stringify(value);
    await this.set(key, json, ttlSeconds);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  // TTL operations
  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  // Hash operations
  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    return this.client.hset(key, field, value);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    return this.client.hdel(key, ...fields);
  }

  async hmset(key: string, data: Record<string, string>): Promise<'OK'> {
    return this.client.hmset(key, data);
  }

  async hincrby(
    key: string,
    field: string,
    increment: number,
  ): Promise<number> {
    return this.client.hincrby(key, field, increment);
  }

  // List operations
  async lpush(key: string, ...values: string[]): Promise<number> {
    return this.client.lpush(key, ...values);
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    return this.client.rpush(key, ...values);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(key, start, stop);
  }

  async lpop(key: string): Promise<string | null> {
    return this.client.lpop(key);
  }

  async rpop(key: string): Promise<string | null> {
    return this.client.rpop(key);
  }

  // Set operations
  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async sismember(key: string, member: string): Promise<number> {
    return this.client.sismember(key, member);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return this.client.srem(key, ...members);
  }

  // Sorted Set operations
  async zadd(key: string, score: number, member: string): Promise<number> {
    return this.client.zadd(key, score, member);
  }

  async zrange(key: string, start: number, stop: string): Promise<string[]> {
    return this.client.zrange(key, start, stop);
  }

  async zrangebyscore(
    key: string,
    min: number | string,
    max: number | string,
  ): Promise<string[]> {
    return this.client.zrangebyscore(key, min, max);
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    return this.client.zrem(key, ...members);
  }

  // Pub/Sub
  async publish(channel: string, message: string): Promise<number> {
    return this.client.publish(channel, message);
  }

  // Key pattern operations
  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  async scan(pattern: string, count = 100): Promise<string[]> {
    const results: string[] = [];
    let cursor = '0';

    do {
      const [newCursor, keys] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        count,
      );
      cursor = newCursor;
      results.push(...keys);
    } while (cursor !== '0');

    return results;
  }

  async delByPattern(pattern: string): Promise<number> {
    const keys = await this.keys(pattern);
    if (keys.length === 0) return 0;
    return this.client.del(...keys);
  }

  // Khi user đăng nhập vào phòng, thêm user vào danh sách user trong phòng
  async addUserToRoom(roomId: string, userId: string): Promise<void> {
    await this.client.sadd(roomId, userId);
  }

  async getUsersInRoom(schoolId: string, roomId: string): Promise<string[]> {
    // return this.client.smembers(`school:${schoolId}:room:${roomId}`);
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
    console.log(await this.getAllOnlineUsers(schoolId));
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
        console.log('key', key);
        const userId = await this.client.get(key);
        // console.log('userId', userId);
        if (userId) {
          userIds.add(userId);
        }
      }
    } while (cursor !== '0');

    return userIds;
  }
}
