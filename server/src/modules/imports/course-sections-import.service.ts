import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AcademicEntityStatus, Prisma } from '@prisma/client';

import type { EnvConfig } from '@/common/config/env.schema';
import { PrismaService } from '@/common/database/prisma.service';
import type { PrismaTransactionClient } from '@/common/database/prisma-transaction.type';
import { AppException } from '@/common/exceptions/app.exception';
import { detectImportFileFormat } from '@/common/files/detect-file-format.util';
import { parseMultiSheetXlsxBuffer } from '@/common/files/parse-multi-sheet-xlsx.util';
import {
  buildCourseSectionCode,
  buildCourseSectionName,
  COURSE_SECTION_IMPORT_REQUIRED_HEADERS,
} from '@/modules/imports/constants/course-sections-import.constants';
import {
  courseSectionImportRowSchema,
  type CourseSectionImportResult,
  type CourseSectionImportRow,
  type CourseSectionImportRowError,
  type ImportCourseSectionsFormInput,
} from '@/modules/imports/schemas/course-sections-import.schema';

type SheetRow = {
  sheet: string;
  rowNumber: number;
  row: CourseSectionImportRow;
};

type HomeroomCache = {
  id: string;
  code: string;
  gradeLevelId: string;
};

type GlsCache = {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
};

