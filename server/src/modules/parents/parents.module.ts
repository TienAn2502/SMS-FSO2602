import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { StudentsModule } from '../students/students.module';
import { ParentsController } from './parents.controller';
import { ParentsService } from './parents.service';

@Module({
  imports: [AuthModule, StudentsModule],
  controllers: [ParentsController],
  providers: [ParentsService],
  exports: [ParentsService],
})
export class ParentsModule {}
