import { Module } from '@nestjs/common';

import { ConductRecordsController } from '@/modules/conduct-records/conduct-records.controller';
import { ConductRecordsService } from '@/modules/conduct-records/conduct-records.service';

@Module({
  controllers: [ConductRecordsController],
  providers: [ConductRecordsService],
  exports: [ConductRecordsService],
})
export class ConductRecordsModule {}
