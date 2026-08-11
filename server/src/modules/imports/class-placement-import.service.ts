import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AcademicEntityStatus,
  EnrollmentStatus,
  Prisma,
  UserRole,
  UserStatus,
} from '@prisma/client';

import type { EnvConfig } from '@/common/config/env.schema';
import { PrismaService } from '@/common/database/prisma.service';
import type { PrismaTransactionClient } from '@/common/database/prisma-transaction.type';
import { AppException } from '@/common/exceptions/app.exception';
import { detectImportFileFormat } from '@/common/files/detect-file-format.util';
import { parseMultiSheetXlsxBuffer } from '@/common/files/parse-multi-sheet-xlsx.util';
import { parseIsoDate } from '@/common/schemas/academic.schema';
import { PasswordService } from '@/common/utils/password.service';
import {
  PersonCodeAllocator,
  PersonCodeService,
} from '@/common/utils/person-code.service';
import { CLASS_PLACEMENT_IMPORT_REQUIRED_HEADERS } from '@/modules/imports/constants/class-placement-import.constants';
import {
  classPlacementImportRowSchema,
  type ClassPlacementImportResult,
  type ClassPlacementImportRow,
  type ClassPlacementImportRowError,
  type ImportClassPlacementFormInput,
} from '@/modules/imports/schemas/class-placement-import.schema';
import { parseStudentImportGender } from '@/modules/imports/utils/parse-student-import-gender.util';
import { resolveGradeLevelCodeFromClassCode } from '@/modules/imports/utils/resolve-grade-from-class-code.util';

type SheetStudentRow = {
  sheet: string;
  rowNumber: number;
  row: ClassPlacementImportRow;
};

type CachedStudent = {
  id: string;
  externalCode: string | null;
  user: { id: string; email: string } | null;
};

type CachedEnrollment = {
  studentId: string;
  homeroomClassId: string;
};

