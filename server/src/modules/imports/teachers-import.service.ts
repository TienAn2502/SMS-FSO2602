import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, UserRole, UserStatus } from '@prisma/client';

import type { EnvConfig } from '@/common/config/env.schema';
import { PrismaService } from '@/common/database/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import type { ParsedSpreadsheetRow } from '@/common/files/file-format.types';
import { parseUploadedSpreadsheet } from '@/common/files/parse-uploaded-file.util';
import { parseIsoDate } from '@/common/schemas/academic.schema';
import { PasswordService } from '@/common/utils/password.service';
import {
  PersonCodeAllocator,
  PersonCodeService,
} from '@/common/utils/person-code.service';
import { parseStudentImportGender } from '@/modules/imports/utils/parse-student-import-gender.util';
import { validateTeacherImportHeaders } from '@/modules/imports/utils/validate-teacher-import-headers.util';
import {
  teacherImportRowSchema,
  type TeacherImportResult,
  type TeacherImportRow,
  type TeacherImportRowError,
} from '@/modules/imports/schemas/teachers-import.schema';

interface ParsedTeacherImportRow {
  rowNumber: number;
  row: TeacherImportRow;
}

@Injectable()
export class TeachersImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly personCodeService: PersonCodeService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  async importTeachers(
    schoolId: string,
    file: Express.Multer.File | undefined,
  ): Promise<TeacherImportResult> {
    const parsed = await parseUploadedSpreadsheet(file, {
      maxBytes: this.configService.get('IMPORT_MAX_BYTES', { infer: true }),
      maxRows: this.configService.get('IMPORT_MAX_ROWS', { infer: true }),
    });

    const headerErrors = validateTeacherImportHeaders(parsed.headers);
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

    const { rows, errors } = this.parseRows(parsed.rows);

    if (errors.length > 0) {
      throw this.buildValidationException(errors);
    }

    errors.push(...this.validateDuplicateEmails(rows));
    if (errors.length > 0) {
      throw this.buildValidationException(errors);
    }

    const defaultPassword = this.configService.get(
      'IMPORT_DEFAULT_STUDENT_PASSWORD',
      { infer: true },
    );

    try {
      return await this.prisma.$transaction(async (tx) => {
        let created = 0;
        let updated = 0;
        const codeAllocator = this.personCodeService.createAllocator(tx);
        await codeAllocator.prepareTeacher(schoolId);

        for (const item of rows) {
          const outcome = await this.upsertTeacherRow(tx, schoolId, {
            rowNumber: item.rowNumber,
            row: item.row,
            defaultPassword,
            codeAllocator,
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
          'Dữ liệu import trùng email hoặc mã giáo viên',
          HttpStatus.CONFLICT,
        );
      }

      throw error;
    }
  }

  private parseRows(rows: ParsedSpreadsheetRow[]): {
    rows: ParsedTeacherImportRow[];
    errors: TeacherImportRowError[];
  } {
    const parsedRows: ParsedTeacherImportRow[] = [];
    const errors: TeacherImportRowError[] = [];

    for (const spreadsheetRow of rows) {
      const normalizedData = this.normalizeRowData(spreadsheetRow.data);
      const genderRaw = normalizedData.gioi_tinh;
      const gender = parseStudentImportGender(genderRaw);

      if (genderRaw?.trim() && !gender) {
        errors.push({
          row: spreadsheetRow.rowNumber,
          field: 'gioi_tinh',
          message: 'Giới tính không hợp lệ (MALE, FEMALE, OTHER, Nam, Nữ)',
        });
        continue;
      }

      const result = teacherImportRowSchema.safeParse({
        ...normalizedData,
        gioi_tinh: gender,
      });

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

    for (const key of [
      'ngay_sinh',
      'gioi_tinh',
      'email',
      'mat_khau',
      'phone',
      'chuyen_mon',
      'dia_chi',
    ]) {
      if (!normalized[key]) {
        delete normalized[key];
      }
    }

    return normalized;
  }

  private validateDuplicateEmails(
    rows: ParsedTeacherImportRow[],
  ): TeacherImportRowError[] {
    const errors: TeacherImportRowError[] = [];
    const emails = new Map<string, number>();

    for (const item of rows) {
      if (!item.row.email) {
        continue;
      }

      const existingRow = emails.get(item.row.email.toLowerCase());
      if (existingRow !== undefined) {
        errors.push({
          row: item.rowNumber,
          field: 'email',
          message: `Trùng email với dòng ${existingRow}`,
        });
      } else {
        emails.set(item.row.email.toLowerCase(), item.rowNumber);
      }
    }

    return errors;
  }

  private async upsertTeacherRow(
    tx: Prisma.TransactionClient,
    schoolId: string,
    params: {
      rowNumber: number;
      row: TeacherImportRow;
      defaultPassword: string;
      codeAllocator: PersonCodeAllocator;
    },
  ): Promise<'created' | 'updated'> {
    const { rowNumber, row, defaultPassword, codeAllocator } = params;

    const existing = row.email
      ? await tx.teacher.findFirst({
          where: {
            schoolId,
            user: { email: row.email },
          },
          include: { user: { select: { id: true, email: true } } },
        })
      : null;

    const isCreate = !existing;

    if (isCreate) {
      let userId: string | undefined;

      if (row.email) {
        const password = row.mat_khau ?? defaultPassword;
        const passwordHash = await this.passwordService.hash(password);
        const user = await tx.user.create({
          data: {
            email: row.email,
            passwordHash,
            fullName: row.ho_ten,
            role: UserRole.TEACHER,
            schoolId,
            status: UserStatus.ACTIVE,
          },
        });
        userId = user.id;
      }

      await tx.teacher.create({
        data: {
          schoolId,
          fullName: row.ho_ten,
          dateOfBirth: row.ngay_sinh ? parseIsoDate(row.ngay_sinh) : undefined,
          gender: row.gioi_tinh,
          phone: row.phone,
          address: row.dia_chi,
          specialization: row.chuyen_mon,
          externalCode: await codeAllocator.nextTeacherCode(schoolId),
          userId,
        },
      });

      return 'created';
    }

    if (existing!.user && row.email && existing!.user.email !== row.email) {
      throw this.buildValidationException([
        {
          row: rowNumber,
          field: 'email',
          message: 'Giáo viên đã có tài khoản với email khác',
        },
      ]);
    }

    if (!existing!.user && row.email) {
      const password = row.mat_khau ?? defaultPassword;
      const passwordHash = await this.passwordService.hash(password);
      const user = await tx.user.create({
        data: {
          email: row.email,
          passwordHash,
          fullName: row.ho_ten,
          role: UserRole.TEACHER,
          schoolId,
          status: UserStatus.ACTIVE,
        },
      });

      await tx.teacher.update({
        where: { id: existing!.id },
        data: { userId: user.id },
      });
    } else if (existing!.user && row.email) {
      await tx.user.update({
        where: { id: existing!.user.id },
        data: { fullName: row.ho_ten },
      });
    }

    await tx.teacher.update({
      where: { id: existing!.id },
      data: {
        fullName: row.ho_ten,
        dateOfBirth: row.ngay_sinh ? parseIsoDate(row.ngay_sinh) : undefined,
        gender: row.gioi_tinh,
        phone: row.phone,
        address: row.dia_chi,
        specialization: row.chuyen_mon,
        ...(!existing!.externalCode
          ? { externalCode: await codeAllocator.nextTeacherCode(schoolId) }
          : {}),
      },
    });

    return 'updated';
  }

  private buildValidationException(
    errors: TeacherImportRowError[],
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
