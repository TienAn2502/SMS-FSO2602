import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssessmentStatus } from '@prisma/client';

import type { EnvConfig } from '@/common/config/env.schema';
import { PrismaService } from '@/common/database/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import type { ParsedSpreadsheetRow } from '@/common/files/file-format.types';
import { parseUploadedSpreadsheet } from '@/common/files/parse-uploaded-file.util';
import { isValidScoreStep } from '@/common/utils/score-step.util';
import { GRADEBOOK_ENROLLMENT_STATUSES } from '@/common/utils/enrollment-status.util';
import {
  SCORE_IMPORT_REQUIRED_HEADERS,
  SCORE_IMPORT_SHEET_NAME,
} from '@/modules/imports/constants/scores-import.constants';
import {
  scoreImportRowSchema,
  type ImportScoresFormInput,
  type ScoreImportResult,
  type ScoreImportRow,
  type ScoreImportRowError,
} from '@/modules/imports/schemas/scores-import.schema';
import { validateScoreImportHeaders } from '@/modules/imports/utils/validate-score-import-headers.util';
import { ScoresService } from '@/modules/scores/scores.service';

interface ParsedScoreImportRow {
  rowNumber: number;
  row: ScoreImportRow;
}

@Injectable()
export class ScoresImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<EnvConfig, true>,
    private readonly scoresService: ScoresService,
  ) {}

  async importScores(
    schoolId: string,
    file: Express.Multer.File | undefined,
    form: ImportScoresFormInput,
  ): Promise<ScoreImportResult> {
    const parsed = await parseUploadedSpreadsheet(file, {
      maxBytes: this.configService.get('IMPORT_MAX_BYTES', { infer: true }),
      maxRows: this.configService.get('IMPORT_MAX_ROWS', { infer: true }),
      sheetName: SCORE_IMPORT_SHEET_NAME,
      headerMarker: SCORE_IMPORT_REQUIRED_HEADERS[0],
    });

    const headerErrors = validateScoreImportHeaders(parsed.headers);
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

    const assessment = await this.assertAssessmentContext(
      schoolId,
      form.courseSectionId,
      form.assessmentId,
    );

    const { rows, errors } = this.parseRows(parsed.rows);
    if (errors.length > 0) {
      throw this.buildValidationException(errors);
    }

    errors.push(...this.validateDuplicateStudentCodes(rows));
    if (errors.length > 0) {
      throw this.buildValidationException(errors);
    }

    const homeroomClassId = assessment.courseSection.homeroomClassId;

    const studentByCode = await this.loadStudentsByExternalCode(
      schoolId,
      assessment.semesterId,
      homeroomClassId,
      rows,
    );

    const maxScore = assessment.maxScore.toNumber();
    const changes: Array<{
      assessmentId: string;
      studentId: string;
      score: number | null;
      note?: string | null;
    }> = [];

    for (const item of rows) {
      const studentId = studentByCode.get(item.row.ma_hs.toLowerCase());
      if (!studentId) {
        throw this.buildValidationException([
          {
            row: item.rowNumber,
            field: 'ma_hs',
            message: `Không tìm thấy học sinh ${item.row.ma_hs} trong lớp môn`,
          },
        ]);
      }

      const parsedScore = this.parseScoreValue(
        item.rowNumber,
        item.row.diem,
        maxScore,
      );
      if (parsedScore.error) {
        throw this.buildValidationException([parsedScore.error]);
      }

      changes.push({
        assessmentId: form.assessmentId,
        studentId,
        score: parsedScore.value,
        note: item.row.ghi_chu ?? null,
      });
    }

    await this.scoresService.patchGradebookChanges(
      schoolId,
      form.courseSectionId,
      changes,
    );

    return {
      successCount: rows.length,
      errorCount: 0,
      created: 0,
      updated: rows.length,
      errors: [],
    };
  }

  private parseRows(rows: ParsedSpreadsheetRow[]): {
    rows: ParsedScoreImportRow[];
    errors: ScoreImportRowError[];
  } {
    const parsedRows: ParsedScoreImportRow[] = [];
    const errors: ScoreImportRowError[] = [];

    for (const spreadsheetRow of rows) {
      const normalizedData = this.normalizeRowData(spreadsheetRow.data);
      const result = scoreImportRowSchema.safeParse(normalizedData);

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

    for (const key of ['ho_ten', 'diem', 'ghi_chu']) {
      if (!normalized[key]) {
        delete normalized[key];
      }
    }

    return normalized;
  }

  private validateDuplicateStudentCodes(
    rows: ParsedScoreImportRow[],
  ): ScoreImportRowError[] {
    const errors: ScoreImportRowError[] = [];
    const codes = new Map<string, number>();

    for (const item of rows) {
      const codeKey = item.row.ma_hs.toLowerCase();
      const existingRow = codes.get(codeKey);
      if (existingRow !== undefined) {
        errors.push({
          row: item.rowNumber,
          field: 'ma_hs',
          message: `Trùng mã HS với dòng ${existingRow}`,
        });
      } else {
        codes.set(codeKey, item.rowNumber);
      }
    }

    return errors;
  }

  private async assertAssessmentContext(
    schoolId: string,
    courseSectionId: string,
    assessmentId: string,
  ) {
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        schoolId,
        courseSectionId,
      },
      select: {
        id: true,
        status: true,
        maxScore: true,
        semesterId: true,
        courseSection: {
          select: { homeroomClassId: true },
        },
      },
    });

    if (!assessment) {
      throw new AppException(
        'ASSESSMENT_NOT_FOUND',
        'Không tìm thấy đầu điểm thuộc lớp môn',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (assessment.status === AssessmentStatus.CLOSED) {
      throw new AppException(
        'GRADEBOOK_LOCKED',
        'Đầu điểm đã khóa — không thể import',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (!assessment.courseSection.homeroomClassId) {
      throw new AppException(
        'COURSE_SECTION_NO_HOMEROOM',
        'Lớp môn chưa gắn lớp hành chính',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (!assessment.courseSection.homeroomClassId) {
      throw new AppException(
        'COURSE_SECTION_NO_HOMEROOM',
        'Lớp môn chưa gắn lớp hành chính',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return {
      ...assessment,
      courseSection: {
        homeroomClassId: assessment.courseSection.homeroomClassId,
      },
    };
  }

  private async loadStudentsByExternalCode(
    schoolId: string,
    semesterId: string,
    homeroomClassId: string,
    rows: ParsedScoreImportRow[],
  ): Promise<Map<string, string>> {
    const codes = [
      ...new Set(rows.map((item) => item.row.ma_hs.toLowerCase())),
    ];

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        semesterId,
        homeroomClassId,
        status: { in: GRADEBOOK_ENROLLMENT_STATUSES },
        student: {
          externalCode: { not: null },
        },
      },
      select: {
        studentId: true,
        student: { select: { externalCode: true } },
      },
    });

    const studentMap = new Map<string, string>();
    for (const enrollment of enrollments) {
      const code = enrollment.student.externalCode?.toLowerCase();
      if (code) {
        studentMap.set(code, enrollment.studentId);
      }
    }

    for (const code of codes) {
      if (!studentMap.has(code)) {
        // defer row error to upsert loop
      }
    }

    return studentMap;
  }

  private parseScoreValue(
    rowNumber: number,
    rawValue: string | undefined,
    maxScore: number,
  ): {
    value: number | null;
    error?: ScoreImportRowError;
  } {
    if (!rawValue) {
      return { value: null };
    }

    const normalized = rawValue.replace(',', '.');
    const score = Number(normalized);

    if (!Number.isFinite(score)) {
      return {
        value: null,
        error: {
          row: rowNumber,
          field: 'diem',
          message: 'Điểm không hợp lệ',
        },
      };
    }

    if (score < 0 || score > maxScore) {
      return {
        value: null,
        error: {
          row: rowNumber,
          field: 'diem',
          message: `Điểm phải nằm trong [0, ${maxScore}]`,
        },
      };
    }

    if (!isValidScoreStep(score)) {
      return {
        value: null,
        error: {
          row: rowNumber,
          field: 'diem',
          message: 'Điểm chỉ được là số nguyên hoặc .25, .5, .75',
        },
      };
    }

    return { value: score };
  }

  private buildValidationException(
    errors: ScoreImportRowError[],
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
