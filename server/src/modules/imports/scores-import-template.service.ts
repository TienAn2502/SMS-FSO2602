import { HttpStatus, Injectable } from '@nestjs/common';
import { AssessmentStatus } from '@prisma/client';

import { WorkbookBuilder } from '@/common/files/workbook-builder.util';
import type {
  SpreadsheetColumnDef,
  SpreadsheetSheetMetadata,
} from '@/common/files/file-format.types';
import { PrismaService } from '@/common/database/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import { GRADEBOOK_ENROLLMENT_STATUSES } from '@/common/utils/enrollment-status.util';
import {
  SCORE_IMPORT_COLUMNS,
  SCORE_IMPORT_INSTRUCTION_LINES,
  SCORE_IMPORT_MATRIX_IDENTITY_COLUMNS,
  SCORE_IMPORT_SAMPLE_MATRIX_COLUMNS,
  SCORE_IMPORT_SAMPLE_MATRIX_ROWS,
  SCORE_IMPORT_SAMPLE_METADATA,
  SCORE_IMPORT_SHEET_NAME,
} from '@/modules/imports/constants/scores-import.constants';
import type { ScoresImportTemplateQuery } from '@/modules/imports/schemas/scores-import.schema';
import {
  buildAssessmentSlotMappings,
  scoreSlotHeaderLabel,
} from '@/modules/imports/utils/score-import-slots.util';

