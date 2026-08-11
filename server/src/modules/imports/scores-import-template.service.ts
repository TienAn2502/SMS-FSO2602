import { HttpStatus, Injectable } from '@nestjs/common';

import { WorkbookBuilder } from '@/common/files/workbook-builder.util';
import type { SpreadsheetSheetMetadata } from '@/common/files/file-format.types';
import { PrismaService } from '@/common/database/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import { GRADEBOOK_ENROLLMENT_STATUSES } from '@/common/utils/enrollment-status.util';
import {
  SCORE_IMPORT_COLUMNS,
  SCORE_IMPORT_INSTRUCTION_LINES,
  SCORE_IMPORT_SAMPLE_METADATA,
  SCORE_IMPORT_SAMPLE_ROWS,
  SCORE_IMPORT_SHEET_NAME,
} from '@/modules/imports/constants/scores-import.constants';
import type { ScoresImportTemplateQuery } from '@/modules/imports/schemas/scores-import.schema';

@Injectable()
export class ScoresImportTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async buildTemplateBuffer(
    schoolId: string,
    query: ScoresImportTemplateQuery,
  ): Promise<Buffer> {
    const { sampleRows, metadata } = await this.resolveTemplateContent(
      schoolId,
      query,
    );

    const builder = new WorkbookBuilder();
    builder.addSheetFromRowsWithMetadata(
      SCORE_IMPORT_SHEET_NAME,
      SCORE_IMPORT_COLUMNS,
      sampleRows,
      metadata,
    );
    builder.addInstructionSheet('Huong_dan', SCORE_IMPORT_INSTRUCTION_LINES);
    return builder.toBuffer();
  }

  async buildSampleFileBuffer(): Promise<Buffer> {
    const builder = new WorkbookBuilder();
    builder.addSheetFromRowsWithMetadata(
      SCORE_IMPORT_SHEET_NAME,
      SCORE_IMPORT_COLUMNS,
      SCORE_IMPORT_SAMPLE_ROWS,
      SCORE_IMPORT_SAMPLE_METADATA,
    );
    builder.addInstructionSheet('Huong_dan', SCORE_IMPORT_INSTRUCTION_LINES);
    return builder.toBuffer();
  }

  private async resolveTemplateContent(
    schoolId: string,
    query: ScoresImportTemplateQuery,
  ): Promise<{
    sampleRows: Record<string, string>[];
    metadata: SpreadsheetSheetMetadata;
  }> {
    if (!query.courseSectionId) {
      return {
        sampleRows: SCORE_IMPORT_SAMPLE_ROWS,
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

    let assessmentLabel = '— (chọn trên form import)';
    if (query.assessmentId) {
      const assessment = await this.prisma.assessment.findFirst({
        where: {
          id: query.assessmentId,
          schoolId,
          courseSectionId: query.courseSectionId,
        },
        select: { name: true, assessmentDate: true },
      });

      if (assessment) {
        assessmentLabel = `${assessment.name} (${assessment.assessmentDate.toISOString().slice(0, 10)})`;
      }
    }

    const metadata: SpreadsheetSheetMetadata = {
      title: 'MẪU IMPORT ĐIỂM',
      lines: [
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
        { label: 'Đầu điểm', value: assessmentLabel },
      ],
    };

    if (!courseSection.homeroomClassId) {
      return {
        sampleRows: SCORE_IMPORT_SAMPLE_ROWS,
        metadata,
      };
    }

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        semesterId: courseSection.semesterId,
        homeroomClassId: courseSection.homeroomClassId,
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

    if (enrollments.length === 0) {
      return {
        sampleRows: SCORE_IMPORT_SAMPLE_ROWS,
        metadata,
      };
    }

    return {
      metadata,
      sampleRows: enrollments.map((enrollment) => ({
        ma_hs: enrollment.student.externalCode ?? '',
        ho_ten: enrollment.student.fullName,
        diem: '',
        ghi_chu: '',
      })),
    };
  }
}
