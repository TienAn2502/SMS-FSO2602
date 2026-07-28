import { Module } from '@nestjs/common';

import { CourseSectionsModule } from '../course-sections/course-sections.module';
import { SemestersModule } from '../semesters/semesters.module';
import { TeachersModule } from '../teachers/teachers.module';
import { TeachingAssignmentsByTeacherController } from './teaching-assignments-by-teacher.controller';
import { TeachingAssignmentsController } from './teaching-assignments.controller';
import { TeachingAssignmentsService } from './teaching-assignments.service';

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
