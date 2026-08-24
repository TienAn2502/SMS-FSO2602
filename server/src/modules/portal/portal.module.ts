import { Module } from '@nestjs/common';

import { AttendanceRecordsModule } from '@/modules/attendance-records/attendance-records.module';
import { AttendanceSessionsModule } from '@/modules/attendance-sessions/attendance-sessions.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { CourseSectionsModule } from '@/modules/course-sections/course-sections.module';
import { ConductRecordsModule } from '@/modules/conduct-records/conduct-records.module';
import { ExportsModule } from '@/modules/exports/exports.module';
import { GradeSummariesModule } from '@/modules/grade-summaries/grade-summaries.module';
import { GradebookGridModule } from '@/modules/gradebook-grid/gradebook-grid.module';
import { ParentsModule } from '@/modules/parents/parents.module';
import { SemestersModule } from '@/modules/semesters/semesters.module';
import { ScoresModule } from '@/modules/scores/scores.module';
import { PortalAttendanceService } from '@/modules/portal/portal-attendance.service';
import { PortalGradebookProvisionService } from '@/modules/portal/portal-gradebook-provision.service';
import { PortalGradebookService } from '@/modules/portal/portal-gradebook.service';
import { PortalController } from '@/modules/portal/portal.controller';
import { PortalSummariesService } from '@/modules/portal/portal-summaries.service';
import { PortalService } from '@/modules/portal/portal.service';
import { NotificationsModule } from '@/modules/notifications/notifications.module';

@Module({
  imports: [
    AuthModule,
    ParentsModule,
    SemestersModule,
    CourseSectionsModule,
    AttendanceSessionsModule,
    AttendanceRecordsModule,
    ScoresModule,
    GradeSummariesModule,
    ConductRecordsModule,
    GradebookGridModule,
    ExportsModule,
    NotificationsModule,
  ],
  controllers: [PortalController],
  providers: [
    PortalService,
    PortalAttendanceService,
    PortalGradebookService,
    PortalGradebookProvisionService,
    PortalSummariesService,
  ],
})
export class PortalModule {}
