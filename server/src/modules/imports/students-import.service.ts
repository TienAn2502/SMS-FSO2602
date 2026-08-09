import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EnrollmentStatus,
  Prisma,
  UserRole,
  UserStatus,
} from '@prisma/client';

import type { EnvConfig } from '@/common/config/env.schema';
import { PrismaService } from '@/common/database/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import { parseUploadedSpreadsheet } from '@/common/files/parse-uploaded-file.util';
import type { ParsedSpreadsheetRow } from '@/common/files/file-format.types';
import { parseIsoDate } from '@/common/schemas/academic.schema';
import { PasswordService } from '@/common/utils/password.service';
import {
  ImportStudentsFormInput,
  StudentImportResult,
  StudentImportRow,
  StudentImportRowError,
} from '@/modules/imports/schemas/students-import.schema';
import { studentImportRowSchema } from '@/modules/imports/schemas/students-import.schema';
import { parseStudentImportGender } from '@/modules/imports/utils/parse-student-import-gender.util';
import { validateStudentImportHeaders } from '@/modules/imports/utils/validate-student-import-headers.util';

interface ResolvedImportContext {
  semesterId: string;
  enrolledAt: Date;
  homeroomClassByCode: Map<string, string>;
}

interface ParsedStudentImportRow {
  rowNumber: number;
  row: StudentImportRow;
}

