import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { uuidParamSchema } from '../../common/schemas/shared.schema';
import {
  portalTimetableQuerySchema,
  type PortalTimetableQuery,
} from './schemas/portal.schema';
import {
  portalBulkUpsertAttendanceRecordsSchema,
  portalCloseAttendanceSessionSchema,
  portalCreateAttendanceSessionSchema,
  portalMyAttendanceQuerySchema,
  type PortalBulkUpsertAttendanceRecordsInput,
  type PortalCloseAttendanceSessionInput,
  type PortalCreateAttendanceSessionInput,
  type PortalMyAttendanceQuery,
} from './schemas/portal-attendance.schema';
import { PortalAttendanceService } from './portal-attendance.service';
import { PortalService } from './portal.service';

@ApiTags('Portal')
@ApiCookieAuth('access_token')
@Controller('portal')
@UseGuards(TenantGuard, RolesGuard)
export class PortalController {
  constructor(
    private readonly portalService: PortalService,
    private readonly portalAttendanceService: PortalAttendanceService,
  ) {}

  @Get('me')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Thông tin portal theo role' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.portalService.getMe(user);

    return {
      success: true,
      data,
      message: null,
    };
  }

  @Get('my-homeroom-classes')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Lớp chủ nhiệm của giáo viên' })
  async getMyHomeroomClasses(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.portalService.getMyHomeroomClasses(user);

    return {
      success: true,
      data,
      message: null,
    };
  }

  @Get('my-homeroom-classes/:id/students')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Học sinh lớp chủ nhiệm' })
  async getMyHomeroomClassStudents(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    const data = await this.portalService.getMyHomeroomClassStudents(user, id);

    return {
      success: true,
      data,
      message: null,
    };
  }

  @Get('my-teaching-assignments')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Phân công giảng dạy của giáo viên' })
  async getMyTeachingAssignments(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.portalService.getMyTeachingAssignments(user);

    return {
      success: true,
      data,
      message: null,
    };
  }

  @Get('my-timetable')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Thời khóa biểu cá nhân giáo viên' })
  async getMyTimetable(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(portalTimetableQuerySchema))
    query: PortalTimetableQuery,
  ) {
    const data = await this.portalService.getMyTimetable(user, query);

    return {
      success: true,
      data,
      message: null,
    };
  }

  @Get('my-student-profile')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Hồ sơ học sinh đang đăng nhập' })
  async getMyStudentProfile(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.portalService.getMyStudentProfile(user);

    return {
      success: true,
      data,
      message: null,
    };
  }

  @Get('my-class-timetable')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Thời khóa biểu lớp hành chính của học sinh' })
  async getMyClassTimetable(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(portalTimetableQuerySchema))
    query: PortalTimetableQuery,
  ) {
    // console.log('user', user);
    const data = await this.portalService.getMyClassTimetable(user, query);

    return {
      success: true,
      data,
      message: null,
    };
  }

  @Get('my-children')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'Danh sách con của phụ huynh' })
  async getMyChildren(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.portalService.getMyChildren(user);

    return {
      success: true,
      data,
      message: null,
    };
  }

  @Get('my-attendance-classes')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Lớp môn GV có thể điểm danh (học kỳ hiện hành)' })
  async getMyAttendanceClasses(@CurrentUser() user: AuthenticatedUser) {
    const data =
      await this.portalAttendanceService.getMyAttendanceClasses(user);

    return {
      success: true,
      data,
      message: null,
    };
  }

  @Get('attendance-sessions/:id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'GV xem chi tiết phiên điểm danh (kèm bản ghi HS)' })
  async getMyAttendanceSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    const data = await this.portalAttendanceService.getMyAttendanceSession(
      user,
      id,
    );

    return {
      success: true,
      data,
      message: null,
    };
  }

  @Post('attendance-sessions')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'GV tạo/mở phiên điểm danh' })
  async createMyAttendanceSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(portalCreateAttendanceSessionSchema))
    body: PortalCreateAttendanceSessionInput,
  ) {
    const data = await this.portalAttendanceService.createMyAttendanceSession(
      user,
      body,
    );

    return {
      success: true,
      data,
      message: 'Tạo phiên điểm danh thành công',
    };
  }

  @Put('attendance-sessions/:id/records')
  @Roles(UserRole.TEACHER)
  @ApiOperation({
    summary: 'GV bulk ghi điểm danh (phiên OPEN, lớp được phân công)',
  })
  async bulkUpsertMySessionRecords(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(portalBulkUpsertAttendanceRecordsSchema))
    body: PortalBulkUpsertAttendanceRecordsInput,
  ) {
    const data = await this.portalAttendanceService.bulkUpsertMySessionRecords(
      user,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Ghi điểm danh thành công',
    };
  }

  @Patch('attendance-sessions/:id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'GV đóng phiên điểm danh' })
  async closeMyAttendanceSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
    @Body(new ZodValidationPipe(portalCloseAttendanceSessionSchema))
    body: PortalCloseAttendanceSessionInput,
  ) {
    const data = await this.portalAttendanceService.closeMyAttendanceSession(
      user,
      id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Đóng phiên điểm danh thành công',
    };
  }

  @Get('my-attendance')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Lịch sử điểm danh của học sinh' })
  async getMyAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(portalMyAttendanceQuerySchema))
    query: PortalMyAttendanceQuery,
  ) {
    const result = await this.portalAttendanceService.getMyAttendance(
      user,
      query,
    );

    return {
      success: true,
      data: result.items,
      meta: result.meta,
      message: null,
    };
  }

  @Get('my-children/:studentId/attendance')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'Lịch sử điểm danh của con' })
  async getMyChildAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId', new ZodValidationPipe(uuidParamSchema))
    studentId: string,
    @Query(new ZodValidationPipe(portalMyAttendanceQuerySchema))
    query: PortalMyAttendanceQuery,
  ) {
    const result = await this.portalAttendanceService.getMyChildAttendance(
      user,
      studentId,
      query,
    );

    return {
      success: true,
      data: result.items,
      meta: result.meta,
      message: null,
    };
  }
}
