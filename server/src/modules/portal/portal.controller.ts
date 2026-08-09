import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '@/common/auth/auth.types';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { uuidParamSchema } from '@/common/schemas/shared.schema';
import {
  listMyCourseSectionsQuerySchema,
  portalTimetableQuerySchema,
  portalExportTimetableQuerySchema,
  type ListMyCourseSectionsQuery,
  type PortalTimetableQuery,
  type PortalExportTimetableQuery,
} from '@/modules/portal/schemas/portal.schema';
import {
  portalBulkUpsertAttendanceRecordsSchema,
  portalCloseAttendanceSessionSchema,
  portalCreateAttendanceSessionSchema,
  portalMyAttendanceQuerySchema,
  type PortalBulkUpsertAttendanceRecordsInput,
  type PortalCloseAttendanceSessionInput,
  type PortalCreateAttendanceSessionInput,
  type PortalMyAttendanceQuery,
} from '@/modules/portal/schemas/portal-attendance.schema';
import {
  portalMyGradebookClassesQuerySchema,
  portalMyScoresGridQuerySchema,
  portalMyScoresQuerySchema,
  portalPatchGradebookScoresSchema,
  portalImportScoresFormSchema,
  portalImportScoresTemplateQuerySchema,
  portalGradebookExportQuerySchema,
  type PortalMyGradebookClassesQuery,
  type PortalMyScoresGridQuery,
  type PortalMyScoresQuery,
  type PortalPatchGradebookScoresInput,
  type PortalImportScoresFormInput,
  type PortalImportScoresTemplateQuery,
  type PortalGradebookExportQuery,
} from '@/modules/portal/schemas/portal-gradebook.schema';
import {
  portalHomeroomSummariesQuerySchema,
  portalSummariesQuerySchema,
  type PortalHomeroomSummariesQuery,
  type PortalSummariesQuery,
} from '@/modules/grade-summaries/schemas/grade-summaries-list.schema';
import { bulkUpsertConductRecordsSchema, type BulkUpsertConductRecordsInput } from '@/modules/conduct-records/schemas/conduct-record.schema';
import { ConductRecordsService } from '@/modules/conduct-records/conduct-records.service';
import { PortalAttendanceService } from '@/modules/portal/portal-attendance.service';
import { PortalGradebookService } from '@/modules/portal/portal-gradebook.service';
import { PortalSummariesService } from '@/modules/portal/portal-summaries.service';
import { PortalService } from '@/modules/portal/portal.service';

