import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { FilesModule } from '../files/files.module';
import { SchoolsController } from './schools.controller';
import { SchoolsService } from './schools.service';

// Module dành cho BGH nhà trường
@Module({
  imports: [AuthModule, FilesModule],
  controllers: [SchoolsController],
  providers: [SchoolsService],
})
export class SchoolsModule {}
