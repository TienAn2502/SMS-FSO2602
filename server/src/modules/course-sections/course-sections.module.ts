import { Module } from '@nestjs/common';

import { GradeLevelsModule } from '../grade-levels/grade-levels.module';
import { HomeroomClassesModule } from '../homeroom-classes/homeroom-classes.module';
import { SubjectsModule } from '../subjects/subjects.module';
import { CourseSectionsController } from './course-sections.controller';
import { CourseSectionsService } from './course-sections.service';

@Module({
  imports: [GradeLevelsModule, HomeroomClassesModule, SubjectsModule],
  controllers: [CourseSectionsController],
  providers: [CourseSectionsService],
  exports: [CourseSectionsService],
})
export class CourseSectionsModule {}
