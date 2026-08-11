import { Module } from '@nestjs/common';

import { AuthModule } from '@/modules/auth/auth.module';
import { PlatformImpersonationController } from '@/modules/platform/platform-impersonation.controller';
import { PlatformImpersonationService } from '@/modules/platform/platform-impersonation.service';
import { PlatformSchoolsController } from '@/modules/platform/platform-schools.controller';
import { PlatformSchoolsService } from '@/modules/platform/platform-schools.service';

@Module({
  imports: [AuthModule],
  controllers: [PlatformSchoolsController, PlatformImpersonationController],
  providers: [PlatformSchoolsService, PlatformImpersonationService],
})
export class PlatformModule {}
