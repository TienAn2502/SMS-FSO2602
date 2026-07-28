import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { R2Service } from './r2.service';

@Module({
  imports: [AuthModule],
  controllers: [FilesController],
  providers: [FilesService, R2Service],
  exports: [FilesService],
})
export class FilesModule {}
