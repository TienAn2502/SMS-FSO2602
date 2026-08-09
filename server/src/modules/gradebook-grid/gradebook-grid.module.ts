import { Module } from '@nestjs/common';

import { GradebookGridService } from '@/modules/gradebook-grid/gradebook-grid.service';

@Module({
  providers: [GradebookGridService],
  exports: [GradebookGridService],
})
export class GradebookGridModule {}
