import { Module } from '@nestjs/common';

import { AttendanceRecordsModule } from '../attendance-records/attendance-records.module';
import { AttendanceSessionsModule } from '../attendance-sessions/attendance-sessions.module';
import { AuthModule } from '../auth/auth.module';
import { ParentsModule } from '../parents/parents.module';
import { SemestersModule } from '../semesters/semesters.module';
import { PortalAttendanceService } from './portal-attendance.service';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';

@Module({
  imports: [
    AuthModule,
    ParentsModule,
    SemestersModule,
    AttendanceSessionsModule,
    AttendanceRecordsModule,
  ],
  controllers: [PortalController],
  providers: [PortalService, PortalAttendanceService],
})
export class PortalModule {}
