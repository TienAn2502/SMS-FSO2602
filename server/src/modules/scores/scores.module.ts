import { Module } from '@nestjs/common';

import { AssessmentsModule } from '@/modules/assessments/assessments.module';
import { ScoresService } from '@/modules/scores/scores.service';

@Module({
  imports: [AssessmentsModule],
  providers: [ScoresService],
  exports: [ScoresService],
})
export class ScoresModule {}
