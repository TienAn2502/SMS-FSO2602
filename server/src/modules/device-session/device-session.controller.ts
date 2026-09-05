import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { DeviceSessionService } from './device-session.service';
import { TenantGuard } from '@/common/guards/tenant.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { type AuthenticatedUser } from '@/common/auth/auth.types';
import { type DeleteManyDevicesInput } from '@/modules/device-session/schema';

@Controller('device-session')
@UseGuards(TenantGuard, RolesGuard)
@Roles(
  UserRole.SCHOOL_ADMIN,
  UserRole.TEACHER,
  UserRole.STUDENT,
  UserRole.PARENT,
)
export class DeviceSessionController {
  constructor(private readonly deviceSessionService: DeviceSessionService) {}

  @Delete('all')
  async deleteMany(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: DeleteManyDevicesInput,
  ) {
    await this.deviceSessionService.deleteManyDeviceSessions(
      user.id,
      user.sessionId,
      body.sessionIdKeys,
    );
    return {
      success: true,
      message: 'Xóa thành công',
    };
  }

  @Delete(':sessionId')
  async deleteOne(@Param('sessionId') sessionId: string) {
    await this.deviceSessionService.deleteOneDeviceSession(sessionId);

    return {
      success: true,
      message: 'Xóa thành công',
    };
  }

  @Get(':userId')
  async list(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    console.log(user.sessionId);
    const result = await this.deviceSessionService.listDeviceSessions(
      userId,
      user.sessionId,
    );

    return {
      success: true,
      message: 'Danh sách phiên',
      data: result,
    };
  }
}
