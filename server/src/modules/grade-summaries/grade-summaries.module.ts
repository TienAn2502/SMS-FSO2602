import { Module } from '@nestjs/common';

import { GradeSummariesController } from '@/modules/grade-summaries/grade-summaries.controller';
import { GradeSummariesService } from '@/modules/grade-summaries/grade-summaries.service';

@Module({
  controllers: [GradeSummariesController],
  providers: [GradeSummariesService],
  exports: [GradeSummariesService],
})
export class GradeSummariesModule {}
