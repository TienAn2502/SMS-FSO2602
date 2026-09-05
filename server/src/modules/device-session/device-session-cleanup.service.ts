import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/database/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SessionCleanupCronService {
  private readonly logger = new Logger(SessionCleanupCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Chạy tự động mỗi ngày vào lúc nửa đêm (00:00:00)
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredSessionsCleanup() {
    this.logger.log(
      'Bắt đầu dọn dẹp các device session đã hết hạn trong Database...',
    );

    try {
      const result = await this.prisma.deviceSession.deleteMany({
        where: {
          expiredAt: {
            lt: new Date(), // Xóa tất cả các bản ghi có thời gian hết hạn nhỏ hơn hiện tại
          },
        },
      });

      this.logger.log(
        `Đã xóa thành công ${result.count} session hết hạn khỏi database.`,
      );
    } catch (error) {
      this.logger.error('Lỗi khi dọn dẹp session hết hạn:', error);
    }
  }
}
