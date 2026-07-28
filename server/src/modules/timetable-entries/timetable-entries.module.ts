import { Module } from '@nestjs/common';

import { CourseSectionsModule } from '../course-sections/course-sections.module';
import { SemestersModule } from '../semesters/semesters.module';
import { TeachersModule } from '../teachers/teachers.module';
import { TimetableEntriesByCourseSectionController } from './timetable-entries-by-course-section.controller';
import { TimetableEntriesController } from './timetable-entries.controller';
import { TimetableEntriesService } from './timetable-entries.service';

@Module({
  imports: [TeachersModule, CourseSectionsModule, SemestersModule],
  controllers: [
    TimetableEntriesController,
    TimetableEntriesByCourseSectionController,
  ],
  providers: [TimetableEntriesService],
  exports: [TimetableEntriesService],
})
export class TimetableEntriesModule {}
