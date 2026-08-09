import { Module } from '@nestjs/common';

import { AuthModule } from '@/modules/auth/auth.module';
import { StudentsController } from '@/modules/students/students.controller';
import { StudentsService } from '@/modules/students/students.service';

@Module({
  imports: [AuthModule],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
