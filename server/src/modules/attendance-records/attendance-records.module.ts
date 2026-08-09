import { Module } from '@nestjs/common';

import { AttendanceRecordsService } from '@/modules/attendance-records/attendance-records.service';

@Module({
  controllers: [],
  providers: [AttendanceRecordsService],
  exports: [AttendanceRecordsService],
})
export class AttendanceRecordsModule {}
