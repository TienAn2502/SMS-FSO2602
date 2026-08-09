import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, UserRole, UserStatus } from '@prisma/client';

import type { EnvConfig } from '@/common/config/env.schema';
import { PrismaService } from '@/common/database/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import type { ParsedSpreadsheetRow } from '@/common/files/file-format.types';
import { parseUploadedSpreadsheet } from '@/common/files/parse-uploaded-file.util';
import { PasswordService } from '@/common/utils/password.service';
import { parseImportBoolean } from '@/modules/imports/utils/parse-import-boolean.util';
import { parseParentImportRelationship } from '@/modules/imports/utils/parse-parent-import-relationship.util';
import { validateParentImportHeaders } from '@/modules/imports/utils/validate-parent-import-headers.util';
import {
  parentImportRowSchema,
  type ParentImportResult,
  type ParentImportRow,
  type ParentImportRowError,
} from '@/modules/imports/schemas/parents-import.schema';

interface ParsedParentImportRow {
  rowNumber: number;
  row: ParentImportRow;
}

@Injectable()
export class ParentsImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  async importParents(
    schoolId: string,
    file: Express.Multer.File | undefined,
  ): Promise<ParentImportResult> {
    const parsed = await parseUploadedSpreadsheet(file, {
      maxBytes: this.configService.get('IMPORT_MAX_BYTES', { infer: true }),
      maxRows: this.configService.get('IMPORT_MAX_ROWS', { infer: true }),
    });

    const headerErrors = validateParentImportHeaders(parsed.headers);
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

    errors.push(...this.validateDuplicateLinks(rows));
    if (errors.length > 0) {
      throw this.buildValidationException(errors);
    }

    const defaultPassword = this.configService.get(
      'IMPORT_DEFAULT_STUDENT_PASSWORD',
      { infer: true },
    );

    const studentByCode = await this.loadStudentsByExternalCode(
      schoolId,
      rows,
    );

    try {
      return await this.prisma.$transaction(async (tx) => {
        let created = 0;
        let updated = 0;

        for (const item of rows) {
          const outcome = await this.upsertParentRow(tx, schoolId, {
            rowNumber: item.rowNumber,
            row: item.row,
            defaultPassword,
            studentByCode,
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
          'Dữ liệu import trùng email hoặc liên kết phụ huynh-học sinh',
          HttpStatus.CONFLICT,
        );
      }

      throw error;
    }
  }

  private parseRows(rows: ParsedSpreadsheetRow[]): {
    rows: ParsedParentImportRow[];
    errors: ParentImportRowError[];
  } {
    const parsedRows: ParsedParentImportRow[] = [];
    const errors: ParentImportRowError[] = [];

    for (const spreadsheetRow of rows) {
      const normalizedData = this.normalizeRowData(spreadsheetRow.data);
      const relationshipRaw = normalizedData.quan_he;
      const relationship = parseParentImportRelationship(relationshipRaw);
      const isPrimaryRaw = normalizedData.lien_he_chinh;
      const isPrimaryContact = parseImportBoolean(isPrimaryRaw);

      if (relationshipRaw?.trim() && !relationship) {
        errors.push({
          row: spreadsheetRow.rowNumber,
          field: 'quan_he',
          message:
            'Quan hệ không hợp lệ (FATHER, MOTHER, GUARDIAN, OTHER hoặc Bố/Mẹ)',
        });
        continue;
      }

      if (isPrimaryRaw?.trim() && isPrimaryContact === undefined) {
        errors.push({
          row: spreadsheetRow.rowNumber,
          field: 'lien_he_chinh',
          message: 'Liên hệ chính không hợp lệ (1/0, có/không)',
        });
        continue;
      }

      if (normalizedData.ma_hs && !relationship) {
        errors.push({
          row: spreadsheetRow.rowNumber,
          field: 'quan_he',
          message: 'Cần quan_he khi có ma_hs',
        });
        continue;
      }

      const result = parentImportRowSchema.safeParse({
        ...normalizedData,
        quan_he: relationship,
        lien_he_chinh: isPrimaryContact,
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
      'phone',
      'email',
      'mat_khau',
      'ma_hs',
      'quan_he',
      'lien_he_chinh',
    ]) {
      if (!normalized[key]) {
        delete normalized[key];
      }
    }

    return normalized;
  }

  private validateDuplicateLinks(
    rows: ParsedParentImportRow[],
  ): ParentImportRowError[] {
    const errors: ParentImportRowError[] = [];
    const linkKeys = new Map<string, number>();

    for (const item of rows) {
      if (!item.row.email || !item.row.ma_hs) {
        continue;
      }

      const key = `${item.row.email.toLowerCase()}::${item.row.ma_hs}`;
      const existingRow = linkKeys.get(key);
      if (existingRow !== undefined) {
        errors.push({
          row: item.rowNumber,
          field: 'ma_hs',
          message: `Trùng liên kết email + ma_hs với dòng ${existingRow}`,
        });
      } else {
        linkKeys.set(key, item.rowNumber);
      }
    }

    return errors;
  }

  private async loadStudentsByExternalCode(
    schoolId: string,
    rows: ParsedParentImportRow[],
  ): Promise<Map<string, string>> {
    const codes = [
      ...new Set(
        rows
          .map((item) => item.row.ma_hs)
          .filter((code): code is string => Boolean(code)),
      ),
    ];

    if (codes.length === 0) {
      return new Map();
    }

    const students = await this.prisma.student.findMany({
      where: {
        schoolId,
        externalCode: { in: codes },
      },
      select: {
        id: true,
        externalCode: true,
      },
    });

    return new Map(
      students
        .filter((student) => student.externalCode)
        .map((student) => [student.externalCode!, student.id]),
    );
  }

  private async upsertParentRow(
    tx: Prisma.TransactionClient,
    schoolId: string,
    params: {
      rowNumber: number;
      row: ParentImportRow;
      defaultPassword: string;
      studentByCode: Map<string, string>;
    },
  ): Promise<'created' | 'updated'> {
    const { rowNumber, row, defaultPassword, studentByCode } = params;

    const existing = row.email
      ? await tx.parent.findFirst({
          where: {
            schoolId,
            user: { email: row.email },
          },
          include: { user: { select: { id: true, email: true } } },
        })
      : null;

    const isCreate = !existing;
    let parentId: string;

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
            role: UserRole.PARENT,
            schoolId,
            status: UserStatus.ACTIVE,
          },
        });
        userId = user.id;
      }

      const parent = await tx.parent.create({
        data: {
          schoolId,
          fullName: row.ho_ten,
          phone: row.phone,
          userId,
        },
      });
      parentId = parent.id;
    } else {
      parentId = existing!.id;

      if (existing!.user && row.email && existing!.user.email !== row.email) {
        throw this.buildValidationException([
          {
            row: rowNumber,
            field: 'email',
            message: 'Phụ huynh đã có tài khoản với email khác',
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
            role: UserRole.PARENT,
            schoolId,
            status: UserStatus.ACTIVE,
          },
        });

        await tx.parent.update({
          where: { id: existing!.id },
          data: { userId: user.id },
        });
      } else if (existing!.user && row.email) {
        await tx.user.update({
          where: { id: existing!.user.id },
          data: { fullName: row.ho_ten },
        });
      }

      await tx.parent.update({
        where: { id: existing!.id },
        data: {
          fullName: row.ho_ten,
          phone: row.phone,
        },
      });
    }

    if (row.ma_hs) {
      const studentId = studentByCode.get(row.ma_hs);
      if (!studentId) {
        throw this.buildValidationException([
          {
            row: rowNumber,
            field: 'ma_hs',
            message: `Không tìm thấy học sinh với mã ${row.ma_hs}`,
          },
        ]);
      }

      await this.ensureStudentLink(tx, {
        rowNumber,
        schoolId,
        parentId,
        studentId,
        relationship: row.quan_he!,
        isPrimaryContact: row.lien_he_chinh ?? false,
      });
    }

    return isCreate ? 'created' : 'updated';
  }

  private async ensureStudentLink(
    tx: Prisma.TransactionClient,
    params: {
      rowNumber: number;
      schoolId: string;
      parentId: string;
      studentId: string;
      relationship: ParentImportRow['quan_he'] & {};
      isPrimaryContact: boolean;
    },
  ): Promise<void> {
    const {
      rowNumber,
      schoolId,
      parentId,
      studentId,
      relationship,
      isPrimaryContact,
    } = params;

    const existingLink = await tx.studentParent.findUnique({
      where: {
        parentId_studentId: {
          parentId,
          studentId,
        },
      },
    });

    if (existingLink) {
      if (isPrimaryContact) {
        await tx.studentParent.updateMany({
          where: { schoolId, studentId },
          data: { isPrimaryContact: false },
        });
      }

      await tx.studentParent.update({
        where: { id: existingLink.id },
        data: {
          relationship,
          ...(isPrimaryContact ? { isPrimaryContact: true } : {}),
        },
      });
      return;
    }

    if (isPrimaryContact) {
      await tx.studentParent.updateMany({
        where: { schoolId, studentId },
        data: { isPrimaryContact: false },
      });
    }

    await tx.studentParent.create({
      data: {
        schoolId,
        parentId,
        studentId,
        relationship,
        isPrimaryContact,
      },
    });
  }

  private buildValidationException(
    errors: ParentImportRowError[],
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
