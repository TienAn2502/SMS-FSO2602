import { forwardRef, Module } from '@nestjs/common';

import { CourseSectionsModule } from '@/modules/course-sections/course-sections.module';
import { SemestersModule } from '@/modules/semesters/semesters.module';
import { TeachersModule } from '@/modules/teachers/teachers.module';
import { TimetableEntriesByCourseSectionController } from '@/modules/timetable-entries/timetable-entries-by-course-section.controller';
import { TimetableEntriesController } from '@/modules/timetable-entries/timetable-entries.controller';
import { TimetableEntriesService } from '@/modules/timetable-entries/timetable-entries.service';

@Module({
  imports: [
    TeachersModule,
    forwardRef(() => CourseSectionsModule), // 2 module cần lẫn nhau nên phải dùng forwardRef
    SemestersModule,
  ],
  controllers: [
    TimetableEntriesController,
    TimetableEntriesByCourseSectionController,
  ],
  providers: [TimetableEntriesService],
  exports: [TimetableEntriesService],
})
export class TimetableEntriesModule {}
