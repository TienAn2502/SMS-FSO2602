import { Module } from '@nestjs/common';

import { GradeLevelsModule } from '@/modules/grade-levels/grade-levels.module';
import { HomeroomClassesModule } from '@/modules/homeroom-classes/homeroom-classes.module';
import { SubjectsModule } from '@/modules/subjects/subjects.module';
import { CourseSectionsController } from '@/modules/course-sections/course-sections.controller';
import { CourseSectionsService } from '@/modules/course-sections/course-sections.service';
import { SemestersModule } from '@/modules/semesters/semesters.module';

@Module({
  imports: [
    GradeLevelsModule,
    HomeroomClassesModule,
    SubjectsModule,
    SemestersModule,
  ],
  controllers: [CourseSectionsController],
  providers: [CourseSectionsService],
  exports: [CourseSectionsService],
})
export class CourseSectionsModule {}
