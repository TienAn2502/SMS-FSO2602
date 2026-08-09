import {
  Controller,
  Get,
  Param,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '@/common/auth/auth.types';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { AttendanceExportService } from '@/modules/exports/attendance-export.service';
import { EnrollmentsExportService } from '@/modules/exports/enrollments-export.service';
import { GradebookExportService } from '@/modules/exports/gradebook-export.service';
import { HomeroomClassesExportService } from '@/modules/exports/homeroom-classes-export.service';
import { ParentsExportService } from '@/modules/exports/parents-export.service';
import { SemesterSummariesExportService } from '@/modules/exports/semester-summaries-export.service';
import { StudentsExportService } from '@/modules/exports/students-export.service';
import { TeachersExportService } from '@/modules/exports/teachers-export.service';
import { TeachingAssignmentsExportService } from '@/modules/exports/teaching-assignments-export.service';
import { YearSummariesExportService } from '@/modules/exports/year-summaries-export.service';
import { ExportsPdfService } from '@/modules/exports/exports-pdf.service';
import {
  exportSemesterSummariesPdfQuerySchema,
  exportTimetablePdfQuerySchema,
  exportYearSummariesPdfQuerySchema,
  type ExportSemesterSummariesPdfQuery,
  type ExportTimetablePdfQuery,
  type ExportYearSummariesPdfQuery,
} from '@/modules/exports/schemas/exports-pdf.schema';
import {
  exportAttendanceQuerySchema,
  type ExportAttendanceQuery,
} from '@/modules/exports/schemas/attendance-export.schema';
import {
  exportEnrollmentsQuerySchema,
  type ExportEnrollmentsQuery,
} from '@/modules/exports/schemas/enrollments-export.schema';
import {
  exportGradebookQuerySchema,
  type ExportGradebookQuery,
} from '@/modules/exports/schemas/gradebook-export.schema';
import {
  exportHomeroomClassesQuerySchema,
  type ExportHomeroomClassesQuery,
} from '@/modules/exports/schemas/homeroom-classes-export.schema';
import {
  exportParentsQuerySchema,
  type ExportParentsQuery,
} from '@/modules/exports/schemas/parents-export.schema';
import {
  exportSemesterSummariesQuerySchema,
  type ExportSemesterSummariesQuery,
} from '@/modules/exports/schemas/semester-summaries-export.schema';
import {
  exportStudentsQuerySchema,
  type ExportStudentsQuery,
} from '@/modules/exports/schemas/students-export.schema';
import {
  exportTeachersQuerySchema,
  type ExportTeachersQuery,
} from '@/modules/exports/schemas/teachers-export.schema';
import {
  exportTeachingAssignmentsQuerySchema,
  type ExportTeachingAssignmentsQuery,
} from '@/modules/exports/schemas/teaching-assignments-export.schema';
import {
  exportTimetableQuerySchema,
  type ExportTimetableQuery,
} from '@/modules/exports/schemas/timetable-export.schema';
import { TimetableExportService } from '@/modules/exports/timetable-export.service';
import {
  exportYearSummariesQuerySchema,
  type ExportYearSummariesQuery,
} from '@/modules/exports/schemas/year-summaries-export.schema';

@ApiTags('Exports')
@ApiCookieAuth('access_token')
@Controller('exports')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class ExportsController {
  constructor(
    private readonly studentsExportService: StudentsExportService,
    private readonly teachersExportService: TeachersExportService,
    private readonly parentsExportService: ParentsExportService,
    private readonly homeroomClassesExportService: HomeroomClassesExportService,
    private readonly teachingAssignmentsExportService: TeachingAssignmentsExportService,
    private readonly enrollmentsExportService: EnrollmentsExportService,
    private readonly gradebookExportService: GradebookExportService,
    private readonly semesterSummariesExportService: SemesterSummariesExportService,
    private readonly yearSummariesExportService: YearSummariesExportService,
    private readonly attendanceExportService: AttendanceExportService,
    private readonly timetableExportService: TimetableExportService,
    private readonly exportsPdfService: ExportsPdfService,
  ) {}

  @Get('students')
  @ApiOperation({ summary: 'Export danh sách học sinh (XLSX hoặc CSV)' })
  async exportStudents(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(exportStudentsQuerySchema))
    query: ExportStudentsQuery,
  ): Promise<StreamableFile> {
    const file = await this.studentsExportService.exportStudents(
      user.activeSchoolId,
      query,
    );

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get('teachers')
  @ApiOperation({ summary: 'Export danh sách giáo viên (XLSX hoặc CSV)' })
  async exportTeachers(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(exportTeachersQuerySchema))
    query: ExportTeachersQuery,
  ): Promise<StreamableFile> {
    const file = await this.teachersExportService.exportTeachers(
      user.activeSchoolId,
      query,
    );

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get('parents')
  @ApiOperation({ summary: 'Export danh sách phụ huynh (XLSX hoặc CSV)' })
  async exportParents(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(exportParentsQuerySchema))
    query: ExportParentsQuery,
  ): Promise<StreamableFile> {
    const file = await this.parentsExportService.exportParents(
      user.activeSchoolId,
      query,
    );

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get('homeroom-classes')
  @ApiOperation({ summary: 'Export danh sách lớp hành chính (XLSX hoặc CSV)' })
  async exportHomeroomClasses(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(exportHomeroomClassesQuerySchema))
    query: ExportHomeroomClassesQuery,
  ): Promise<StreamableFile> {
    const file = await this.homeroomClassesExportService.exportHomeroomClasses(
      user.activeSchoolId,
      query,
    );

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get('teaching-assignments')
  @ApiOperation({
    summary: 'Export danh sách phân công giảng dạy (XLSX hoặc CSV)',
  })
  async exportTeachingAssignments(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(exportTeachingAssignmentsQuerySchema))
    query: ExportTeachingAssignmentsQuery,
  ): Promise<StreamableFile> {
    const file =
      await this.teachingAssignmentsExportService.exportTeachingAssignments(
        user.activeSchoolId,
        query,
      );

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get('enrollments')
  @ApiOperation({ summary: 'Export danh sách ghi danh (XLSX hoặc CSV)' })
  async exportEnrollments(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(exportEnrollmentsQuerySchema))
    query: ExportEnrollmentsQuery,
  ): Promise<StreamableFile> {
    const file = await this.enrollmentsExportService.exportEnrollments(
      user.activeSchoolId,
      query,
    );

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get('gradebook/course-sections/:courseSectionId')
  @ApiOperation({ summary: 'Export sổ điểm lớp môn (XLSX hoặc CSV)' })
  async exportGradebook(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseSectionId') courseSectionId: string,
    @Query(new ZodValidationPipe(exportGradebookQuerySchema))
    query: ExportGradebookQuery,
  ): Promise<StreamableFile> {
    const file = await this.gradebookExportService.exportGradebook(
      user.activeSchoolId,
      courseSectionId,
      query,
    );

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get('gradebook/course-sections/:courseSectionId/pdf')
  @ApiOperation({ summary: 'Export sổ điểm lớp môn (PDF)' })
  async exportGradebookPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseSectionId') courseSectionId: string,
  ): Promise<StreamableFile> {
    const file = await this.exportsPdfService.exportGradebookPdf(
      user.activeSchoolId,
      courseSectionId,
    );

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get('semester-summaries/pdf')
  @ApiOperation({ summary: 'Export tổng kết học kỳ (PDF)' })
  async exportSemesterSummariesPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(exportSemesterSummariesPdfQuerySchema))
    query: ExportSemesterSummariesPdfQuery,
  ): Promise<StreamableFile> {
    const file = await this.exportsPdfService.exportSemesterSummariesPdf(
      user.activeSchoolId,
      query,
    );

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get('semester-summaries')
  @ApiOperation({ summary: 'Export tổng kết học kỳ (XLSX hoặc CSV)' })
  async exportSemesterSummaries(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(exportSemesterSummariesQuerySchema))
    query: ExportSemesterSummariesQuery,
  ): Promise<StreamableFile> {
    const file =
      await this.semesterSummariesExportService.exportSemesterSummaries(
        user.activeSchoolId,
        query,
      );

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get('year-summaries/pdf')
  @ApiOperation({ summary: 'Export tổng kết năm học (PDF)' })
  async exportYearSummariesPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(exportYearSummariesPdfQuerySchema))
    query: ExportYearSummariesPdfQuery,
  ): Promise<StreamableFile> {
    const file = await this.exportsPdfService.exportYearSummariesPdf(
      user.activeSchoolId,
      query,
    );

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get('year-summaries')
  @ApiOperation({ summary: 'Export tổng kết năm học (XLSX hoặc CSV)' })
  async exportYearSummaries(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(exportYearSummariesQuerySchema))
    query: ExportYearSummariesQuery,
  ): Promise<StreamableFile> {
    const file = await this.yearSummariesExportService.exportYearSummaries(
      user.activeSchoolId,
      query,
    );

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get('attendance')
  @ApiOperation({ summary: 'Export báo cáo điểm danh (XLSX hoặc CSV)' })
  async exportAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(exportAttendanceQuerySchema))
    query: ExportAttendanceQuery,
  ): Promise<StreamableFile> {
    const file = await this.attendanceExportService.exportAttendance(
      user.activeSchoolId,
      query,
    );

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get('timetable/pdf')
  @ApiOperation({ summary: 'Export thời khóa biểu dạng ma trận (PDF)' })
  async exportTimetablePdf(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(exportTimetablePdfQuerySchema))
    query: ExportTimetablePdfQuery,
  ): Promise<StreamableFile> {
    const file = await this.exportsPdfService.exportTimetablePdf(
      user.activeSchoolId,
      query,
    );

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get('timetable')
  @ApiOperation({
    summary: 'Export thời khóa biểu dạng ma trận (XLSX hoặc CSV)',
  })
  async exportTimetable(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(exportTimetableQuerySchema))
    query: ExportTimetableQuery,
  ): Promise<StreamableFile> {
    const file = await this.timetableExportService.exportTimetable(
      user.activeSchoolId,
      query,
    );

    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }
}
