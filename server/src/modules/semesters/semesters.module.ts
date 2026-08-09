import { Module } from '@nestjs/common';

import { AcademicYearsModule } from '@/modules/academic-years/academic-years.module';
import {
  SemestersController,
  SemestersSchoolController,
} from '@/modules/semesters/semesters.controller';
import { SemestersService } from '@/modules/semesters/semesters.service';

@Module({
  imports: [AcademicYearsModule],
  controllers: [SemestersController, SemestersSchoolController],
  providers: [SemestersService],
  exports: [SemestersService],
})
export class SemestersModule {}
