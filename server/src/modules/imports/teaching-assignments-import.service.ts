import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AcademicEntityStatus, Prisma } from '@prisma/client';

import type { EnvConfig } from '@/common/config/env.schema';
import { PrismaService } from '@/common/database/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import type { ParsedSpreadsheetRow } from '@/common/files/file-format.types';
import { parseUploadedSpreadsheet } from '@/common/files/parse-uploaded-file.util';
import { parseIsoDate } from '@/common/schemas/academic.schema';
import { teachingAssignmentInclude } from '@/modules/teaching-assignments/mappers/teaching-assignment.mapper';
import {
  teachingAssignmentImportRowSchema,
  type ImportTeachingAssignmentsFormInput,
  type TeachingAssignmentImportResult,
  type TeachingAssignmentImportRow,
  type TeachingAssignmentImportRowError,
} from '@/modules/imports/schemas/teaching-assignments-import.schema';
import { validateTeachingAssignmentImportHeaders } from '@/modules/imports/utils/validate-teaching-assignment-import-headers.util';

interface ParsedTeachingAssignmentImportRow {
  rowNumber: number;
  row: TeachingAssignmentImportRow;
}

@Injectable()
export class TeachingAssignmentsImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  async importTeachingAssignments(
    schoolId: string,
    file: Express.Multer.File | undefined,
    form: ImportTeachingAssignmentsFormInput,
  ): Promise<TeachingAssignmentImportResult> {
    const parsed = await parseUploadedSpreadsheet(file, {
      maxBytes: this.configService.get('IMPORT_MAX_BYTES', { infer: true }),
      maxRows: this.configService.get('IMPORT_MAX_ROWS', { infer: true }),
    });

    const headerErrors = validateTeachingAssignmentImportHeaders(parsed.headers);
    if (headerErrors.length > 0) {
      throw this.buildValidationException(headerErrors);
    }

    if (parsed.rows.length === 0) {
      throw new AppException(
        'IMPORT_EMPTY',
        'File không có dòng dữ liệu',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.assertSemesterInTenant(schoolId, form.semesterId);

    const { rows, errors } = this.parseRows(parsed.rows);

    if (errors.length > 0) {
      throw this.buildValidationException(errors);
    }

    errors.push(...this.validateDuplicateRows(rows));
    if (errors.length > 0) {
      throw this.buildValidationException(errors);
    }

    const [teacherByEmail, sectionByCode, activeAssignmentBySectionId] =
      await Promise.all([
        this.loadTeachersByEmail(schoolId, rows),
        this.loadCourseSectionsByCode(schoolId, form.semesterId, rows),
        this.loadActiveAssignmentsBySectionId(schoolId, form.semesterId),
      ]);

    try {
      return await this.prisma.$transaction(async (tx) => {
        let created = 0;
        let updated = 0;

        for (const item of rows) {
          const outcome = await this.upsertAssignmentRow(tx, schoolId, {
            rowNumber: item.rowNumber,
            row: item.row,
            teacherByEmail,
            sectionByCode,
            activeAssignmentBySectionId,
          });

          if (outcome === 'created') {
            created += 1;
          } else {
            updated += 1;
          }
        }

        return {
          successCount: rows.length,
          errorCount: 0,
          created,
          updated,
          errors: [],
        };
      });
    } catch (error: unknown) {
      if (
        error instanceof AppException &&
        error.code === 'IMPORT_VALIDATION_FAILED'
      ) {
        throw error;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new AppException(
          'IMPORT_CONFLICT',
          'Dữ liệu import trùng phân công giảng dạy',
          HttpStatus.CONFLICT,
        );
      }

      throw error;
    }
  }

  private parseRows(rows: ParsedSpreadsheetRow[]): {
    rows: ParsedTeachingAssignmentImportRow[];
    errors: TeachingAssignmentImportRowError[];
  } {
    const parsedRows: ParsedTeachingAssignmentImportRow[] = [];
    const errors: TeachingAssignmentImportRowError[] = [];

    for (const spreadsheetRow of rows) {
      const normalizedData = this.normalizeRowData(spreadsheetRow.data);
      const result = teachingAssignmentImportRowSchema.safeParse(normalizedData);

      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            row: spreadsheetRow.rowNumber,
            field: String(issue.path[0] ?? 'row'),
            message: issue.message,
          });
        }
        continue;
      }

      parsedRows.push({
        rowNumber: spreadsheetRow.rowNumber,
        row: result.data,
      });
    }

    return { rows: parsedRows, errors };
  }

  private normalizeRowData(data: Record<string, string>): Record<string, string> {
    const normalized: Record<string, string> = {};

    for (const [key, value] of Object.entries(data)) {
      normalized[key] = value.trim();
    }

    return normalized;
  }

  private validateDuplicateRows(
    rows: ParsedTeachingAssignmentImportRow[],
  ): TeachingAssignmentImportRowError[] {
    const errors: TeachingAssignmentImportRowError[] = [];
    const pairKeys = new Map<string, number>();
    const sectionKeys = new Map<string, number>();

    for (const item of rows) {
      const pairKey = `${item.row.email_gv.toLowerCase()}|${item.row.ma_lop_mon.toLowerCase()}`;
      const existingPairRow = pairKeys.get(pairKey);
      if (existingPairRow !== undefined) {
        errors.push({
          row: item.rowNumber,
          field: 'email_gv',
          message: `Trùng phân công với dòng ${existingPairRow}`,
        });
      } else {
        pairKeys.set(pairKey, item.rowNumber);
      }

      const sectionKey = item.row.ma_lop_mon.toLowerCase();
      const existingSectionRow = sectionKeys.get(sectionKey);
      if (existingSectionRow !== undefined) {
        errors.push({
          row: item.rowNumber,
          field: 'ma_lop_mon',
          message: `Trùng lớp môn với dòng ${existingSectionRow}`,
        });
      } else {
        sectionKeys.set(sectionKey, item.rowNumber);
      }
    }

    return errors;
  }

  private async assertSemesterInTenant(
    schoolId: string,
    semesterId: string,
  ): Promise<void> {
    const semester = await this.prisma.semester.findFirst({
      where: { id: semesterId, schoolId },
      select: { id: true },
    });

    if (!semester) {
      throw new AppException(
        'SEMESTER_NOT_FOUND',
        'Không tìm thấy học kỳ',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private async loadTeachersByEmail(
    schoolId: string,
    rows: ParsedTeachingAssignmentImportRow[],
  ): Promise<Map<string, string>> {
    const emails = [
      ...new Set(rows.map((item) => item.row.email_gv.toLowerCase())),
    ];

    const teachers = await this.prisma.teacher.findMany({
      where: {
        schoolId,
        status: AcademicEntityStatus.ACTIVE,
        user: {
          email: { in: emails },
        },
      },
      select: {
        id: true,
        user: { select: { email: true } },
      },
    });

    return new Map(
      teachers
        .filter((teacher) => teacher.user?.email)
        .map((teacher) => [teacher.user!.email.toLowerCase(), teacher.id]),
    );
  }

  private async loadCourseSectionsByCode(
    schoolId: string,
    semesterId: string,
    _rows: ParsedTeachingAssignmentImportRow[],
  ): Promise<Map<string, string>> {
    const sections = await this.prisma.courseSection.findMany({
      where: {
        schoolId,
        semesterId,
        status: AcademicEntityStatus.ACTIVE,
      },
      select: {
        id: true,
        code: true,
      },
    });

    const sectionMap = new Map<string, string>();
    for (const section of sections) {
      sectionMap.set(section.code.toLowerCase(), section.id);
    }

    return sectionMap;
  }

  private async loadActiveAssignmentsBySectionId(
    schoolId: string,
    semesterId: string,
  ): Promise<Map<string, { id: string; teacherId: string }>> {
    const assignments = await this.prisma.teachingAssignment.findMany({
      where: {
        schoolId,
        status: AcademicEntityStatus.ACTIVE,
        courseSection: {
          semesterId,
        },
      },
      select: {
        id: true,
        teacherId: true,
        courseSectionId: true,
      },
    });

    return new Map(
      assignments.map((assignment) => [
        assignment.courseSectionId,
        { id: assignment.id, teacherId: assignment.teacherId },
      ]),
    );
  }

  private async upsertAssignmentRow(
    tx: Prisma.TransactionClient,
    schoolId: string,
    params: {
      rowNumber: number;
      row: TeachingAssignmentImportRow;
      teacherByEmail: Map<string, string>;
      sectionByCode: Map<string, string>;
      activeAssignmentBySectionId: Map<
        string,
        { id: string; teacherId: string }
      >;
    },
  ): Promise<'created' | 'updated'> {
    const {
      rowNumber,
      row,
      teacherByEmail,
      sectionByCode,
      activeAssignmentBySectionId,
    } = params;

    const teacherId = teacherByEmail.get(row.email_gv.toLowerCase());
    if (!teacherId) {
      throw this.buildValidationException([
        {
          row: rowNumber,
          field: 'email_gv',
          message: `Không tìm thấy giáo viên với email ${row.email_gv}`,
        },
      ]);
    }

    const courseSectionId = sectionByCode.get(row.ma_lop_mon.toLowerCase());
    if (!courseSectionId) {
      throw this.buildValidationException([
        {
          row: rowNumber,
          field: 'ma_lop_mon',
          message: `Không tìm thấy lớp môn ${row.ma_lop_mon} trong học kỳ đã chọn`,
        },
      ]);
    }

    const activeOnSection = activeAssignmentBySectionId.get(courseSectionId);
    if (activeOnSection && activeOnSection.teacherId !== teacherId) {
      throw this.buildValidationException([
        {
          row: rowNumber,
          field: 'ma_lop_mon',
          message: `Lớp môn ${row.ma_lop_mon} đã có giáo viên phân công khác`,
        },
      ]);
    }

    const assignAt = parseIsoDate(row.ngay_phan_cong);

    const existing = await tx.teachingAssignment.findUnique({
      where: {
        teacherId_courseSectionId: {
          teacherId,
          courseSectionId,
        },
      },
    });

    if (existing) {
      if (existing.status === AcademicEntityStatus.ACTIVE) {
        if (
          existing.assignAt.getTime() === assignAt.getTime() &&
          activeOnSection?.id === existing.id
        ) {
          return 'updated';
        }

        await tx.teachingAssignment.update({
          where: { id: existing.id },
          data: { assignAt },
          include: teachingAssignmentInclude,
        });
        return 'updated';
      }

      await tx.teachingAssignment.update({
        where: { id: existing.id },
        data: {
          status: AcademicEntityStatus.ACTIVE,
          assignAt,
          endAt: null,
        },
        include: teachingAssignmentInclude,
      });
      activeAssignmentBySectionId.set(courseSectionId, {
        id: existing.id,
        teacherId,
      });
      return 'updated';
    }

    const created = await tx.teachingAssignment.create({
      data: {
        schoolId,
        teacherId,
        courseSectionId,
        assignAt,
        status: AcademicEntityStatus.ACTIVE,
      },
      include: teachingAssignmentInclude,
    });

    activeAssignmentBySectionId.set(courseSectionId, {
      id: created.id,
      teacherId,
    });
    return 'created';
  }

  private buildValidationException(
    errors: TeachingAssignmentImportRowError[],
  ): AppException {
    return new AppException(
      'IMPORT_VALIDATION_FAILED',
      `Import thất bại: ${errors.length} lỗi`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      errors.map((error) => ({
        field: `${error.row}.${error.field}`,
        message: error.message,
      })),
      {
        successCount: 0,
        errorCount: errors.length,
        created: 0,
        updated: 0,
        errors,
      },
    );
  }
}
