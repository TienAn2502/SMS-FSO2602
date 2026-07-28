import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnv } from './common/config/env.schema';
import { PrismaModule } from './common/database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AcademicYearsModule } from './modules/academic-years/academic-years.module';
import { CourseSectionsModule } from './modules/course-sections/course-sections.module';
import { FilesModule } from './modules/files/files.module';
import { GradeLevelsModule } from './modules/grade-levels/grade-levels.module';
import { HealthModule } from './modules/health/health.module';
import { HomeroomClassesModule } from './modules/homeroom-classes/homeroom-classes.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { SemestersModule } from './modules/semesters/semesters.module';
import { StudentEnrollmentsModule } from './modules/student-enrollments/student-enrollments.module';
import { StudentsModule } from './modules/students/students.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { TeachingAssignmentsModule } from './modules/teaching-assignments/teaching-assignments.module';
import { TimetableEntriesModule } from './modules/timetable-entries/timetable-entries.module';
import { ParentsModule } from './modules/parents/parents.module';
import { PortalModule } from './modules/portal/portal.module';
import { AttendanceSessionsModule } from './modules/attendance-sessions/attendance-sessions.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    SchoolsModule,
    AcademicYearsModule,
    SemestersModule,
    GradeLevelsModule,
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
    UsersModule,
  ],
})
export class AppModule {}
