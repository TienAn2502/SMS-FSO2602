import { Module } from '@nestjs/common';

import { CourseSectionsModule } from '@/modules/course-sections/course-sections.module';
import { GradebookGridModule } from '@/modules/gradebook-grid/gradebook-grid.module';
import { SemestersModule } from '@/modules/semesters/semesters.module';
import { TeachersModule } from '@/modules/teachers/teachers.module';
import { AssessmentQuotaService } from '@/modules/assessments/assessment-quota.service';
import { AssessmentsController } from '@/modules/assessments/assessments.controller';
import { AssessmentsService } from '@/modules/assessments/assessments.service';

@Module({
  imports: [TeachersModule, CourseSectionsModule, SemestersModule, GradebookGridModule],
  controllers: [AssessmentsController],
  providers: [AssessmentsService, AssessmentQuotaService],
  exports: [AssessmentsService, AssessmentQuotaService],
})
export class AssessmentsModule {}
