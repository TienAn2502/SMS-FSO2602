import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnv } from '@/common/config/env.schema';
import { PdfModule } from '@/common/pdf/pdf.module';
import { PrismaModule } from '@/common/database/prisma.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { AcademicYearsModule } from '@/modules/academic-years/academic-years.module';
import { CourseSectionsModule } from '@/modules/course-sections/course-sections.module';
import { FilesModule } from '@/modules/files/files.module';
import { GradeLevelSubjectsModule } from '@/modules/grade-level-subjects/grade-level-subjects.module';
import { GradeLevelsModule } from '@/modules/grade-levels/grade-levels.module';
import { HealthModule } from '@/modules/health/health.module';
import { HomeroomClassesModule } from '@/modules/homeroom-classes/homeroom-classes.module';
import { SchoolsModule } from '@/modules/schools/schools.module';
import { SemestersModule } from '@/modules/semesters/semesters.module';
import { SemesterPreparationModule } from '@/modules/semester-preparation/semester-preparation.module';
import { StudentEnrollmentsModule } from '@/modules/student-enrollments/student-enrollments.module';
import { YearPreparationModule } from '@/modules/year-preparation/year-preparation.module';
import { ClassPlacementModule } from '@/modules/class-placement/class-placement.module';
import { StudentsModule } from '@/modules/students/students.module';
import { SubjectsModule } from '@/modules/subjects/subjects.module';
import { TeachersModule } from '@/modules/teachers/teachers.module';
import { TeachingAssignmentsModule } from '@/modules/teaching-assignments/teaching-assignments.module';
import { TimetableEntriesModule } from '@/modules/timetable-entries/timetable-entries.module';
import { ParentsModule } from '@/modules/parents/parents.module';
import { PortalModule } from '@/modules/portal/portal.module';
import { AttendanceSessionsModule } from '@/modules/attendance-sessions/attendance-sessions.module';
import { AssessmentsModule } from '@/modules/assessments/assessments.module';
import { ConductRecordsModule } from '@/modules/conduct-records/conduct-records.module';
import { GradeSummariesModule } from '@/modules/grade-summaries/grade-summaries.module';
import { UsersModule } from '@/modules/users/users.module';
import { ImportsModule } from '@/modules/imports/imports.module';
import { ExportsModule } from '@/modules/exports/exports.module';
import { PlatformModule } from '@/modules/platform/platform.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { BlogsModule } from './modules/blogs/blogs.module';
import { PushSubscriptionsModule } from './modules/push-subscriptions/push-subscriptions.module';
import { CommonModule } from '@/common/auth/common.module';
import { DeviceSessionModule } from './modules/device-session/device-session.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
      validate: validateEnv,
    }),
    PrismaModule,
    PdfModule,
    AuthModule,
    HealthModule,
    SchoolsModule,
    AcademicYearsModule,
    SemestersModule,
    SemesterPreparationModule,
    YearPreparationModule,
    ClassPlacementModule,
    GradeLevelsModule,
    GradeLevelSubjectsModule,
    SubjectsModule,
    HomeroomClassesModule,
    CourseSectionsModule,
    FilesModule,
    StudentsModule,
    StudentEnrollmentsModule,
    TeachersModule,
    TeachingAssignmentsModule,
    TimetableEntriesModule,
    ParentsModule,
    PortalModule,
    AttendanceSessionsModule,
    AssessmentsModule,
    GradeSummariesModule,
    ConductRecordsModule,
    UsersModule,
    ImportsModule,
    ExportsModule,
    PlatformModule,
    NotificationsModule,
    BlogsModule,
    PushSubscriptionsModule,
    CommonModule,
    DeviceSessionModule,
    ScheduleModule.forRoot(),
  ],
})
export class AppModule {}
