import { Module } from '@nestjs/common';

import { AuthModule } from '@/modules/auth/auth.module';
import { FilesModule } from '@/modules/files/files.module';
import { SchoolsController } from '@/modules/schools/schools.controller';
import { SchoolsService } from '@/modules/schools/schools.service';

// Module dành cho BGH nhà trường
@Module({
  imports: [AuthModule, FilesModule],
  controllers: [SchoolsController],
  providers: [SchoolsService],
})
export class SchoolsModule {}
