import { Module } from '@nestjs/common';

import { CourseSectionsModule } from '@/modules/course-sections/course-sections.module';
import { SemesterPreparationController } from '@/modules/semester-preparation/semester-preparation.controller';
import { SemesterPreparationService } from '@/modules/semester-preparation/semester-preparation.service';
import { SemestersModule } from '@/modules/semesters/semesters.module';
import { StudentEnrollmentsModule } from '@/modules/student-enrollments/student-enrollments.module';
import { TeachingAssignmentsModule } from '@/modules/teaching-assignments/teaching-assignments.module';

@Module({
  imports: [
    SemestersModule,
    StudentEnrollmentsModule,
    CourseSectionsModule,
    TeachingAssignmentsModule,
  ],
  controllers: [SemesterPreparationController],
  providers: [SemesterPreparationService],
})
export class SemesterPreparationModule {}
