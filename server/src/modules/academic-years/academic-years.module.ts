import { Module } from '@nestjs/common';

import { AcademicYearsController } from '@/modules/academic-years/academic-years.controller';
import { AcademicYearsService } from '@/modules/academic-years/academic-years.service';

@Module({
  controllers: [AcademicYearsController],
  providers: [AcademicYearsService],
  exports: [AcademicYearsService],
})
export class AcademicYearsModule {}
