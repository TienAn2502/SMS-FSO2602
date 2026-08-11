import { Module } from '@nestjs/common';

import { ClassPlacementController } from '@/modules/class-placement/class-placement.controller';
import { ClassPlacementService } from '@/modules/class-placement/class-placement.service';

@Module({
  controllers: [ClassPlacementController],
  providers: [ClassPlacementService],
  exports: [ClassPlacementService],
})
export class ClassPlacementModule {}
