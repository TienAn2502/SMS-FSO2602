import { Module } from '@nestjs/common';

import { AuthModule } from '@/modules/auth/auth.module';
import { FilesController } from '@/modules/files/files.controller';
import { FilesService } from '@/modules/files/files.service';
import { R2Service } from '@/modules/files/r2.service';

@Module({
  imports: [AuthModule],
  controllers: [FilesController],
  providers: [FilesService, R2Service],
  exports: [FilesService, R2Service],
})
export class FilesModule {}
