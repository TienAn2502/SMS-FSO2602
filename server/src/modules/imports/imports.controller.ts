import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '@/common/auth/auth.types';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { HomeroomClassesImportTemplateService } from '@/modules/imports/homeroom-classes-import-template.service';
import { HomeroomClassesImportService } from '@/modules/imports/homeroom-classes-import.service';
import { ParentsImportTemplateService } from '@/modules/imports/parents-import-template.service';
import { ParentsImportService } from '@/modules/imports/parents-import.service';
import {
  importHomeroomClassesFormSchema,
  homeroomClassesImportTemplateQuerySchema,
  type ImportHomeroomClassesFormInput,
  type HomeroomClassesImportTemplateQuery,
} from '@/modules/imports/schemas/homeroom-classes-import.schema';
import {
  importStudentsFormSchema,
  studentsImportTemplateQuerySchema,
  type ImportStudentsFormInput,
  type StudentsImportTemplateQuery,
} from '@/modules/imports/schemas/students-import.schema';
import { StudentsImportTemplateService } from '@/modules/imports/students-import-template.service';
import { StudentsImportService } from '@/modules/imports/students-import.service';
import { TeachersImportTemplateService } from '@/modules/imports/teachers-import-template.service';
import { TeachersImportService } from '@/modules/imports/teachers-import.service';
import { TeachingAssignmentsImportTemplateService } from '@/modules/imports/teaching-assignments-import-template.service';
import { TeachingAssignmentsImportService } from '@/modules/imports/teaching-assignments-import.service';
import { ClassPlacementImportTemplateService } from '@/modules/imports/class-placement-import-template.service';
import { ClassPlacementImportService } from '@/modules/imports/class-placement-import.service';
import { CourseSectionsImportTemplateService } from '@/modules/imports/course-sections-import-template.service';
import { CourseSectionsImportService } from '@/modules/imports/course-sections-import.service';
import {
  importTeachingAssignmentsFormSchema,
  teachingAssignmentsImportTemplateQuerySchema,
  type ImportTeachingAssignmentsFormInput,
  type TeachingAssignmentsImportTemplateQuery,
} from '@/modules/imports/schemas/teaching-assignments-import.schema';
import {
  importClassPlacementFormSchema,
  classPlacementImportTemplateQuerySchema,
  type ImportClassPlacementFormInput,
  type ClassPlacementImportTemplateQuery,
} from '@/modules/imports/schemas/class-placement-import.schema';
import {
  importCourseSectionsFormSchema,
  courseSectionsImportTemplateQuerySchema,
  type ImportCourseSectionsFormInput,
  type CourseSectionsImportTemplateQuery,
} from '@/modules/imports/schemas/course-sections-import.schema';
import {
  importTimetableFormSchema,
  timetableImportTemplateQuerySchema,
  type ImportTimetableFormInput,
  type TimetableImportTemplateQuery,
} from '@/modules/imports/schemas/timetable-import.schema';
import { TimetableImportService } from '@/modules/imports/timetable-import.service';
import { TimetableImportTemplateService } from '@/modules/imports/timetable-import-template.service';