@ApiTags('Portal')
@ApiCookieAuth('access_token')
@Controller('portal')
@UseGuards(TenantGuard, RolesGuard)
export class PortalController {
  constructor(
    private readonly portalService: PortalService,
    private readonly portalAttendanceService: PortalAttendanceService,
    private readonly portalGradebookService: PortalGradebookService,
    private readonly portalSummariesService: PortalSummariesService,
    private readonly conductRecordsService: ConductRecordsService,
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

  @Get('my-timetable/export')
  @Roles(UserRole.TEACHER)
  @ApiOperation({
    summary: 'Export TKB cá nhân giáo viên dạng ma trận (XLSX hoặc CSV)',
  })
  async exportMyTimetable(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(portalExportTimetableQuerySchema))
    query: PortalExportTimetableQuery,
  ): Promise<StreamableFile> {
    const file = await this.portalService.exportMyTimetable(user, query);

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
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

  @Get('my-class-timetable/export')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Export TKB lớp HC học sinh dạng ma trận (XLSX hoặc CSV)',
  })
  async exportMyClassTimetable(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(portalExportTimetableQuerySchema))
    query: PortalExportTimetableQuery,
  ): Promise<StreamableFile> {
    const file = await this.portalService.exportMyClassTimetable(user, query);

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
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

  @Post('attendance-sessions/:id/records/initialize')
  @Roles(UserRole.TEACHER)
  @ApiOperation({
    summary: 'GV khởi tạo danh sách HS điểm danh cho phiên OPEN',
  })
  async initializeMySessionRecords(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(uuidParamSchema)) id: string,
  ) {
    const data = await this.portalAttendanceService.initializeMySessionRecords(
      user,
      id,
    );

    return {
      success: true,
      data,
      message: 'Đã khởi tạo danh sách học sinh điểm danh',
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

  @Get('my-course-sections')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary:
      'Lớp môn học của học sinh (mặc định là năm học và học kỳ hiện hành)',
  })
  async getMyCourseSections(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listMyCourseSectionsQuerySchema))
    query: ListMyCourseSectionsQuery,
  ) {
    const result = await this.portalService.getMyCourseSections(user, query);

    return {
      success: true,
      data: result.items,
      meta: result.meta,
      message: null,
    };
  }

  @Get('my-gradebook-classes')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Danh sách lớp môn GV được phân công (sổ điểm)' })
  async getMyGradebookClasses(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(portalMyGradebookClassesQuerySchema))
    query: PortalMyGradebookClassesQuery,
  ) {
    const data = await this.portalGradebookService.getMyGradebookClasses(
      user,
      query,
    );

    return {
      success: true,
      data,
      message: null,
    };
  }

  @Get('my-gradebook-classes/:courseSectionId/grid')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Sổ điểm học kỳ — lưới TX / GK / CK' })
  async getMyGradebookGrid(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseSectionId', new ZodValidationPipe(uuidParamSchema))
    courseSectionId: string,
  ) {
    const data = await this.portalGradebookService.getMyGradebookGrid(
      user,
      courseSectionId,
    );

    return {
      success: true,
      data,
      message: null,
    };
  }

  @Patch('my-gradebook-classes/:courseSectionId/scores')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Cập nhật điểm đã thay đổi trên sổ điểm' })
  async patchMyGradebookScores(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseSectionId', new ZodValidationPipe(uuidParamSchema))
    courseSectionId: string,
    @Body(new ZodValidationPipe(portalPatchGradebookScoresSchema))
    body: PortalPatchGradebookScoresInput,
  ) {
    await this.portalGradebookService.patchMyGradebookScores(
      user,
      courseSectionId,
      body,
    );

    return {
      success: true,
      data: null,
      message: 'Lưu sổ điểm thành công',
    };
  }

  @Patch('my-gradebook-classes/:courseSectionId/lock')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Khóa sổ điểm lớp môn (đóng tất cả đầu điểm)' })
  async lockMyGradebook(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseSectionId', new ZodValidationPipe(uuidParamSchema))
    courseSectionId: string,
  ) {
    const data = await this.portalGradebookService.lockMyGradebook(
      user,
      courseSectionId,
    );

    return {
      success: true,
      data,
      message: 'Đã khóa sổ điểm',
    };
  }

  @Get('my-gradebook-classes/:courseSectionId/scores/import-template')
  @Roles(UserRole.TEACHER)
  @ApiOperation({
    summary: 'Tải file mẫu import điểm (ghi rõ lớp môn, năm học, môn, đầu điểm)',
  })
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async downloadMyGradebookImportTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseSectionId', new ZodValidationPipe(uuidParamSchema))
    courseSectionId: string,
    @Query(new ZodValidationPipe(portalImportScoresTemplateQuerySchema))
    query: PortalImportScoresTemplateQuery,
  ): Promise<StreamableFile> {
    const file =
      await this.portalGradebookService.downloadMyGradebookImportTemplate(
        user,
        courseSectionId,
        query,
      );

    return new StreamableFile(file.buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Post('my-gradebook-classes/:courseSectionId/scores/import')
  @Roles(UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import điểm từ Excel/CSV vào đầu điểm đang mở' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'assessmentId'],
      properties: {
        file: { type: 'string', format: 'binary' },
        assessmentId: { type: 'string', format: 'uuid' },
      },
    },
  })
  async importMyGradebookScores(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseSectionId', new ZodValidationPipe(uuidParamSchema))
    courseSectionId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body(new ZodValidationPipe(portalImportScoresFormSchema))
    body: PortalImportScoresFormInput,
  ) {
    const data = await this.portalGradebookService.importMyGradebookScores(
      user,
      courseSectionId,
      body,
      file,
    );

    return {
      success: true,
      data,
      message: `Import thành công ${data.successCount} dòng điểm`,
    };
  }

  @Get('my-gradebook-classes/:courseSectionId/export')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Export sổ điểm lớp môn được phân công (XLSX hoặc CSV)' })
  async exportMyGradebook(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseSectionId', new ZodValidationPipe(uuidParamSchema))
    courseSectionId: string,
    @Query(new ZodValidationPipe(portalGradebookExportQuerySchema))
    query: PortalGradebookExportQuery,
  ): Promise<StreamableFile> {
    const file = await this.portalGradebookService.exportMyGradebook(
      user,
      courseSectionId,
      query,
    );

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get('my-gradebook-classes/:courseSectionId/export/pdf')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Export sổ điểm lớp môn được phân công (PDF)' })
  async exportMyGradebookPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseSectionId', new ZodValidationPipe(uuidParamSchema))
    courseSectionId: string,
  ): Promise<StreamableFile> {
    const file = await this.portalGradebookService.exportMyGradebookPdf(
      user,
      courseSectionId,
    );

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get('my-scores/grid')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Bảng điểm theo lưới TX/GK/CK (readonly, lọc học kỳ)',
  })
  async getMyScoresGrid(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(portalMyScoresGridQuerySchema))
    query: PortalMyScoresGridQuery,
  ) {
    const data = await this.portalGradebookService.getMyScoresGrid(user, query);

    return {
      success: true,
      data,
      message: null,
    };
  }

  @Get('my-scores/export/pdf')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Export bảng điểm cá nhân (PDF)' })
  async exportMyScoresPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(portalMyScoresGridQuerySchema))
    query: PortalMyScoresGridQuery,
  ): Promise<StreamableFile> {
    const file = await this.portalGradebookService.exportMyScoresPdf(
      user,
      query,
    );

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get('my-children/:studentId/scores/export/pdf')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'Export bảng điểm con (PDF)' })
  async exportMyChildScoresPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId', new ZodValidationPipe(uuidParamSchema))
    studentId: string,
    @Query(new ZodValidationPipe(portalMyScoresGridQuerySchema))
    query: PortalMyScoresGridQuery,
  ): Promise<StreamableFile> {
    const file = await this.portalGradebookService.exportMyChildScoresPdf(
      user,
      studentId,
      query,
    );

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get('my-children/:studentId/scores/grid')
  @Roles(UserRole.PARENT)
  @ApiOperation({
    summary: 'Bảng điểm con theo lưới TX/GK/CK (readonly, lọc học kỳ)',
  })
  async getMyChildScoresGrid(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId', new ZodValidationPipe(uuidParamSchema))
    studentId: string,
    @Query(new ZodValidationPipe(portalMyScoresGridQuerySchema))
    query: PortalMyScoresGridQuery,
  ) {
    const data = await this.portalGradebookService.getMyChildScoresGrid(
      user,
      studentId,
      query,
    );

    return {
      success: true,
      data,
      message: null,
    };
  }

  @Get('my-children/:studentId/scores')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'Bảng điểm con đã liên kết' })
  async getMyChildScores(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId', new ZodValidationPipe(uuidParamSchema))
    studentId: string,
    @Query(new ZodValidationPipe(portalMyScoresQuerySchema))
    query: PortalMyScoresQuery,
  ) {
    const result = await this.portalGradebookService.getMyChildScores(
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

  @Get('my-summaries')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Tổng kết học tập bản thân' })
  async getMySummaries(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(portalSummariesQuerySchema))
    query: PortalSummariesQuery,
  ) {
    const data = await this.portalSummariesService.getMySummaries(user, query);

    return { success: true, data, message: null };
  }

  @Get('my-children/:studentId/summaries')
  @Roles(UserRole.PARENT)
  @ApiOperation({ summary: 'Tổng kết học tập con' })
  async getMyChildSummaries(
    @CurrentUser() user: AuthenticatedUser,
    @Param('studentId', new ZodValidationPipe(uuidParamSchema))
    studentId: string,
    @Query(new ZodValidationPipe(portalSummariesQuerySchema))
    query: PortalSummariesQuery,
  ) {
    const data = await this.portalSummariesService.getMyChildSummaries(
      user,
      studentId,
      query,
    );

    return { success: true, data, message: null };
  }

  @Get('my-homeroom/summaries')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Bảng tổng kết lớp chủ nhiệm' })
  async getMyHomeroomSummaries(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(portalHomeroomSummariesQuerySchema))
    query: PortalHomeroomSummariesQuery,
  ) {
    const data = await this.portalSummariesService.getMyHomeroomSummaries(
      user,
      query,
    );

    return { success: true, data, message: null };
  }

  @Get('my-homeroom/year-summaries')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Xem đề xuất lên lớp lớp chủ nhiệm' })
  async getMyHomeroomYearSummaries(
    @CurrentUser() user: AuthenticatedUser,
    @Query('academicYearId', new ZodValidationPipe(uuidParamSchema))
    academicYearId: string,
    @Query('homeroomClassId', new ZodValidationPipe(uuidParamSchema))
    homeroomClassId: string,
  ) {
    const data = await this.portalSummariesService.getMyHomeroomYearSummaries(
      user,
      academicYearId,
      homeroomClassId,
    );

    return { success: true, data, message: null };
  }

  @Get('my-homeroom/conduct-records')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Lưới hạnh kiểm lớp chủ nhiệm' })
  async getMyHomeroomConductRecords(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(portalHomeroomSummariesQuerySchema))
    query: PortalHomeroomSummariesQuery,
  ) {
    const teacherId = await this.portalService.resolveTeacherId(user);
    const data = await this.conductRecordsService.listHomeroomGrid(
      user.activeSchoolId,
      query.semesterId,
      query.homeroomClassId,
      teacherId,
    );

    return { success: true, data, message: null };
  }

  @Put('my-homeroom/conduct-records')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Ghi hạnh kiểm lớp chủ nhiệm' })
  async upsertMyHomeroomConductRecords(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(bulkUpsertConductRecordsSchema))
    body: BulkUpsertConductRecordsInput,
  ) {
    const teacherId = await this.portalService.resolveTeacherId(user);
    const data = await this.conductRecordsService.bulkUpsert(
      user.activeSchoolId,
      body,
      {
        recordedByTeacherId: teacherId,
        requireHomeroomTeacherId: teacherId,
      },
    );

    return {
      success: true,
      data,
      message: 'Ghi hạnh kiểm thành công',
    };
  }
}
