import { Module } from '@nestjs/common';

import { AuthModule } from '@/modules/auth/auth.module';
import { TeachersController } from '@/modules/teachers/teachers.controller';
import { TeachersService } from '@/modules/teachers/teachers.service';

@Module({
  imports: [AuthModule],
  controllers: [TeachersController],
  providers: [TeachersService],
  exports: [TeachersService],
})
export class TeachersModule {}