@Injectable()
export class CourseSectionsImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  async importCourseSections(
    schoolId: string,
    file: Express.Multer.File | undefined,
    form: ImportCourseSectionsFormInput,
  ): Promise<CourseSectionImportResult> {
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
        'Import lớp môn chỉ hỗ trợ file .xlsx (mỗi sheet một lớp HC)',
        HttpStatus.BAD_REQUEST,
      );
    }

    const semester = await this.prisma.semester.findFirst({
      where: { id: form.semesterId, schoolId },
      select: {
        id: true,
        startDate: true,
        academicYearId: true,
      },
    });

    if (!semester) {
      throw new AppException(
        'SEMESTER_NOT_FOUND',
        'Không tìm thấy học kỳ',
        HttpStatus.NOT_FOUND,
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

    const parseErrors: CourseSectionImportRowError[] = [];
    const parsedRows: SheetRow[] = [];

    for (const sheet of sheets) {
      if (!sheet.sheetName) {
        parseErrors.push({
          sheet: '(không tên)',
          row: 1,
          field: 'sheet',
          message:
            'Tên sheet không hợp lệ — đặt tên sheet = mã lớp HC (vd. 10A1)',
        });
        continue;
      }

      for (const required of COURSE_SECTION_IMPORT_REQUIRED_HEADERS) {
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
        const result = courseSectionImportRowSchema.safeParse(normalized);
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

    if (parsedRows.length === 0) {
      throw new AppException(
        'IMPORT_EMPTY',
        'File không có dữ liệu để import',
        HttpStatus.BAD_REQUEST,
      );
    }

    const sheetCodes = [...new Set(parsedRows.map((row) => row.sheet))];
    const subjectCodes = [
      ...new Set(parsedRows.map((row) => row.row.ma_mon.toUpperCase())),
    ];
    const teacherEmails = [
      ...new Set(
        parsedRows
          .map((row) => row.row.email_gv?.toLowerCase())
          .filter((value): value is string => Boolean(value)),
      ),
    ];

    const [homeroomClasses, subjects, teachers] = await Promise.all([
      this.prisma.homeroomClass.findMany({
        where: {
          schoolId,
          academicYearId: semester.academicYearId,
          code: { in: sheetCodes },
          status: AcademicEntityStatus.ACTIVE,
        },
        select: {
          id: true,
          code: true,
          gradeLevelId: true,
        },
      }),
      this.prisma.subject.findMany({
        where: {
          schoolId,
          code: { in: subjectCodes, mode: 'insensitive' },
          status: AcademicEntityStatus.ACTIVE,
        },
        select: { id: true, code: true, name: true },
      }),
      teacherEmails.length > 0
        ? this.prisma.teacher.findMany({
            where: {
              schoolId,
              status: AcademicEntityStatus.ACTIVE,
              user: {
                email: { in: teacherEmails, mode: 'insensitive' },
              },
            },
            select: {
              id: true,
              user: { select: { email: true } },
            },
          })
        : Promise.resolve(
            [] as Array<{ id: string; user: { email: string } | null }>,
          ),
    ]);

    const homeroomByCode = new Map(
      homeroomClasses.map(
        (row) =>
          [
            row.code,
            {
              id: row.id,
              code: row.code,
              gradeLevelId: row.gradeLevelId,
            } satisfies HomeroomCache,
          ] as const,
      ),
    );

    for (const code of sheetCodes) {
      if (!homeroomByCode.has(code)) {
        throw this.buildValidationException([
          {
            sheet: code,
            row: 1,
            field: 'sheet',
            message: `Không tìm thấy lớp HC "${code}" ACTIVE trong năm học của học kỳ đã chọn — hãy tạo lớp HC trước`,
          },
        ]);
      }
    }    const subjectByCode = new Map(
      subjects.map((row) => [row.code.toUpperCase(), row] as const),
    );

    const gradeLevelIds = [
      ...new Set(homeroomClasses.map((row) => row.gradeLevelId)),
    ];
    const gradeLevelSubjects = await this.prisma.gradeLevelSubject.findMany({
      where: {
        schoolId,
        gradeLevelId: { in: gradeLevelIds },
        subjectId: { in: subjects.map((row) => row.id) },
        status: AcademicEntityStatus.ACTIVE,
      },
      select: {
        id: true,
        gradeLevelId: true,
        subjectId: true,
        subject: { select: { code: true, name: true } },
      },
    });

    const glsByGradeAndSubject = new Map<string, GlsCache>();
    for (const row of gradeLevelSubjects) {
      glsByGradeAndSubject.set(`${row.gradeLevelId}:${row.subjectId}`, {
        id: row.id,
        subjectId: row.subjectId,
        subjectCode: row.subject.code,
        subjectName: row.subject.name,
      });
    }

    const teacherByEmail = new Map(
      teachers
        .filter((row) => row.user?.email)
        .map((row) => [row.user!.email.toLowerCase(), row.id] as const),
    );

    const existingSections = await this.prisma.courseSection.findMany({
      where: {
        schoolId,
        semesterId: semester.id,
        status: AcademicEntityStatus.ACTIVE,
      },
      select: {
        id: true,
        code: true,
        homeroomClassId: true,
        gradeLevelSubjectId: true,
      },
    });

    const existingByClassSubject = new Map<string, string>(
      existingSections
        .filter(
          (row): row is typeof row & { homeroomClassId: string } =>
            Boolean(row.homeroomClassId),
        )
        .map((row) => [
          `${row.homeroomClassId}:${row.gradeLevelSubjectId}`,
          row.id,
        ]),
    );
    const existingByCode = new Map<string, string>(
      existingSections.map((row) => [row.code.toLowerCase(), row.id]),
    );

    const existingAssignmentSectionIds = new Set(
      (
        await this.prisma.teachingAssignment.findMany({
          where: {
            schoolId,
            status: AcademicEntityStatus.ACTIVE,
            courseSectionId: {
              in: existingSections.map((row) => row.id),
            },
          },
          select: { courseSectionId: true },
        })
      ).map((row) => row.courseSectionId),
    );

    const transactionTimeoutMs = Math.min(
      300_000,
      30_000 + parsedRows.length * 500,
    );

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          let created = 0;
          let skippedExisting = 0;
          let assignmentsCreated = 0;

          for (const item of parsedRows) {
            const homeroom = homeroomByCode.get(item.sheet);
            if (!homeroom) {
              throw this.buildValidationException([
                {
                  sheet: item.sheet,
                  row: item.rowNumber,
                  field: 'sheet',
                  message: `Không tìm thấy lớp HC ${item.sheet}`,
                },
              ]);
            }

            const subject = subjectByCode.get(item.row.ma_mon.toUpperCase());
            if (!subject) {
              throw this.buildValidationException([
                {
                  sheet: item.sheet,
                  row: item.rowNumber,
                  field: 'ma_mon',
                  message: `Không tìm thấy môn "${item.row.ma_mon}" đang hoạt động`,
                },
              ]);
            }

            const gls = glsByGradeAndSubject.get(
              `${homeroom.gradeLevelId}:${subject.id}`,
            );
            if (!gls) {
              throw this.buildValidationException([
                {
                  sheet: item.sheet,
                  row: item.rowNumber,
                  field: 'ma_mon',
                  message: `Môn ${subject.code} chưa cấu hình cho khối của lớp ${homeroom.code}`,
                },
              ]);
            }

            const sectionCode = (
              item.row.ma_lop_mon?.trim() ||
              buildCourseSectionCode(gls.subjectCode, homeroom.code)
            ).slice(0, 30);
            const sectionName = (
              item.row.ten_lop_mon?.trim() ||
              buildCourseSectionName(gls.subjectName, homeroom.code)
            ).slice(0, 100);

            const classSubjectKey = `${homeroom.id}:${gls.id}`;
            let courseSectionId =
              existingByClassSubject.get(classSubjectKey) ??
              existingByCode.get(sectionCode.toLowerCase());

            if (courseSectionId) {
              skippedExisting += 1;
            } else {
              const createdSection = await tx.courseSection.create({
                data: {
                  schoolId,
                  semesterId: semester.id,
                  homeroomClassId: homeroom.id,
                  gradeLevelSubjectId: gls.id,
                  name: sectionName,
                  code: sectionCode,
                  status: AcademicEntityStatus.ACTIVE,
                },
              });
              courseSectionId = createdSection.id;
              existingByClassSubject.set(classSubjectKey, courseSectionId);
              existingByCode.set(sectionCode.toLowerCase(), courseSectionId);
              created += 1;
            }

            if (!item.row.email_gv) {
              continue;
            }

            const teacherId = teacherByEmail.get(
              item.row.email_gv.toLowerCase(),
            );
            if (!teacherId) {
              throw this.buildValidationException([
                {
                  sheet: item.sheet,
                  row: item.rowNumber,
                  field: 'email_gv',
                  message: `Không tìm thấy GV ACTIVE với email ${item.row.email_gv}`,
                },
              ]);
            }

            if (existingAssignmentSectionIds.has(courseSectionId)) {
              continue;
            }

            await this.ensureTeachingAssignment(tx, {
              schoolId,
              teacherId,
              courseSectionId,
              assignAt: semester.startDate,
            });
            existingAssignmentSectionIds.add(courseSectionId);
            assignmentsCreated += 1;
          }

          return {
            successCount: created + skippedExisting,
            errorCount: 0,
            created,
            skippedExisting,
            assignmentsCreated,
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
          'Dữ liệu import trùng mã lớp môn hoặc phân công',
          HttpStatus.CONFLICT,
        );
      }

      throw error;
    }
  }

  private async ensureTeachingAssignment(
    tx: PrismaTransactionClient,
    params: {
      schoolId: string;
      teacherId: string;
      courseSectionId: string;
      assignAt: Date;
    },
  ): Promise<void> {
    const existing = await tx.teachingAssignment.findUnique({
      where: {
        teacherId_courseSectionId: {
          teacherId: params.teacherId,
          courseSectionId: params.courseSectionId,
        },
      },
      select: { id: true, status: true },
    });

    if (existing) {
      if (existing.status !== AcademicEntityStatus.ACTIVE) {
        await tx.teachingAssignment.update({
          where: { id: existing.id },
          data: {
            status: AcademicEntityStatus.ACTIVE,
            assignAt: params.assignAt,
          },
        });
      }
      return;
    }

    await tx.teachingAssignment.create({
      data: {
        schoolId: params.schoolId,
        teacherId: params.teacherId,
        courseSectionId: params.courseSectionId,
        assignAt: params.assignAt,
        status: AcademicEntityStatus.ACTIVE,
      },
    });
  }

  private normalizeRowData(
    data: Record<string, string>,
  ): Record<string, string> {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      normalized[key] = value.trim();
    }
    for (const key of ['ten_lop_mon', 'ma_lop_mon', 'email_gv']) {
      if (!normalized[key]) {
        delete normalized[key];
      }
    }
    if (normalized.ma_mon) {
      normalized.ma_mon = normalized.ma_mon.toUpperCase();
    }
    return normalized;
  }

  private validateDuplicateKeys(
    rows: SheetRow[],
  ): CourseSectionImportRowError[] {
    const errors: CourseSectionImportRowError[] = [];
    const subjectInSheet = new Map<string, number>();
    const codes = new Map<string, { sheet: string; row: number }>();

    for (const item of rows) {
      const subjectKey = `${item.sheet}:${item.row.ma_mon.toUpperCase()}`;
      const existingSubjectRow = subjectInSheet.get(subjectKey);
      if (existingSubjectRow) {
        errors.push({
          sheet: item.sheet,
          row: item.rowNumber,
          field: 'ma_mon',
          message: `Trùng môn ${item.row.ma_mon} với dòng ${existingSubjectRow} cùng sheet`,
        });
      } else {
        subjectInSheet.set(subjectKey, item.rowNumber);
      }

      if (item.row.ma_lop_mon) {
        const codeKey = item.row.ma_lop_mon.toLowerCase();
        const existing = codes.get(codeKey);
        if (existing) {
          errors.push({
            sheet: item.sheet,
            row: item.rowNumber,
            field: 'ma_lop_mon',
            message: `Trùng mã lớp môn với sheet ${existing.sheet} dòng ${existing.row}`,
          });
        } else {
          codes.set(codeKey, { sheet: item.sheet, row: item.rowNumber });
        }
      }
    }

    return errors;
  }

  private buildValidationException(
    errors: CourseSectionImportRowError[],
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
        skippedExisting: 0,
        assignmentsCreated: 0,
        errors,
      },
    );
  }
}
