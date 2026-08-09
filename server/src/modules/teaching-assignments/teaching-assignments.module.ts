import { Module } from '@nestjs/common';

import { CourseSectionsModule } from '@/modules/course-sections/course-sections.module';
import { SemestersModule } from '@/modules/semesters/semesters.module';
import { TeachersModule } from '@/modules/teachers/teachers.module';
import { TeachingAssignmentsByTeacherController } from '@/modules/teaching-assignments/teaching-assignments-by-teacher.controller';
import { TeachingAssignmentsController } from '@/modules/teaching-assignments/teaching-assignments.controller';
import { TeachingAssignmentsService } from '@/modules/teaching-assignments/teaching-assignments.service';

@Module({
  imports: [TeachersModule, CourseSectionsModule, SemestersModule],
  controllers: [
    TeachingAssignmentsController,
    TeachingAssignmentsByTeacherController,
  ],
  providers: [TeachingAssignmentsService],
  exports: [TeachingAssignmentsService],
})
export class TeachingAssignmentsModule {}
