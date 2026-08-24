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
import {
  buildAssessmentSlotMappings,
  isScoreImportMatrixHeaders,
  type ScoreImportSlotKey,
} from '@/modules/imports/utils/score-import-slots.util';
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

    const useMatrix =
      !form.assessmentId || isScoreImportMatrixHeaders(parsed.headers);

    if (useMatrix && !form.assessmentId) {
      return this.importMatrixScores(schoolId, form.courseSectionId, parsed);
    }

    if (!form.assessmentId) {
      throw new AppException(
        'VALIDATION_ERROR',
        'Thiếu đầu điểm hoặc cột TX/GK/CK trên file',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return this.importSingleAssessmentScores(
      schoolId,
      form.courseSectionId,
      form.assessmentId,
      parsed,
    );
  }

  private async importMatrixScores(
    schoolId: string,
    courseSectionId: string,
    parsed: {
      headers: string[];
      rows: ParsedSpreadsheetRow[];
    },
  ): Promise<ScoreImportResult> {
    const courseSection = await this.prisma.courseSection.findFirst({
      where: { id: courseSectionId, schoolId },
      select: {
        semesterId: true,
        homeroomClassId: true,
      },
    });

    if (!courseSection) {
      throw new AppException(
        'COURSE_SECTION_NOT_FOUND',
        'Không tìm thấy lớp môn học',
        HttpStatus.NOT_FOUND,
      );
    }

    if (!courseSection.homeroomClassId) {
      throw new AppException(
        'COURSE_SECTION_NO_HOMEROOM',
        'Lớp môn chưa gắn lớp hành chính',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const assessments = await this.prisma.assessment.findMany({
      where: { schoolId, courseSectionId },
      select: {
        id: true,
        name: true,
        type: true,
        assessmentDate: true,
        maxScore: true,
        status: true,
      },
      orderBy: { assessmentDate: 'asc' },
    });

    const slots = buildAssessmentSlotMappings(assessments);
    if (slots.length === 0) {
      throw new AppException(
        'NO_ASSESSMENTS',
        'Lớp môn chưa có đầu điểm để import',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const headerSet = new Set(
      parsed.headers.map((header) => header.trim().toUpperCase()),
    );
    const activeSlots = slots.filter((slot) => headerSet.has(slot.slotKey));
    if (activeSlots.length === 0) {
      throw new AppException(
        'IMPORT_VALIDATION_FAILED',
        'File không có cột TX/GK/CK khớp sổ điểm lớp môn',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const lockedSlots = activeSlots.filter(
      (slot) => slot.status === AssessmentStatus.CLOSED,
    );
    if (lockedSlots.length > 0) {
      throw new AppException(
        'GRADEBOOK_LOCKED',
        `Đầu điểm đã khóa: ${lockedSlots.map((slot) => slot.slotKey).join(', ')}`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const errors: ScoreImportRowError[] = [];
    const studentCodes: string[] = [];
    const parsedMatrixRows: Array<{
      rowNumber: number;
      maHs: string;
      scores: Partial<Record<ScoreImportSlotKey, string>>;
    }> = [];

    for (const spreadsheetRow of parsed.rows) {
      const data = this.normalizeRowData(spreadsheetRow.data);
      const maHs = data.ma_hs?.trim() ?? '';
      if (!maHs) {
        errors.push({
          row: spreadsheetRow.rowNumber,
          field: 'ma_hs',
          message: 'Mã HS là bắt buộc',
        });
        continue;
      }

      studentCodes.push(maHs);
      const scores: Partial<Record<ScoreImportSlotKey, string>> = {};
      for (const slot of activeSlots) {
        const raw = data[slot.slotKey] ?? data[slot.slotKey.toLowerCase()];
        if (raw != null && String(raw).trim() !== '') {
          scores[slot.slotKey] = String(raw).trim();
        }
      }

      parsedMatrixRows.push({
        rowNumber: spreadsheetRow.rowNumber,
        maHs,
        scores,
      });
    }

    if (errors.length > 0) {
      throw this.buildValidationException(errors);
    }

    errors.push(
      ...this.validateDuplicateCodes(
        parsedMatrixRows.map((row) => ({
          rowNumber: row.rowNumber,
          code: row.maHs,
        })),
      ),
    );
    if (errors.length > 0) {
      throw this.buildValidationException(errors);
    }

    const studentByCode = await this.loadStudentsByExternalCode(
      schoolId,
      courseSection.semesterId,
      courseSection.homeroomClassId,
      studentCodes,
    );

    const changes: Array<{
      assessmentId: string;
      studentId: string;
      score: number | null;
      note?: string | null;
    }> = [];

    for (const item of parsedMatrixRows) {
      const studentId = studentByCode.get(item.maHs.toLowerCase());
      if (!studentId) {
        errors.push({
          row: item.rowNumber,
          field: 'ma_hs',
          message: `Không tìm thấy học sinh ${item.maHs} trong lớp môn`,
        });
        continue;
      }

      for (const slot of activeSlots) {
        const raw = item.scores[slot.slotKey];
        if (raw === undefined) {
          continue;
        }

        const parsedScore = this.parseScoreValue(
          item.rowNumber,
          raw,
          slot.maxScore,
          slot.slotKey,
        );
        if (parsedScore.error) {
          errors.push(parsedScore.error);
          continue;
        }

        changes.push({
          assessmentId: slot.assessmentId,
          studentId,
          score: parsedScore.value,
          note: null,
        });
      }
    }

    if (errors.length > 0) {
      throw this.buildValidationException(errors);
    }

    if (changes.length === 0) {
      throw new AppException(
        'IMPORT_EMPTY',
        'File không có ô điểm nào để import',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.scoresService.patchGradebookChanges(
      schoolId,
      courseSectionId,
      changes,
    );

    return {
      successCount: changes.length,
      errorCount: 0,
      created: 0,
      updated: changes.length,
      errors: [],
    };
  }

  private async importSingleAssessmentScores(
    schoolId: string,
    courseSectionId: string,
    assessmentId: string,
    parsed: {
      headers: string[];
      rows: ParsedSpreadsheetRow[];
    },
  ): Promise<ScoreImportResult> {
    const assessment = await this.assertAssessmentContext(
      schoolId,
      courseSectionId,
      assessmentId,
    );

    const { rows, errors } = this.parseRows(parsed.rows);
    if (errors.length > 0) {
      throw this.buildValidationException(errors);
    }

    errors.push(
      ...this.validateDuplicateCodes(
        rows.map((item) => ({
          rowNumber: item.rowNumber,
          code: item.row.ma_hs,
        })),
      ),
    );
    if (errors.length > 0) {
      throw this.buildValidationException(errors);
    }

    const studentByCode = await this.loadStudentsByExternalCode(
      schoolId,
      assessment.semesterId,
      assessment.courseSection.homeroomClassId,
      rows.map((item) => item.row.ma_hs),
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
        'diem',
      );
      if (parsedScore.error) {
        throw this.buildValidationException([parsedScore.error]);
      }

      changes.push({
        assessmentId,
        studentId,
        score: parsedScore.value,
        note: item.row.ghi_chu ?? null,
      });
    }

    await this.scoresService.patchGradebookChanges(
      schoolId,
      courseSectionId,
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
      const trimmedKey = key.trim();
      const upper = trimmedKey.toUpperCase();
      if (/^TX\d+$/.test(upper) || upper === 'GK' || upper === 'CK') {
        normalized[upper] = value.trim();
      } else {
        normalized[trimmedKey] = value.trim();
      }
    }

    for (const key of ['ho_ten', 'diem', 'ghi_chu']) {
      if (!normalized[key]) {
        delete normalized[key];
      }
    }

    return normalized;
  }

  private validateDuplicateCodes(
    rows: Array<{ rowNumber: number; code: string }>,
  ): ScoreImportRowError[] {
    const errors: ScoreImportRowError[] = [];
    const codes = new Map<string, number>();

    for (const item of rows) {
      const codeKey = item.code.toLowerCase();
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
    codesInput: string[],
  ): Promise<Map<string, string>> {
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

    void codesInput;
    return studentMap;
  }

  private parseScoreValue(
    rowNumber: number,
    rawValue: string | undefined,
    maxScore: number,
    field: string,
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
          field,
          message: 'Điểm không hợp lệ',
        },
      };
    }

    if (score < 0 || score > maxScore) {
      return {
        value: null,
        error: {
          row: rowNumber,
          field,
          message: `Điểm phải nằm trong [0, ${maxScore}]`,
        },
      };
    }

    if (!isValidScoreStep(score)) {
      return {
        value: null,
        error: {
          row: rowNumber,
          field,
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