@ApiTags('Imports')
@ApiCookieAuth('access_token')
@Controller('imports')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class ImportsController {
  constructor(
    private readonly studentsImportService: StudentsImportService,
    private readonly studentsImportTemplateService: StudentsImportTemplateService,
    private readonly teachersImportService: TeachersImportService,
    private readonly teachersImportTemplateService: TeachersImportTemplateService,
    private readonly parentsImportService: ParentsImportService,
    private readonly parentsImportTemplateService: ParentsImportTemplateService,
    private readonly homeroomClassesImportService: HomeroomClassesImportService,
    private readonly homeroomClassesImportTemplateService: HomeroomClassesImportTemplateService,
    private readonly teachingAssignmentsImportService: TeachingAssignmentsImportService,
    private readonly teachingAssignmentsImportTemplateService: TeachingAssignmentsImportTemplateService,
    private readonly classPlacementImportService: ClassPlacementImportService,
    private readonly classPlacementImportTemplateService: ClassPlacementImportTemplateService,
    private readonly courseSectionsImportService: CourseSectionsImportService,
    private readonly courseSectionsImportTemplateService: CourseSectionsImportTemplateService,
    private readonly timetableImportService: TimetableImportService,
    private readonly timetableImportTemplateService: TimetableImportTemplateService,
  ) {}

  @Get('templates/students')
  @ApiOperation({ summary: 'Tải file mẫu import học sinh (.xlsx)' })
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header(
    'Content-Disposition',
    'attachment; filename="mau-import-hoc-sinh.xlsx"',
  )
  async downloadStudentsTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(studentsImportTemplateQuerySchema))
    query: StudentsImportTemplateQuery,
  ): Promise<StreamableFile> {
    const buffer = await this.studentsImportTemplateService.buildTemplateBuffer(
      user.activeSchoolId,
      query,
    );

    return new StreamableFile(buffer);
  }

  @Post('students')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import học sinh từ file Excel/CSV' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'academicYearId', 'semesterId'],
      properties: {
        file: { type: 'string', format: 'binary' },
        academicYearId: { type: 'string', format: 'uuid' },
        semesterId: { type: 'string', format: 'uuid' },
      },
    },
  })
  async importStudents(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body(new ZodValidationPipe(importStudentsFormSchema))
    body: ImportStudentsFormInput,
  ) {
    const data = await this.studentsImportService.importStudents(
      user.activeSchoolId,
      file,
      body,
    );

    return {
      success: true,
      data,
      message: `Import thành công ${data.successCount} học sinh (${data.created} mới, ${data.updated} cập nhật)`,
    };
  }

  @Get('templates/class-placement')
  @ApiOperation({
    summary: 'Tải file mẫu import chia lớp đầu năm (.xlsx, mỗi sheet một lớp)',
  })
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header(
    'Content-Disposition',
    'attachment; filename="mau-import-chia-lop.xlsx"',
  )
  async downloadClassPlacementTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(classPlacementImportTemplateQuerySchema))
    query: ClassPlacementImportTemplateQuery,
  ): Promise<StreamableFile> {
    const buffer =
      await this.classPlacementImportTemplateService.buildTemplateBuffer(
        user.activeSchoolId,
        query,
      );
    return new StreamableFile(buffer);
  }

  @Post('class-placement')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Import chia lớp đầu năm: mỗi sheet = một lớp; tự tạo lớp nếu chưa có',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'academicYearId', 'semesterId'],
      properties: {
        file: { type: 'string', format: 'binary' },
        academicYearId: { type: 'string', format: 'uuid' },
        semesterId: { type: 'string', format: 'uuid' },
      },
    },
  })
  async importClassPlacement(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body(new ZodValidationPipe(importClassPlacementFormSchema))
    body: ImportClassPlacementFormInput,
  ) {
    const data = await this.classPlacementImportService.importClassPlacement(
      user.activeSchoolId,
      file,
      body,
    );

    return {
      success: true,
      data,
      message: `Import chia lớp thành công ${data.successCount} HS (lớp mới ${data.classesCreated}, lớp có sẵn ${data.classesExisting})`,
    };
  }

  @Get('templates/course-sections')
  @ApiOperation({
    summary:
      'Tải file mẫu import lớp môn (.xlsx, mỗi sheet một lớp HC)',
  })
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header(
    'Content-Disposition',
    'attachment; filename="mau-import-lop-mon.xlsx"',
  )
  async downloadCourseSectionsTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(courseSectionsImportTemplateQuerySchema))
    query: CourseSectionsImportTemplateQuery,
  ): Promise<StreamableFile> {
    const buffer =
      await this.courseSectionsImportTemplateService.buildTemplateBuffer(
        user.activeSchoolId,
        query,
      );
    return new StreamableFile(buffer);
  }

  @Post('course-sections')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Import lớp môn: mỗi sheet = một lớp HC; tạo record mới (không copy năm cũ)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'semesterId'],
      properties: {
        file: { type: 'string', format: 'binary' },
        semesterId: { type: 'string', format: 'uuid' },
      },
    },
  })
  async importCourseSections(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body(new ZodValidationPipe(importCourseSectionsFormSchema))
    body: ImportCourseSectionsFormInput,
  ) {
    const data = await this.courseSectionsImportService.importCourseSections(
      user.activeSchoolId,
      file,
      body,
    );

    return {
      success: true,
      data,
      message: `Import lớp môn: tạo ${data.created}, bỏ qua ${data.skippedExisting}, phân công ${data.assignmentsCreated}`,
    };
  }

  @Get('templates/teachers')
  @ApiOperation({ summary: 'Tải file mẫu import giáo viên (.xlsx)' })
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header(
    'Content-Disposition',
    'attachment; filename="mau-import-giao-vien.xlsx"',
  )
  async downloadTeachersTemplate(): Promise<StreamableFile> {
    const buffer = await this.teachersImportTemplateService.buildTemplateBuffer();
    return new StreamableFile(buffer);
  }

  @Post('teachers')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import giáo viên từ file Excel/CSV' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async importTeachers(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const data = await this.teachersImportService.importTeachers(
      user.activeSchoolId,
      file,
    );

    return {
      success: true,
      data,
      message: `Import thành công ${data.successCount} giáo viên (${data.created} mới, ${data.updated} cập nhật)`,
    };
  }

  @Get('templates/parents')
  @ApiOperation({ summary: 'Tải file mẫu import phụ huynh (.xlsx)' })
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header(
    'Content-Disposition',
    'attachment; filename="mau-import-phu-huynh.xlsx"',
  )
  async downloadParentsTemplate(): Promise<StreamableFile> {
    const buffer = await this.parentsImportTemplateService.buildTemplateBuffer();
    return new StreamableFile(buffer);
  }

  @Post('parents')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import phụ huynh từ file Excel/CSV' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async importParents(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const data = await this.parentsImportService.importParents(
      user.activeSchoolId,
      file,
    );

    return {
      success: true,
      data,
      message: `Import thành công ${data.successCount} phụ huynh (${data.created} mới, ${data.updated} cập nhật)`,
    };
  }

  @Get('templates/homeroom-classes')
  @ApiOperation({ summary: 'Tải file mẫu import lớp hành chính (.xlsx)' })
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header(
    'Content-Disposition',
    'attachment; filename="mau-import-lop-hanh-chinh.xlsx"',
  )
  async downloadHomeroomClassesTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(homeroomClassesImportTemplateQuerySchema))
    query: HomeroomClassesImportTemplateQuery,
  ): Promise<StreamableFile> {
    const buffer =
      await this.homeroomClassesImportTemplateService.buildTemplateBuffer(
        user.activeSchoolId,
        query,
      );
    return new StreamableFile(buffer);
  }

  @Post('homeroom-classes')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import lớp hành chính từ file Excel/CSV' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'academicYearId'],
      properties: {
        file: { type: 'string', format: 'binary' },
        academicYearId: { type: 'string', format: 'uuid' },
      },
    },
  })
  async importHomeroomClasses(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body(new ZodValidationPipe(importHomeroomClassesFormSchema))
    body: ImportHomeroomClassesFormInput,
  ) {
    const data = await this.homeroomClassesImportService.importHomeroomClasses(
      user.activeSchoolId,
      file,
      body,
    );

    return {
      success: true,
      data,
      message: `Import thành công ${data.successCount} lớp HC (${data.created} mới, ${data.updated} cập nhật)`,
    };
  }

  @Get('templates/teaching-assignments')
  @ApiOperation({ summary: 'Tải file mẫu import phân công giảng dạy (.xlsx)' })
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header(
    'Content-Disposition',
    'attachment; filename="mau-import-phan-cong-giang-day.xlsx"',
  )
  async downloadTeachingAssignmentsTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(teachingAssignmentsImportTemplateQuerySchema))
    query: TeachingAssignmentsImportTemplateQuery,
  ): Promise<StreamableFile> {
    const buffer =
      await this.teachingAssignmentsImportTemplateService.buildTemplateBuffer(
        user.activeSchoolId,
        query,
      );
    return new StreamableFile(buffer);
  }

  @Post('teaching-assignments')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Import phân công giảng dạy từ file Excel/CSV' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'semesterId'],
      properties: {
        file: { type: 'string', format: 'binary' },
        semesterId: { type: 'string', format: 'uuid' },
      },
    },
  })
  async importTeachingAssignments(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body(new ZodValidationPipe(importTeachingAssignmentsFormSchema))
    body: ImportTeachingAssignmentsFormInput,
  ) {
    const data =
      await this.teachingAssignmentsImportService.importTeachingAssignments(
        user.activeSchoolId,
        file,
        body,
      );

    return {
      success: true,
      data,
      message: `Import thành công ${data.successCount} phân công (${data.created} mới, ${data.updated} cập nhật)`,
    };
  }

  @Get('templates/timetable')
  @ApiOperation({
    summary: 'Tải file mẫu import TKB (.xlsx); query semesterId → điền từ DB',
  })
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header(
    'Content-Disposition',
    'attachment; filename="mau-import-thoi-khoa-bieu.xlsx"',
  )
  async downloadTimetableTemplate(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(timetableImportTemplateQuerySchema))
    query: TimetableImportTemplateQuery,
  ): Promise<StreamableFile> {
    const buffer = await this.timetableImportTemplateService.buildTemplateBuffer(
      user.activeSchoolId,
      query,
    );
    return new StreamableFile(buffer);
  }

  @Post('timetable')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Import TKB từ file Excel ma trận (mỗi lớp HC một sheet)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'semesterId'],
      properties: {
        file: { type: 'string', format: 'binary' },
        semesterId: { type: 'string', format: 'uuid' },
      },
    },
  })
  async importTimetable(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body(new ZodValidationPipe(importTimetableFormSchema))
    body: ImportTimetableFormInput,
  ) {
    const data = await this.timetableImportService.importTimetable(
      user.activeSchoolId,
      file,
      body,
    );

    return {
      success: true,
      data,
      message: `Import thành công ${data.successCount} tiết TKB (${data.created} mới, ${data.updated} cập nhật, ${data.sheetsProcessed} lớp)`,
    };
  }
}
