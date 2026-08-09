import { Module } from '@nestjs/common';

import { CourseSectionsModule } from '@/modules/course-sections/course-sections.module';
import { SemestersModule } from '@/modules/semesters/semesters.module';
import { TeachersModule } from '@/modules/teachers/teachers.module';
import { AttendanceSessionsController } from '@/modules/attendance-sessions/attendance-sessions.controller';
import { AttendanceSessionsService } from '@/modules/attendance-sessions/attendance-sessions.service';

@Module({
  imports: [TeachersModule, CourseSectionsModule, SemestersModule],
  controllers: [AttendanceSessionsController],
  providers: [AttendanceSessionsService],
  exports: [AttendanceSessionsService],
})
export class AttendanceSessionsModule {}
