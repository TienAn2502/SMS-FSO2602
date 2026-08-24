import { JwtTokenService } from '@/common/auth/jwt-token.service';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

@Module({
  providers: [JwtTokenService],
  exports: [JwtTokenService],
  imports: [JwtModule],
})
export class CommonModule {}