@Injectable()
export class ClassPlacementImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly personCodeService: PersonCodeService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  async importClassPlacement(
    schoolId: string,
    file: Express.Multer.File | undefined,
    form: ImportClassPlacementFormInput,
  ): Promise<ClassPlacementImportResult> {
    if (!file) {
      throw new AppException(
        'VALIDATION_ERROR',
        'File upload là bắt buộc',
        HttpStatus.BAD_REQUEST,
      );
    }

    const maxBytes = this.configService.get('IMPORT_MAX_BYTES', {
      infer: true,
    });
    if (file.size > maxBytes) {
      throw new AppException(
        'FILE_TOO_LARGE',
        'File vượt quá giới hạn dung lượng cho phép',
        HttpStatus.BAD_REQUEST,
      );
    }

    const format = detectImportFileFormat(file);
    if (format !== 'xlsx') {
      throw new AppException(
        'UNSUPPORTED_FILE_FORMAT',
        'Import chia lớp chỉ hỗ trợ file .xlsx (mỗi sheet một lớp)',
        HttpStatus.BAD_REQUEST,
      );
    }

    const semester = await this.prisma.semester.findFirst({
      where: {
        id: form.semesterId,
        schoolId,
        academicYearId: form.academicYearId,
      },
      select: { id: true, startDate: true, academicYearId: true },
    });

    if (!semester) {
      throw new AppException(
        'SEMESTER_NOT_FOUND',
        'Học kỳ không thuộc năm học đã chọn',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    let sheets;
    try {
      sheets = await parseMultiSheetXlsxBuffer(file.buffer);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'WORKSHEET_EMPTY') {
        throw new AppException(
          'WORKSHEET_EMPTY',
          'File Excel không có sheet lớp nào',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new AppException(
        'FILE_PARSE_ERROR',
        'Không đọc được nội dung file',
        HttpStatus.BAD_REQUEST,
      );
    }

    const maxRows = this.configService.get('IMPORT_MAX_ROWS', { infer: true });
    const totalRows = sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0);
    if (totalRows > maxRows) {
      throw new AppException(
        'IMPORT_TOO_MANY_ROWS',
        `File vượt quá ${maxRows} dòng dữ liệu cho phép`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const parseErrors: ClassPlacementImportRowError[] = [];
    const parsedRows: SheetStudentRow[] = [];

    for (const sheet of sheets) {
      if (!sheet.sheetName) {
        parseErrors.push({
          sheet: '(không tên)',
          row: 1,
          field: 'sheet',
          message: 'Tên sheet không hợp lệ — đặt tên sheet = mã lớp (vd. 10A1)',
        });
        continue;
      }

      for (const required of CLASS_PLACEMENT_IMPORT_REQUIRED_HEADERS) {
        if (!sheet.headers.includes(required)) {
          parseErrors.push({
            sheet: sheet.sheetName,
            row: 1,
            field: required,
            message: `Thiếu cột bắt buộc "${required}"`,
          });
        }
      }

      for (const spreadsheetRow of sheet.rows) {
        const normalized = this.normalizeRowData(spreadsheetRow.data);
        const genderRaw = normalized.gioi_tinh;
        if (genderRaw !== undefined) {
          const parsedGender = parseStudentImportGender(genderRaw);
          if (parsedGender) {
            normalized.gioi_tinh = parsedGender;
          } else if (genderRaw) {
            parseErrors.push({
              sheet: sheet.sheetName,
              row: spreadsheetRow.rowNumber,
              field: 'gioi_tinh',
              message: 'Giới tính không hợp lệ (Nam/Nữ hoặc MALE/FEMALE)',
            });
            continue;
          } else {
            delete normalized.gioi_tinh;
          }
        }

        const result = classPlacementImportRowSchema.safeParse(normalized);
        if (!result.success) {
          for (const issue of result.error.issues) {
            parseErrors.push({
              sheet: sheet.sheetName,
              row: spreadsheetRow.rowNumber,
              field: String(issue.path[0] ?? 'row'),
              message: issue.message,
            });
          }
          continue;
        }

        parsedRows.push({
          sheet: sheet.sheetName,
          rowNumber: spreadsheetRow.rowNumber,
          row: result.data,
        });
      }
    }

    parseErrors.push(...this.validateDuplicateKeys(parsedRows));

    if (parseErrors.length > 0) {
      throw this.buildValidationException(parseErrors);
    }

    const gradeLevels = await this.prisma.gradeLevel.findMany({
      where: { schoolId },
      select: { id: true, code: true },
    });
    const gradeIdByCode = new Map(
      gradeLevels.map((row) => [row.code, row.id] as const),
    );
    const gradeCodes = gradeLevels.map((row) => row.code);

    const defaultPassword = this.configService.get(
      'IMPORT_DEFAULT_STUDENT_PASSWORD',
      { infer: true },
    );

    const defaultPasswordHash =
      await this.passwordService.hash(defaultPassword);
    const customPasswordHashes = new Map<string, string>();
    for (const item of parsedRows) {
      if (!item.row.mat_khau || customPasswordHashes.has(item.row.mat_khau)) {
        continue;
      }
      customPasswordHashes.set(
        item.row.mat_khau,
        await this.passwordService.hash(item.row.mat_khau),
      );
    }

    const sheetCodes = [...new Set(parsedRows.map((row) => row.sheet))];
    const externalCodes = [
      ...new Set(
        parsedRows
          .map((item) => item.row.external_code)
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const emails = [
      ...new Set(
        parsedRows
          .map((item) => item.row.email?.toLowerCase())
          .filter((value): value is string => Boolean(value)),
      ),
    ];

    const studentWhereOr: Prisma.StudentWhereInput[] = [];
    if (externalCodes.length > 0) {
      studentWhereOr.push({ externalCode: { in: externalCodes } });
    }
    if (emails.length > 0) {
      studentWhereOr.push({
        user: { email: { in: emails, mode: 'insensitive' } },
      });
    }

    const [existingClasses, existingStudents] = await Promise.all([
      this.prisma.homeroomClass.findMany({
        where: {
          schoolId,
          academicYearId: form.academicYearId,
          code: { in: sheetCodes },
        },
        select: { id: true, code: true },
      }),
      studentWhereOr.length > 0
        ? this.prisma.student.findMany({
            where: { schoolId, OR: studentWhereOr },
            select: {
              id: true,
              externalCode: true,
              user: { select: { id: true, email: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const studentByCode = new Map<string, CachedStudent>();
    const studentByEmail = new Map<string, CachedStudent>();
    for (const student of existingStudents) {
      const cached: CachedStudent = {
        id: student.id,
        externalCode: student.externalCode,
        user: student.user,
      };
      if (student.externalCode) {
        studentByCode.set(student.externalCode, cached);
      }
      if (student.user?.email) {
        studentByEmail.set(student.user.email.toLowerCase(), cached);
      }
    }

    const existingStudentIds = [
      ...new Set(existingStudents.map((row) => row.id)),
    ];
    const existingEnrollments =
      existingStudentIds.length > 0
        ? await this.prisma.studentEnrollment.findMany({
            where: {
              schoolId,
              semesterId: semester.id,
              studentId: { in: existingStudentIds },
              status: EnrollmentStatus.ACTIVE,
            },
            select: { studentId: true, homeroomClassId: true },
          })
        : [];

    const enrollmentByStudentId = new Map<string, CachedEnrollment>(
      existingEnrollments.map((row) => [
        row.studentId,
        { studentId: row.studentId, homeroomClassId: row.homeroomClassId },
      ]),
    );

    const transactionTimeoutMs = Math.min(
      300_000,
      30_000 + parsedRows.length * 1_000,
    );

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          let created = 0;
          let updated = 0;
          let classesCreated = 0;

          const classIdByCode = new Map(
            existingClasses.map((row) => [row.code, row.id] as const),
          );
          const classesExisting = classIdByCode.size;
          const codeAllocator = this.personCodeService.createAllocator(tx);
          await codeAllocator.prepareStudent(
            schoolId,
            parsedRows.map((item) => item.row.external_code),
          );

          for (const classCode of sheetCodes) {
            if (classIdByCode.has(classCode)) {
              continue;
            }

            const gradeCode = resolveGradeLevelCodeFromClassCode(
              classCode,
              gradeCodes,
            );
            const gradeLevelId = gradeCode
              ? gradeIdByCode.get(gradeCode)
              : undefined;

            if (!gradeLevelId) {
              throw this.buildValidationException([
                {
                  sheet: classCode,
                  row: 1,
                  field: 'sheet',
                  message: `Không suy ra được khối từ mã lớp "${classCode}" — dùng mã dạng 10A1 khớp khối của trường`,
                },
              ]);
            }

            const createdClass = await tx.homeroomClass.create({
              data: {
                schoolId,
                academicYearId: form.academicYearId,
                gradeLevelId,
                code: classCode,
                name: classCode,
                status: AcademicEntityStatus.ACTIVE,
              },
            });
            classIdByCode.set(classCode, createdClass.id);
            classesCreated += 1;
          }

          for (const item of parsedRows) {
            const homeroomClassId = classIdByCode.get(item.sheet);
            if (!homeroomClassId) {
              throw this.buildValidationException([
                {
                  sheet: item.sheet,
                  row: item.rowNumber,
                  field: 'sheet',
                  message: `Không tìm thấy lớp ${item.sheet}`,
                },
              ]);
            }

            const passwordHash = item.row.mat_khau
              ? (customPasswordHashes.get(item.row.mat_khau) ??
                defaultPasswordHash)
              : defaultPasswordHash;

            const outcome = await this.upsertStudentRow(tx, schoolId, {
              sheet: item.sheet,
              rowNumber: item.rowNumber,
              row: item.row,
              homeroomClassId,
              semesterId: semester.id,
              enrolledAt: semester.startDate,
              passwordHash,
              studentByCode,
              studentByEmail,
              enrollmentByStudentId,
              codeAllocator,
            });

            if (outcome === 'created') {
              created += 1;
            } else {
              updated += 1;
            }
          }

          return {
            successCount: parsedRows.length,
            errorCount: 0,
            created,
            updated,
            classesCreated,
            classesExisting,
            errors: [],
          };
        },
        {
          maxWait: 15_000,
          timeout: transactionTimeoutMs,
        },
      );
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
          'Dữ liệu import trùng email hoặc mã học sinh',
          HttpStatus.CONFLICT,
        );
      }

      throw error;
    }
  }

  private normalizeRowData(
    data: Record<string, string>,
  ): Record<string, string> {
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
    rows: SheetStudentRow[],
  ): ClassPlacementImportRowError[] {
    const errors: ClassPlacementImportRowError[] = [];
    const externalCodes = new Map<string, { sheet: string; row: number }>();
    const emails = new Map<string, { sheet: string; row: number }>();

    for (const item of rows) {
      if (item.row.external_code) {
        const existing = externalCodes.get(item.row.external_code);
        if (existing) {
          errors.push({
            sheet: item.sheet,
            row: item.rowNumber,
            field: 'external_code',
            message: `Trùng mã external_code với sheet ${existing.sheet} dòng ${existing.row}`,
          });
        } else {
          externalCodes.set(item.row.external_code, {
            sheet: item.sheet,
            row: item.rowNumber,
          });
        }
      }

      if (item.row.email) {
        const key = item.row.email.toLowerCase();
        const existing = emails.get(key);
        if (existing) {
          errors.push({
            sheet: item.sheet,
            row: item.rowNumber,
            field: 'email',
            message: `Trùng email với sheet ${existing.sheet} dòng ${existing.row}`,
          });
        } else {
          emails.set(key, { sheet: item.sheet, row: item.rowNumber });
        }
      }
    }

    return errors;
  }

  private async upsertStudentRow(
    tx: PrismaTransactionClient,
    schoolId: string,
    params: {
      sheet: string;
      rowNumber: number;
      row: ClassPlacementImportRow;
      homeroomClassId: string;
      semesterId: string;
      enrolledAt: Date;
      passwordHash: string;
      studentByCode: Map<string, CachedStudent>;
      studentByEmail: Map<string, CachedStudent>;
      enrollmentByStudentId: Map<string, CachedEnrollment>;
      codeAllocator: PersonCodeAllocator;
    },
  ): Promise<'created' | 'updated'> {
    const {
      sheet,
      rowNumber,
      row,
      homeroomClassId,
      semesterId,
      enrolledAt,
      passwordHash,
      studentByCode,
      studentByEmail,
      enrollmentByStudentId,
      codeAllocator,
    } = params;

    const existingByCode = row.external_code
      ? (studentByCode.get(row.external_code) ?? null)
      : null;
    const existingByEmail = row.email
      ? (studentByEmail.get(row.email.toLowerCase()) ?? null)
      : null;

    if (
      existingByCode &&
      existingByEmail &&
      existingByCode.id !== existingByEmail.id
    ) {
      throw this.buildValidationException([
        {
          sheet,
          row: rowNumber,
          field: 'external_code',
          message: 'external_code và email thuộc hai học sinh khác nhau',
        },
      ]);
    }

    const existing = existingByCode ?? existingByEmail;

    if (!existing) {
      let userId: string | undefined;

      if (row.email) {
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

      const externalCode =
        row.external_code ?? (await codeAllocator.nextStudentCode(schoolId));

      const student = await tx.student.create({
        data: {
          schoolId,
          fullName: row.ho_ten,
          dateOfBirth: parseIsoDate(row.ngay_sinh),
          gender: row.gioi_tinh,
          externalCode,
          userId,
        },
      });

      const cached: CachedStudent = {
        id: student.id,
        externalCode: student.externalCode,
        user: userId && row.email ? { id: userId, email: row.email } : null,
      };
      if (externalCode) {
        studentByCode.set(externalCode, cached);
      }
      if (row.email) {
        studentByEmail.set(row.email.toLowerCase(), cached);
      }

      await this.ensureEnrollment(tx, {
        sheet,
        rowNumber,
        schoolId,
        studentId: student.id,
        semesterId,
        homeroomClassId,
        enrolledAt,
        enrollmentByStudentId,
      });

      return 'created';
    }

    if (
      row.external_code &&
      existing.externalCode &&
      existing.externalCode !== row.external_code
    ) {
      throw this.buildValidationException([
        {
          sheet,
          row: rowNumber,
          field: 'external_code',
          message: 'Không thể đổi mã external_code của học sinh đã tồn tại',
        },
      ]);
    }

    if (existing.user && row.email && existing.user.email !== row.email) {
      throw this.buildValidationException([
        {
          sheet,
          row: rowNumber,
          field: 'email',
          message: 'Học sinh đã có tài khoản với email khác',
        },
      ]);
    }

    const externalCodeToSet = !existing.externalCode
      ? (row.external_code ??
        (await codeAllocator.nextStudentCode(schoolId)))
      : undefined;

    if (!existing.user && row.email) {
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
        data: {
          userId: user.id,
          fullName: row.ho_ten,
          dateOfBirth: parseIsoDate(row.ngay_sinh),
          gender: row.gioi_tinh,
          ...(externalCodeToSet ? { externalCode: externalCodeToSet } : {}),
        },
      });
      existing.user = { id: user.id, email: row.email };
      if (externalCodeToSet) {
        existing.externalCode = externalCodeToSet;
        studentByCode.set(externalCodeToSet, existing);
      }
      studentByEmail.set(row.email.toLowerCase(), existing);
    } else {
      if (existing.user && row.email) {
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
          ...(externalCodeToSet ? { externalCode: externalCodeToSet } : {}),
        },
      });

      if (externalCodeToSet) {
        existing.externalCode = externalCodeToSet;
        studentByCode.set(externalCodeToSet, existing);
      }
    }

    await this.ensureEnrollment(tx, {
      sheet,
      rowNumber,
      schoolId,
      studentId: existing.id,
      semesterId,
      homeroomClassId,
      enrolledAt,
      enrollmentByStudentId,
    });

    return 'updated';
  }

  private async ensureEnrollment(
    tx: PrismaTransactionClient,
    params: {
      sheet: string;
      rowNumber: number;
      schoolId: string;
      studentId: string;
      semesterId: string;
      homeroomClassId: string;
      enrolledAt: Date;
      enrollmentByStudentId: Map<string, CachedEnrollment>;
    },
  ): Promise<void> {
    const {
      sheet,
      rowNumber,
      schoolId,
      studentId,
      semesterId,
      homeroomClassId,
      enrolledAt,
      enrollmentByStudentId,
    } = params;

    const activeEnrollment = enrollmentByStudentId.get(studentId);

    if (!activeEnrollment) {
      await tx.studentEnrollment.create({
        data: {
          schoolId,
          studentId,
          semesterId,
          homeroomClassId,
          enrolledAt,
          note: `Import chia lớp sheet ${sheet}`,
          status: EnrollmentStatus.ACTIVE,
        },
      });
      enrollmentByStudentId.set(studentId, {
        studentId,
        homeroomClassId,
      });
      return;
    }

    if (activeEnrollment.homeroomClassId === homeroomClassId) {
      return;
    }

    throw this.buildValidationException([
      {
        sheet,
        row: rowNumber,
        field: 'sheet',
        message:
          'Học sinh đã ghi danh lớp khác trong học kỳ này — hãy chuyển lớp trên hệ thống',
      },
    ]);
  }

  private buildValidationException(
    errors: ClassPlacementImportRowError[],
  ): AppException {
    return new AppException(
      'IMPORT_VALIDATION_FAILED',
      `Import thất bại: ${errors.length} lỗi`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      errors.map((error) => ({
        field: `${error.sheet}:${error.row}.${error.field}`,
        message: error.message,
      })),
      {
        successCount: 0,
        errorCount: errors.length,
        created: 0,
        updated: 0,
        classesCreated: 0,
        classesExisting: 0,
        errors,
      },
    );
  }
}
