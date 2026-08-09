import { Module } from '@nestjs/common';

import { AcademicYearsModule } from '@/modules/academic-years/academic-years.module';
import { GradeLevelsModule } from '@/modules/grade-levels/grade-levels.module';
import { HomeroomClassesController } from '@/modules/homeroom-classes/homeroom-classes.controller';
import { HomeroomClassesService } from '@/modules/homeroom-classes/homeroom-classes.service';

@Module({
  imports: [AcademicYearsModule, GradeLevelsModule],
  controllers: [HomeroomClassesController],
  providers: [HomeroomClassesService],
  exports: [HomeroomClassesService],
})
export class HomeroomClassesModule {}
