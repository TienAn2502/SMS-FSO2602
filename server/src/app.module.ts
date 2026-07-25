import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnv } from './common/config/env.schema';
import { PrismaModule } from './common/database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AcademicYearsModule } from './modules/academic-years/academic-years.module';
import { CourseSectionsModule } from './modules/course-sections/course-sections.module';
import { GradeLevelsModule } from './modules/grade-levels/grade-levels.module';
import { HealthModule } from './modules/health/health.module';
import { HomeroomClassesModule } from './modules/homeroom-classes/homeroom-classes.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { SemestersModule } from './modules/semesters/semesters.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
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
    UsersModule,
  ],
})
export class AppModule {}
