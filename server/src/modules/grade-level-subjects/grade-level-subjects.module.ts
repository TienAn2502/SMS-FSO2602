import { Module } from '@nestjs/common';

import { GradeLevelSubjectsController } from '@/modules/grade-level-subjects/grade-level-subjects.controller';
import { GradeLevelSubjectsService } from '@/modules/grade-level-subjects/grade-level-subjects.service';

@Module({
  controllers: [GradeLevelSubjectsController],
  providers: [GradeLevelSubjectsService],
  exports: [GradeLevelSubjectsService],
})
export class GradeLevelSubjectsModule {}
