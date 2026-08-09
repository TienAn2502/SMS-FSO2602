import { Module } from '@nestjs/common';

import { SubjectsController } from '@/modules/subjects/subjects.controller';
import { SubjectsService } from '@/modules/subjects/subjects.service';

@Module({
  controllers: [SubjectsController],
  providers: [SubjectsService],
  exports: [SubjectsService],
})
export class SubjectsModule {}
