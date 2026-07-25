import { Module } from '@nestjs/common';

import { AcademicYearsModule } from '../academic-years/academic-years.module';
import { GradeLevelsModule } from '../grade-levels/grade-levels.module';
import { HomeroomClassesController } from './homeroom-classes.controller';
import { HomeroomClassesService } from './homeroom-classes.service';

@Module({
  imports: [AcademicYearsModule, GradeLevelsModule],
  controllers: [HomeroomClassesController],
  providers: [HomeroomClassesService],
  exports: [HomeroomClassesService],
})
export class HomeroomClassesModule {}
