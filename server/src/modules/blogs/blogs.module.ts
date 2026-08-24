import { Module } from '@nestjs/common';

import { BlogsController } from './blogs.controller';
import { BlogsService } from './blogs.service';
import { FilesModule } from '@/modules/files/files.module';

@Module({
  imports: [FilesModule],
  controllers: [BlogsController],
  providers: [BlogsService],
  exports: [BlogsService],
})
export class BlogsModule {}
