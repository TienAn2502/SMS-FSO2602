import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { CookieService } from '@/common/auth/cookie.service';
import { JwtTokenService } from '@/common/auth/jwt-token.service';
import { JwtAccessStrategy } from '@/common/auth/strategies/jwt-access.strategy';
import { ImpersonationReadOnlyGuard } from '@/common/guards/impersonation-read-only.guard';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PlatformGuard } from '@/common/guards/platform.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';
import { PasswordService } from '@/common/utils/password.service';
import { PersonCodeService } from '@/common/utils/person-code.service';
import { AuthController } from '@/modules/auth/auth.controller';
import { AuthService } from '@/modules/auth/auth.service';

@Module({
  imports: [PassportModule.register({}), JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    CookieService,
    JwtTokenService,
    JwtAccessStrategy,
    PasswordService,
    PersonCodeService,
    TenantGuard,
    RolesGuard,
    PlatformGuard,
    ImpersonationReadOnlyGuard,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // * Global guard, phải có token hợp lệ
    },
    {
      provide: APP_GUARD,
      useClass: ImpersonationReadOnlyGuard,
    },
  ],
  exports: [
    AuthService,
    TenantGuard,
    RolesGuard,
    PlatformGuard,
    PasswordService,
    PersonCodeService,
    JwtTokenService,
    CookieService,
  ],
})
export class AuthModule {}
