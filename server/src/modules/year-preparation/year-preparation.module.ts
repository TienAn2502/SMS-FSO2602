import { Module } from '@nestjs/common';

import { StudentEnrollmentsModule } from '@/modules/student-enrollments/student-enrollments.module';
import { YearPreparationController } from '@/modules/year-preparation/year-preparation.controller';
import { YearPreparationService } from '@/modules/year-preparation/year-preparation.service';

@Module({
  imports: [StudentEnrollmentsModule],
  controllers: [YearPreparationController],
  providers: [YearPreparationService],
})
export class YearPreparationModule {}