@Injectable()
export class StudentsImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  async importStudents(
    schoolId: string,
    file: Express.Multer.File | undefined,
    form: ImportStudentsFormInput,
  ): Promise<StudentImportResult> {
    const parsed = await parseUploadedSpreadsheet(file, {
      maxBytes: this.configService.get('IMPORT_MAX_BYTES', { infer: true }),
      maxRows: this.configService.get('IMPORT_MAX_ROWS', { infer: true }),
    });

    const headerErrors = validateStudentImportHeaders(parsed.headers);
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

    const context = await this.resolveContext(schoolId, form);
    const { rows, errors } = this.parseRows(parsed.rows);

    if (errors.length > 0) {
      throw this.buildValidationException(errors);
    }

    errors.push(...this.validateDuplicateKeys(rows));
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

        for (const item of rows) {
          const homeroomClassId = context.homeroomClassByCode.get(
            item.row.ma_lop_hc,
          );

          if (!homeroomClassId) {
            throw this.buildValidationException([
              {
                row: item.rowNumber,
                field: 'ma_lop_hc',
                message: `Không tìm thấy lớp ${item.row.ma_lop_hc} trong năm học đã chọn`,
              },
            ]);
          }

          const outcome = await this.upsertStudentRow(tx, schoolId, {
            rowNumber: item.rowNumber,
            row: item.row,
            homeroomClassId,
            semesterId: context.semesterId,
            enrolledAt: context.enrolledAt,
            defaultPassword,
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
      if (error instanceof AppException && error.code === 'IMPORT_VALIDATION_FAILED') {
        throw error;
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new AppException(
          'IMPORT_CONFLICT',
          'Dữ liệu import trùng email hoặc mã học sinh',
          HttpStatus.CONFLICT,
        );
      }

      throw error;
    }
  }

  private parseRows(rows: ParsedSpreadsheetRow[]): {
    rows: ParsedStudentImportRow[];
    errors: StudentImportRowError[];
  } {
    const parsedRows: ParsedStudentImportRow[] = [];
    const errors: StudentImportRowError[] = [];

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

      const result = studentImportRowSchema.safeParse({
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

      if (result.data.email && result.data.mat_khau === undefined) {
        parsedRows.push({
          rowNumber: spreadsheetRow.rowNumber,
          row: result.data,
        });
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

    for (const key of ['gioi_tinh', 'email', 'mat_khau', 'external_code']) {
      if (!normalized[key]) {
        delete normalized[key];
      }
    }

    return normalized;
  }

  private validateDuplicateKeys(
    rows: ParsedStudentImportRow[],
  ): StudentImportRowError[] {
    const errors: StudentImportRowError[] = [];
    const externalCodes = new Map<string, number>();
    const emails = new Map<string, number>();

    for (const item of rows) {
      if (item.row.external_code) {
        const existingRow = externalCodes.get(item.row.external_code);
        if (existingRow !== undefined) {
          errors.push({
            row: item.rowNumber,
            field: 'external_code',
            message: `Trùng mã external_code với dòng ${existingRow}`,
          });
        } else {
          externalCodes.set(item.row.external_code, item.rowNumber);
        }
      }

      if (item.row.email) {
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
    }

    return errors;
  }

  private async resolveContext(
    schoolId: string,
    form: ImportStudentsFormInput,
  ): Promise<ResolvedImportContext> {
    const semester = await this.prisma.semester.findFirst({
      where: {
        id: form.semesterId,
        schoolId,
        academicYearId: form.academicYearId,
      },
      select: {
        id: true,
        startDate: true,
      },
    });

    if (!semester) {
      throw new AppException(
        'SEMESTER_NOT_FOUND',
        'Học kỳ không thuộc năm học đã chọn',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const homeroomClasses = await this.prisma.homeroomClass.findMany({
      where: {
        schoolId,
        academicYearId: form.academicYearId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        code: true,
      },
    });

    return {
      semesterId: semester.id,
      enrolledAt: semester.startDate,
      homeroomClassByCode: new Map(
        homeroomClasses.map((homeroomClass) => [
          homeroomClass.code,
          homeroomClass.id,
        ]),
      ),
    };
  }

  private async upsertStudentRow(
    tx: Prisma.TransactionClient,
    schoolId: string,
    params: {
      rowNumber: number;
      row: StudentImportRow;
      homeroomClassId: string;
      semesterId: string;
      enrolledAt: Date;
      defaultPassword: string;
    },
  ): Promise<'created' | 'updated'> {
    const { rowNumber, row, homeroomClassId, semesterId, enrolledAt, defaultPassword } =
      params;

    const existingByCode = row.external_code
      ? await tx.student.findFirst({
          where: { schoolId, externalCode: row.external_code },
          include: { user: { select: { id: true, email: true } } },
        })
      : null;

    const existingByEmail = row.email
      ? await tx.student.findFirst({
          where: {
            schoolId,
            user: { email: row.email },
          },
          include: { user: { select: { id: true, email: true } } },
        })
      : null;

    if (
      existingByCode &&
      existingByEmail &&
      existingByCode.id !== existingByEmail.id
    ) {
      throw this.buildValidationException([
        {
          row: rowNumber,
          field: 'external_code',
          message: 'external_code và email thuộc hai học sinh khác nhau',
        },
      ]);
    }

    const existing = existingByCode ?? existingByEmail;
    const isCreate = !existing;

    if (
      !isCreate &&
      row.external_code &&
      existing.externalCode &&
      existing.externalCode !== row.external_code
    ) {
      throw this.buildValidationException([
        {
          row: rowNumber,
          field: 'external_code',
          message: 'Không thể đổi mã external_code của học sinh đã tồn tại',
        },
      ]);
    }

    if (isCreate) {
      const password = row.email
        ? (row.mat_khau ?? defaultPassword)
        : undefined;

      let userId: string | undefined;

      if (row.email && password) {
        const passwordHash = await this.passwordService.hash(password);
        const user = await tx.user.create({
          data: {
            email: row.email,
            passwordHash,
            fullName: row.ho_ten,
            role: UserRole.STUDENT,
            schoolId,
            status: UserStatus.ACTIVE,
          },
        });
        userId = user.id;
      }

      const student = await tx.student.create({
        data: {
          schoolId,
          fullName: row.ho_ten,
          dateOfBirth: parseIsoDate(row.ngay_sinh),
          gender: row.gioi_tinh,
          externalCode: row.external_code,
          userId,
        },
      });

      await this.ensureEnrollment(tx, {
        rowNumber,
        schoolId,
        studentId: student.id,
        semesterId,
        homeroomClassId,
        enrolledAt,
      });

      return 'created';
    }

    if (existing.user && row.email && existing.user.email !== row.email) {
      throw this.buildValidationException([
        {
          row: rowNumber,
          field: 'email',
          message: 'Học sinh đã có tài khoản với email khác',
        },
      ]);
    }

    if (!existing.user && row.email) {
      const password = row.mat_khau ?? defaultPassword;
      const passwordHash = await this.passwordService.hash(password);
      const user = await tx.user.create({
        data: {
          email: row.email,
          passwordHash,
          fullName: row.ho_ten,
          role: UserRole.STUDENT,
          schoolId,
          status: UserStatus.ACTIVE,
        },
      });

      await tx.student.update({
        where: { id: existing.id },
        data: { userId: user.id },
      });
    } else if (existing.user && row.email) {
      await tx.user.update({
        where: { id: existing.user.id },
        data: { fullName: row.ho_ten },
      });
    }

    await tx.student.update({
      where: { id: existing.id },
      data: {
        fullName: row.ho_ten,
        dateOfBirth: parseIsoDate(row.ngay_sinh),
        gender: row.gioi_tinh,
        ...(row.external_code && !existing.externalCode
          ? { externalCode: row.external_code }
          : {}),
      },
    });

    await this.ensureEnrollment(tx, {
      rowNumber,
      schoolId,
      studentId: existing.id,
      semesterId,
      homeroomClassId,
      enrolledAt,
    });

    return 'updated';
  }

  private async ensureEnrollment(
    tx: Prisma.TransactionClient,
    params: {
      rowNumber: number;
      schoolId: string;
      studentId: string;
      semesterId: string;
      homeroomClassId: string;
      enrolledAt: Date;
    },
  ): Promise<void> {
    const { rowNumber, schoolId, studentId, semesterId, homeroomClassId, enrolledAt } =
      params;

    const activeEnrollment = await tx.studentEnrollment.findFirst({
      where: {
        schoolId,
        studentId,
        semesterId,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    if (!activeEnrollment) {
      await tx.studentEnrollment.create({
        data: {
          schoolId,
          studentId,
          semesterId,
          homeroomClassId,
          enrolledAt,
          status: EnrollmentStatus.ACTIVE,
        },
      });
      return;
    }

    if (activeEnrollment.homeroomClassId === homeroomClassId) {
      return;
    }

    throw this.buildValidationException([
      {
        row: rowNumber,
        field: 'ma_lop_hc',
        message:
          'Học sinh đã ghi danh lớp khác trong học kỳ này — hãy chuyển lớp trên hệ thống',
      },
    ]);
  }

  private buildValidationException(errors: StudentImportRowError[]): AppException {
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
