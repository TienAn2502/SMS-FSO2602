import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { CookieService } from '../../common/auth/cookie.service';
import { JwtTokenService } from '../../common/auth/jwt-token.service';
import { JwtAccessStrategy } from '../../common/auth/strategies/jwt-access.strategy';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { PasswordService } from '../../common/utils/password.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [PassportModule.register({}), JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    CookieService,
    JwtTokenService,
    JwtAccessStrategy,
    PasswordService,
    TenantGuard,
    RolesGuard,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // * Global guard, phải có token hợp lệ
    },
  ],
  exports: [AuthService, TenantGuard, RolesGuard, PasswordService],
})
export class AuthModule {}
