import { Injectable } from '@nestjs/common';
import { AcademicEntityStatus } from '@prisma/client';

import { PrismaService } from '@/common/database/prisma.service';
import { WorkbookBuilder } from '@/common/files/workbook-builder.util';
import { toIsoDateString } from '@/common/schemas/academic.schema';
import {
  TEACHING_ASSIGNMENT_IMPORT_COLUMNS,
  TEACHING_ASSIGNMENT_IMPORT_INSTRUCTION_LINES,
  TEACHING_ASSIGNMENT_IMPORT_SAMPLE_ROWS,
  TEACHING_ASSIGNMENT_IMPORT_SHEET_NAME,
  buildTeachingAssignmentImportInstructionLines,
} from '@/modules/imports/constants/teaching-assignments-import.constants';
import type { TeachingAssignmentsImportTemplateQuery } from '@/modules/imports/schemas/teaching-assignments-import.schema';

@Injectable()
export class TeachingAssignmentsImportTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async buildTemplateBuffer(
    schoolId: string,
    query: TeachingAssignmentsImportTemplateQuery,
  ): Promise<Buffer> {
    if (query.semesterId) {
      const fromDb = await this.buildFromSemester(schoolId, query.semesterId);
      if (fromDb) {
        return fromDb;
      }
    }

    return this.buildSampleFileBuffer();
  }

  async buildSampleFileBuffer(): Promise<Buffer> {
    const builder = new WorkbookBuilder();
    builder.addSheetFromRows(
      TEACHING_ASSIGNMENT_IMPORT_SHEET_NAME,
      TEACHING_ASSIGNMENT_IMPORT_COLUMNS,
      TEACHING_ASSIGNMENT_IMPORT_SAMPLE_ROWS,
    );
    builder.addInstructionSheet(
      'Huong_dan',
      [
        ...TEACHING_ASSIGNMENT_IMPORT_INSTRUCTION_LINES,
        '',
        'File mẫu tham khảo: docs/samples/teaching-assignments-import-sample.xlsx',
      ],
    );
    return builder.toBuffer();
  }

  /**
   * Đủ lớp môn ACTIVE của học kỳ đích:
   * - Khối đầu cấp (vd. 10): email_gv trống (phân công mới)
   * - Khối trên: email_gv từ phân công ACTIVE HK2 năm trước (cùng mã lớp HC + mã môn)
   */
  private async buildFromSemester(
    schoolId: string,
    semesterId: string,
  ): Promise<Buffer | null> {
    const semester = await this.prisma.semester.findFirst({
      where: { id: semesterId, schoolId },
      select: {
        id: true,
        startDate: true,
        code: true,
        name: true,
        academicYear: { select: { id: true, name: true, startDate: true } },
      },
    });

    if (!semester) {
      return null;
    }

    const sections = await this.prisma.courseSection.findMany({
      where: {
        schoolId,
        semesterId: semester.id,
        status: AcademicEntityStatus.ACTIVE,
        homeroomClassId: { not: null },
      },
      select: {
        code: true,
        homeroomClass: {
          select: {
            code: true,
            gradeLevel: { select: { code: true } },
          },
        },
        gradeLevelSubject: {
          select: { subject: { select: { code: true } } },
        },
      },
      orderBy: { code: 'asc' },
    });

    if (sections.length === 0) {
      return null;
    }

    const gradeLevels = await this.prisma.gradeLevel.findMany({
      where: { schoolId },
      select: { code: true },
    });
    const entryGradeCode = [...gradeLevels]
      .map((row) => ({ code: row.code, value: Number(row.code) }))
      .filter((row) => Number.isFinite(row.value))
      .sort((a, b) => a.value - b.value)[0]?.code ?? null;

    const teacherEmailByClassSubject =
      await this.loadPreviousYearTeacherByClassSubject(
        schoolId,
        semester.academicYear.startDate,
      );

    const assignDate = toIsoDateString(semester.startDate);
    let entryRows = 0;
    let upperFilled = 0;
    let upperEmpty = 0;

    const rows: Record<string, string>[] = sections.map((section) => {
      const classCode = section.homeroomClass?.code ?? '';
      const gradeCode = section.homeroomClass?.gradeLevel.code ?? '';
      const subjectCode = section.gradeLevelSubject.subject.code;
      const isEntry = Boolean(
        entryGradeCode && gradeCode === entryGradeCode,
      );

      let email = '';
      if (isEntry) {
        entryRows += 1;
      } else {
        email =
          teacherEmailByClassSubject.get(
            `${classCode}:${subjectCode}`.toUpperCase(),
          ) ??
          teacherEmailByClassSubject.get(section.code.toUpperCase()) ??
          '';
        if (email) {
          upperFilled += 1;
        } else {
          upperEmpty += 1;
        }
      }

      return {
        email_gv: email,
        ma_lop_mon: section.code,
        ngay_phan_cong: assignDate,
      };
    });

    const builder = new WorkbookBuilder();
    builder.addSheetFromRows(
      TEACHING_ASSIGNMENT_IMPORT_SHEET_NAME,
      TEACHING_ASSIGNMENT_IMPORT_COLUMNS,
      rows,
    );
    builder.addInstructionSheet(
      'Huong_dan',
      buildTeachingAssignmentImportInstructionLines({
        academicYearName: semester.academicYear.name,
        semesterLabel: `${semester.code} — ${semester.name}`,
        entryGradeCode,
        totalRows: rows.length,
        entryRows,
        upperFilled,
        upperEmpty,
      }),
    );

    return builder.toBuffer();
  }

  /** Map `CLASS:SUBJECT` và `SECTION_CODE` → email GV từ HK2 năm trước. */
  private async loadPreviousYearTeacherByClassSubject(
    schoolId: string,
    targetYearStart: Date,
  ): Promise<Map<string, string>> {
    const previousYear = await this.prisma.academicYear.findFirst({
      where: {
        schoolId,
        startDate: { lt: targetYearStart },
      },
      orderBy: { startDate: 'desc' },
      select: { id: true },
    });

    if (!previousYear) {
      return new Map();
    }

    const previousSemesters = await this.prisma.semester.findMany({
      where: { schoolId, academicYearId: previousYear.id },
      select: { id: true, code: true, startDate: true },
      orderBy: { startDate: 'asc' },
    });
    const sourceSemester =
      previousSemesters.find((row) => row.code === 'HK2') ??
      previousSemesters[previousSemesters.length - 1];

    if (!sourceSemester) {
      return new Map();
    }

    const assignments = await this.prisma.teachingAssignment.findMany({
      where: {
        schoolId,
        status: AcademicEntityStatus.ACTIVE,
        courseSection: {
          semesterId: sourceSemester.id,
          status: AcademicEntityStatus.ACTIVE,
        },
      },
      select: {
        teacher: { select: { user: { select: { email: true } } } },
        courseSection: {
          select: {
            code: true,
            homeroomClass: { select: { code: true } },
            gradeLevelSubject: {
              select: { subject: { select: { code: true } } },
            },
          },
        },
      },
    });

    const map = new Map<string, string>();
    for (const row of assignments) {
      const email = row.teacher.user?.email;
      if (!email) {
        continue;
      }

      map.set(row.courseSection.code.toUpperCase(), email);

      const classCode = row.courseSection.homeroomClass?.code;
      const subjectCode = row.courseSection.gradeLevelSubject.subject.code;
      if (classCode && subjectCode) {
        map.set(`${classCode}:${subjectCode}`.toUpperCase(), email);
      }
    }

    return map;
  }
}
