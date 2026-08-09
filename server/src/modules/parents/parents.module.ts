import { Module } from '@nestjs/common';

import { AuthModule } from '@/modules/auth/auth.module';
import { StudentsModule } from '@/modules/students/students.module';
import { ParentsController } from '@/modules/parents/parents.controller';
import { ParentsService } from '@/modules/parents/parents.service';

@Module({
  imports: [AuthModule, StudentsModule],
  controllers: [ParentsController],
  providers: [ParentsService],
  exports: [ParentsService],
})
export class ParentsModule {}
