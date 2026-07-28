import { Module } from '@nestjs/common';

import { CourseSectionsModule } from '../course-sections/course-sections.module';
import { SemestersModule } from '../semesters/semesters.module';
import { TeachersModule } from '../teachers/teachers.module';
import { AttendanceSessionsController } from './attendance-sessions.controller';
import { AttendanceSessionsService } from './attendance-sessions.service';

@Module({
  imports: [TeachersModule, CourseSectionsModule, SemestersModule],
  controllers: [AttendanceSessionsController],
  providers: [AttendanceSessionsService],
  exports: [AttendanceSessionsService],
})
export class AttendanceSessionsModule {}