@Injectable()
export class ScoresImportTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async buildTemplateBuffer(
    schoolId: string,
    query: ScoresImportTemplateQuery,
  ): Promise<Buffer> {
    const content = await this.resolveTemplateContent(schoolId, query);

    const builder = new WorkbookBuilder();
    builder.addSheetFromRowsWithMetadata(
      SCORE_IMPORT_SHEET_NAME,
      content.columns,
      content.sampleRows,
      content.metadata,
    );
    builder.addInstructionSheet('Huong_dan', SCORE_IMPORT_INSTRUCTION_LINES);
    return builder.toBuffer();
  }

  async buildSampleFileBuffer(): Promise<Buffer> {
    const builder = new WorkbookBuilder();
    builder.addSheetFromRowsWithMetadata(
      SCORE_IMPORT_SHEET_NAME,
      SCORE_IMPORT_SAMPLE_MATRIX_COLUMNS,
      SCORE_IMPORT_SAMPLE_MATRIX_ROWS,
      SCORE_IMPORT_SAMPLE_METADATA,
    );
    builder.addInstructionSheet('Huong_dan', SCORE_IMPORT_INSTRUCTION_LINES);
    return builder.toBuffer();
  }

  private async resolveTemplateContent(
    schoolId: string,
    query: ScoresImportTemplateQuery,
  ): Promise<{
    columns: SpreadsheetColumnDef[];
    sampleRows: Record<string, string>[];
    metadata: SpreadsheetSheetMetadata;
  }> {
    if (!query.courseSectionId) {
      return {
        columns: SCORE_IMPORT_SAMPLE_MATRIX_COLUMNS,
        sampleRows: SCORE_IMPORT_SAMPLE_MATRIX_ROWS,
        metadata: SCORE_IMPORT_SAMPLE_METADATA,
      };
    }

    const courseSection = await this.prisma.courseSection.findFirst({
      where: { id: query.courseSectionId, schoolId },
      select: {
        code: true,
        name: true,
        semesterId: true,
        homeroomClassId: true,
        semester: {
          select: {
            name: true,
            academicYear: { select: { name: true } },
          },
        },
        homeroomClass: { select: { code: true } },
        gradeLevelSubject: {
          select: {
            subject: { select: { code: true, name: true } },
          },
        },
      },
    });

    if (!courseSection) {
      throw new AppException(
        'COURSE_SECTION_NOT_FOUND',
        'Không tìm thấy lớp môn học',
        HttpStatus.NOT_FOUND,
      );
    }

    const baseMetadataLines = [
      {
        label: 'Lớp môn',
        value: `${courseSection.code} — ${courseSection.name}`,
      },
      {
        label: 'Môn học',
        value:
          courseSection.gradeLevelSubject.subject.name ??
          courseSection.gradeLevelSubject.subject.code,
      },
      {
        label: 'Lớp HC',
        value: courseSection.homeroomClass?.code ?? '—',
      },
      { label: 'Năm học', value: courseSection.semester.academicYear.name },
      { label: 'Học kỳ', value: courseSection.semester.name },
    ];

    // Legacy: 1 đầu điểm → cột diem
    if (query.assessmentId) {
      const assessment = await this.prisma.assessment.findFirst({
        where: {
          id: query.assessmentId,
          schoolId,
          courseSectionId: query.courseSectionId,
        },
        select: { name: true, assessmentDate: true },
      });

      const assessmentLabel = assessment
        ? `${assessment.name} (${assessment.assessmentDate.toISOString().slice(0, 10)})`
        : '—';

      const metadata: SpreadsheetSheetMetadata = {
        title: 'MẪU IMPORT ĐIỂM',
        lines: [
          ...baseMetadataLines,
          { label: 'Đầu điểm', value: assessmentLabel },
        ],
      };

      const rows = await this.loadStudentRows(
        schoolId,
        courseSection.semesterId,
        courseSection.homeroomClassId,
        () => ({ diem: '', ghi_chu: '' }),
      );

      return {
        columns: SCORE_IMPORT_COLUMNS,
        sampleRows: rows,
        metadata,
      };
    }

    const assessments = await this.prisma.assessment.findMany({
      where: { schoolId, courseSectionId: query.courseSectionId },
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
    const scoreColumns = slots.map((slot) => ({
      header: slot.slotKey,
      key: slot.slotKey,
      width: 8,
    }));

    const metadata: SpreadsheetSheetMetadata = {
      title: 'MẪU IMPORT ĐIỂM',
      lines: [
        ...baseMetadataLines,
        {
          label: 'Đầu điểm',
          value:
            slots.length > 0
              ? slots
                  .map(
                    (slot) =>
                      `${slot.slotKey} (${scoreSlotHeaderLabel(slot.slotKey)})`,
                  )
                  .join(', ')
              : 'Chưa có đầu điểm — tạo TX/GK/CK trước',
        },
      ],
    };

    const emptyScores = Object.fromEntries(
      slots.map((slot) => [slot.slotKey, '']),
    );

    const rows = await this.loadStudentRows(
      schoolId,
      courseSection.semesterId,
      courseSection.homeroomClassId,
      () => ({ ...emptyScores }),
    );

    return {
      columns: [...SCORE_IMPORT_MATRIX_IDENTITY_COLUMNS, ...scoreColumns],
      sampleRows:
        rows.length > 0
          ? rows
          : SCORE_IMPORT_SAMPLE_MATRIX_ROWS.map((row) => ({
              ma_hs: row.ma_hs,
              ho_ten: row.ho_ten,
              ...emptyScores,
            })),
      metadata,
    };
  }

  private async loadStudentRows(
    schoolId: string,
    semesterId: string,
    homeroomClassId: string | null,
    extraFields: () => Record<string, string>,
  ): Promise<Record<string, string>[]> {
    if (!homeroomClassId) {
      return [];
    }

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        semesterId,
        homeroomClassId,
        status: { in: GRADEBOOK_ENROLLMENT_STATUSES },
      },
      orderBy: { student: { fullName: 'asc' } },
      select: {
        student: {
          select: {
            fullName: true,
            externalCode: true,
          },
        },
      },
    });

    return enrollments.map((enrollment) => ({
      ma_hs: enrollment.student.externalCode ?? '',
      ho_ten: enrollment.student.fullName,
      ...extraFields(),
    }));
  }
}
