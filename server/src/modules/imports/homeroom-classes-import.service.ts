import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AcademicEntityStatus, Prisma } from '@prisma/client';

import type { EnvConfig } from '@/common/config/env.schema';
import { PrismaService } from '@/common/database/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import type { ParsedSpreadsheetRow } from '@/common/files/file-format.types';
import { parseUploadedSpreadsheet } from '@/common/files/parse-uploaded-file.util';
import {
  homeroomClassImportRowSchema,
  type HomeroomClassImportResult,
  type HomeroomClassImportRow,
  type HomeroomClassImportRowError,
  type ImportHomeroomClassesFormInput,
} from '@/modules/imports/schemas/homeroom-classes-import.schema';
import { validateHomeroomClassImportHeaders } from '@/modules/imports/utils/validate-homeroom-class-import-headers.util';

interface ParsedHomeroomClassImportRow {
  rowNumber: number;
  row: HomeroomClassImportRow;
}

@Injectable()
export class HomeroomClassesImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  async importHomeroomClasses(
    schoolId: string,
    file: Express.Multer.File | undefined,
    form: ImportHomeroomClassesFormInput,
  ): Promise<HomeroomClassImportResult> {
    const parsed = await parseUploadedSpreadsheet(file, {
      maxBytes: this.configService.get('IMPORT_MAX_BYTES', { infer: true }),
      maxRows: this.configService.get('IMPORT_MAX_ROWS', { infer: true }),
    });

    const headerErrors = validateHomeroomClassImportHeaders(parsed.headers);
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

    await this.assertAcademicYearInTenant(schoolId, form.academicYearId);

    const { rows, errors } = this.parseRows(parsed.rows);

    if (errors.length > 0) {
      throw this.buildValidationException(errors);
    }

    errors.push(...this.validateDuplicateCodes(rows));
    if (errors.length > 0) {
      throw this.buildValidationException(errors);
    }

    const [gradeLevelByCode, teacherByEmail] = await Promise.all([
      this.loadGradeLevelsByCode(schoolId),
      this.loadTeachersByEmail(schoolId, rows),
    ]);

    try {
      return await this.prisma.$transaction(async (tx) => {
        let created = 0;
        let updated = 0;

        for (const item of rows) {
          const outcome = await this.upsertHomeroomClassRow(tx, schoolId, {
            rowNumber: item.rowNumber,
            row: item.row,
            academicYearId: form.academicYearId,
            gradeLevelByCode,
            teacherByEmail,
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
          'Dữ liệu import trùng mã lớp hành chính',
          HttpStatus.CONFLICT,
        );
      }

      throw error;
    }
  }

  private parseRows(rows: ParsedSpreadsheetRow[]): {
    rows: ParsedHomeroomClassImportRow[];
    errors: HomeroomClassImportRowError[];
  } {
    const parsedRows: ParsedHomeroomClassImportRow[] = [];
    const errors: HomeroomClassImportRowError[] = [];

    for (const spreadsheetRow of rows) {
      const normalizedData = this.normalizeRowData(spreadsheetRow.data);
      const result = homeroomClassImportRowSchema.safeParse(normalizedData);

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

    for (const key of ['si_so', 'email_gvcn']) {
      if (!normalized[key]) {
        delete normalized[key];
      }
    }

    return normalized;
  }

  private validateDuplicateCodes(
    rows: ParsedHomeroomClassImportRow[],
  ): HomeroomClassImportRowError[] {
    const errors: HomeroomClassImportRowError[] = [];
    const codes = new Map<string, number>();

    for (const item of rows) {
      const codeKey = item.row.ma_lop_hc.toLowerCase();
      const existingRow = codes.get(codeKey);
      if (existingRow !== undefined) {
        errors.push({
          row: item.rowNumber,
          field: 'ma_lop_hc',
          message: `Trùng mã lớp HC với dòng ${existingRow}`,
        });
      } else {
        codes.set(codeKey, item.rowNumber);
      }
    }

    return errors;
  }

  private async assertAcademicYearInTenant(
    schoolId: string,
    academicYearId: string,
  ): Promise<void> {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
      select: { id: true },
    });

    if (!academicYear) {
      throw new AppException(
        'ACADEMIC_YEAR_NOT_FOUND',
        'Không tìm thấy năm học',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private async loadGradeLevelsByCode(
    schoolId: string,
  ): Promise<Map<string, string>> {
    const gradeLevels = await this.prisma.gradeLevel.findMany({
      where: { schoolId },
      select: { id: true, code: true },
    });

    return new Map(
      gradeLevels.map((gradeLevel) => [
        gradeLevel.code.toLowerCase(),
        gradeLevel.id,
      ]),
    );
  }

  private async loadTeachersByEmail(
    schoolId: string,
    rows: ParsedHomeroomClassImportRow[],
  ): Promise<Map<string, string>> {
    const emails = [
      ...new Set(
        rows
          .map((item) => item.row.email_gvcn?.toLowerCase())
          .filter((email): email is string => Boolean(email)),
      ),
    ];

    if (emails.length === 0) {
      return new Map();
    }

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

  private async upsertHomeroomClassRow(
    tx: Prisma.TransactionClient,
    schoolId: string,
    params: {
      rowNumber: number;
      row: HomeroomClassImportRow;
      academicYearId: string;
      gradeLevelByCode: Map<string, string>;
      teacherByEmail: Map<string, string>;
    },
  ): Promise<'created' | 'updated'> {
    const {
      rowNumber,
      row,
      academicYearId,
      gradeLevelByCode,
      teacherByEmail,
    } = params;

    const gradeLevelId = gradeLevelByCode.get(row.ma_khoi.toLowerCase());
    if (!gradeLevelId) {
      throw this.buildValidationException([
        {
          row: rowNumber,
          field: 'ma_khoi',
          message: `Không tìm thấy khối ${row.ma_khoi}`,
        },
      ]);
    }

    let homeroomTeacherId: string | null = null;
    if (row.email_gvcn) {
      const teacherId = teacherByEmail.get(row.email_gvcn.toLowerCase());
      if (!teacherId) {
        throw this.buildValidationException([
          {
            row: rowNumber,
            field: 'email_gvcn',
            message: `Không tìm thấy giáo viên với email ${row.email_gvcn}`,
          },
        ]);
      }
      homeroomTeacherId = teacherId;
    }

    const existing = await tx.homeroomClass.findFirst({
      where: {
        schoolId,
        academicYearId,
        code: row.ma_lop_hc,
      },
    });

    if (!existing) {
      await tx.homeroomClass.create({
        data: {
          schoolId,
          academicYearId,
          gradeLevelId,
          name: row.ten_lop,
          code: row.ma_lop_hc,
          capacity: row.si_so ?? null,
          homeroomTeacherId,
        },
      });
      return 'created';
    }

    await tx.homeroomClass.update({
      where: { id: existing.id },
      data: {
        gradeLevelId,
        name: row.ten_lop,
        capacity: row.si_so ?? null,
        homeroomTeacherId,
      },
    });

    return 'updated';
  }

  private buildValidationException(
    errors: HomeroomClassImportRowError[],
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
