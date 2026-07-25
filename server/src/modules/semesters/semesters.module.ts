import { Module } from '@nestjs/common';

import { AcademicYearsModule } from '../academic-years/academic-years.module';
import {
  SemestersController,
  SemestersSchoolController,
} from './semesters.controller';
import { SemestersService } from './semesters.service';

@Module({
  imports: [AcademicYearsModule],
  controllers: [SemestersController, SemestersSchoolController],
  providers: [SemestersService],
  exports: [SemestersService],
})
export class SemestersModule {}
