import { Injectable } from '@nestjs/common';
import { AcademicEntityStatus } from '@prisma/client';

import { PrismaService } from '@/common/database/prisma.service';
import { WorkbookBuilder } from '@/common/files/workbook-builder.util';
import {
  allocateExcelSheetName,
  buildTimetableMatrix,
  formatHomeroomClassLabel,
  formatTimetableImportCell,
  type TimetableMatrixEntry,
} from '@/common/utils/timetable-matrix.util';
import {
  TIMETABLE_IMPORT_INSTRUCTION_LINES,
  TIMETABLE_IMPORT_INSTRUCTION_SHEET_NAME,
  TIMETABLE_IMPORT_SAMPLE_CLASSES,
  buildTimetableImportInstructionLines,
  suggestTimetableEntriesFromSections,
} from '@/modules/imports/constants/timetable-import.constants';
import type { TimetableImportTemplateQuery } from '@/modules/imports/schemas/timetable-import.schema';

interface TemplateClassSheet {
  code: string;
  name: string;
  academicYearName: string;
  semesterName: string;
  entries: Array<{
    dayOfWeek: number;
    periodNumber: number;
    subjectCode: string;
    room: string | null;
  }>;
  isEntryGrade: boolean;
  filledFromPreviousYear: boolean;
}

@Injectable()
export class TimetableImportTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async buildTemplateBuffer(
    schoolId: string,
    query: TimetableImportTemplateQuery,
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
    return this.buildWorkbookFromClasses(
      TIMETABLE_IMPORT_SAMPLE_CLASSES.map((sampleClass) => ({
        code: sampleClass.code,
        name: sampleClass.name,
        academicYearName: sampleClass.academicYearName,
        semesterName: sampleClass.semesterName,
        entries: sampleClass.entries.map((entry) => ({
          dayOfWeek: entry.dayOfWeek,
          periodNumber: entry.periodNumber,
          subjectCode: entry.subjectCode,
          room: entry.room,
        })),
        isEntryGrade: sampleClass.code.startsWith('10'),
        filledFromPreviousYear: !sampleClass.code.startsWith('10'),
      })),
      TIMETABLE_IMPORT_INSTRUCTION_LINES,
    );
  }

  /**
   * Mỗi sheet = một lớp HC ACTIVE:
   * - Khối trên: ưu tiên TKB HK2 năm trước (ô = mã môn)
   * - Khối đầu cấp / thiếu TKB: gợi ý từ lớp môn đã phân công (ô = mã môn)
   */
  private async buildFromSemester(
    schoolId: string,
    semesterId: string,
  ): Promise<Buffer | null> {
    const semester = await this.prisma.semester.findFirst({
      where: { id: semesterId, schoolId },
      select: {
        id: true,
        code: true,
        name: true,
        academicYear: { select: { id: true, name: true, startDate: true } },
      },
    });

    if (!semester) {
      return null;
    }

    const gradeLevels = await this.prisma.gradeLevel.findMany({
      where: { schoolId },
      select: { id: true, code: true },
    });
    const entryGradeCode =
      [...gradeLevels]
        .map((row) => ({ code: row.code, value: Number(row.code) }))
        .filter((row) => Number.isFinite(row.value))
        .sort((a, b) => a.value - b.value)[0]?.code ?? null;
    const entryGradeIds = new Set(
      gradeLevels
        .filter((row) => row.code === entryGradeCode)
        .map((row) => row.id),
    );

    const classes = await this.prisma.homeroomClass.findMany({
      where: {
        schoolId,
        academicYearId: semester.academicYear.id,
        status: AcademicEntityStatus.ACTIVE,
      },
      select: {
        id: true,
        code: true,
        name: true,
        gradeLevelId: true,
      },
      orderBy: { code: 'asc' },
    });

    if (classes.length === 0) {
      return null;
    }

    const targetSectionByClassSubject =
      await this.loadTargetSectionAndTeacherByClassSubject(
        schoolId,
        semester.id,
      );

    const sectionsByClassCode = new Map<
      string,
      Array<{ subjectCode: string; teacherEmail: string }>
    >();
    for (const [key, value] of targetSectionByClassSubject) {
      const classCode = key.split(':')[0];
      if (!classCode) {
        continue;
      }
      const list = sectionsByClassCode.get(classCode) ?? [];
      list.push({
        subjectCode: value.subjectCode,
        teacherEmail: value.teacherEmail,
      });
      sectionsByClassCode.set(classCode, list);
    }

    const previousEntriesByClassCode =
      await this.loadPreviousYearTimetableByClassCode(
        schoolId,
        semester.academicYear.startDate,
      );

    let entryClassCount = 0;
    let upperFilledClassCount = 0;
    let upperEmptyClassCount = 0;
    let suggestedClassCount = 0;

    const sheets: TemplateClassSheet[] = classes.map((homeroom, classIndex) => {
      const isEntry = entryGradeIds.has(homeroom.gradeLevelId);
      let entries: TemplateClassSheet['entries'] = [];
      let filledFromPreviousYear = false;

      if (isEntry) {
        entryClassCount += 1;
      } else {
        const previous = previousEntriesByClassCode.get(homeroom.code) ?? [];
        entries = previous
          .map((slot) => {
            const mapped = targetSectionByClassSubject.get(
              `${homeroom.code}:${slot.subjectCode}`.toUpperCase(),
            );
            if (!mapped?.teacherEmail) {
              return null;
            }

            return {
              dayOfWeek: slot.dayOfWeek,
              periodNumber: slot.periodNumber,
              subjectCode: mapped.subjectCode,
              room: slot.room,
            };
          })
          .filter((row): row is NonNullable<typeof row> => Boolean(row));

        filledFromPreviousYear = entries.length > 0;
        if (filledFromPreviousYear) {
          upperFilledClassCount += 1;
        } else {
          upperEmptyClassCount += 1;
        }
      }

      if (entries.length === 0) {
        const suggested = suggestTimetableEntriesFromSections(
          homeroom.code,
          sectionsByClassCode.get(homeroom.code.toUpperCase()) ??
            sectionsByClassCode.get(homeroom.code) ??
            [],
          classIndex,
        );
        if (suggested.length > 0) {
          entries = suggested;
          suggestedClassCount += 1;
        }
      }

      return {
        code: homeroom.code,
        name: homeroom.name,
        academicYearName: semester.academicYear.name,
        semesterName: `${semester.code} — ${semester.name}`,
        entries,
        isEntryGrade: isEntry,
        filledFromPreviousYear,
      };
    });

    return this.buildWorkbookFromClasses(
      sheets,
      buildTimetableImportInstructionLines({
        academicYearName: semester.academicYear.name,
        semesterLabel: `${semester.code} — ${semester.name}`,
        entryGradeCode,
        totalClasses: sheets.length,
        entryClassCount,
        upperFilledClassCount,
        upperEmptyClassCount,
        suggestedClassCount,
      }),
    );
  }

  private async loadTargetSectionAndTeacherByClassSubject(
    schoolId: string,
    semesterId: string,
  ): Promise<
    Map<string, { subjectCode: string; teacherEmail: string }>
  > {
    const sections = await this.prisma.courseSection.findMany({
      where: {
        schoolId,
        semesterId,
        status: AcademicEntityStatus.ACTIVE,
        homeroomClassId: { not: null },
      },
      select: {
        id: true,
        code: true,
        homeroomClass: { select: { code: true } },
        gradeLevelSubject: {
          select: { subject: { select: { code: true } } },
        },
        teachingAssignments: {
          where: { status: AcademicEntityStatus.ACTIVE },
          take: 1,
          select: {
            teacher: { select: { user: { select: { email: true } } } },
          },
        },
      },
    });

    const map = new Map<
      string,
      { subjectCode: string; teacherEmail: string }
    >();

    for (const section of sections) {
      const classCode = section.homeroomClass?.code;
      const subjectCode = section.gradeLevelSubject.subject.code;
      if (!classCode || !subjectCode) {
        continue;
      }

      map.set(`${classCode}:${subjectCode}`.toUpperCase(), {
        subjectCode,
        teacherEmail:
          section.teachingAssignments[0]?.teacher.user?.email ?? '',
      });
    }

    return map;
  }

  private async loadPreviousYearTimetableByClassCode(
    schoolId: string,
    targetYearStart: Date,
  ): Promise<
    Map<
      string,
      Array<{
        dayOfWeek: number;
        periodNumber: number;
        subjectCode: string;
        room: string | null;
      }>
    >
  > {
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

    const entries = await this.prisma.timetableEntry.findMany({
      where: {
        schoolId,
        status: AcademicEntityStatus.ACTIVE,
        dayOfWeek: { in: [1, 2, 3, 4, 5] },
        courseSection: {
          semesterId: sourceSemester.id,
          status: AcademicEntityStatus.ACTIVE,
          homeroomClassId: { not: null },
        },
      },
      select: {
        dayOfWeek: true,
        periodNumber: true,
        room: true,
        courseSection: {
          select: {
            homeroomClass: { select: { code: true } },
            gradeLevelSubject: {
              select: { subject: { select: { code: true } } },
            },
          },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { periodNumber: 'asc' }],
    });

    const map = new Map<
      string,
      Array<{
        dayOfWeek: number;
        periodNumber: number;
        subjectCode: string;
        room: string | null;
      }>
    >();

    for (const entry of entries) {
      const classCode = entry.courseSection.homeroomClass?.code;
      const subjectCode = entry.courseSection.gradeLevelSubject.subject.code;
      if (!classCode || !subjectCode) {
        continue;
      }

      const list = map.get(classCode) ?? [];
      list.push({
        dayOfWeek: entry.dayOfWeek,
        periodNumber: entry.periodNumber,
        subjectCode,
        room: entry.room,
      });
      map.set(classCode, list);
    }

    return map;
  }

  private async buildWorkbookFromClasses(
    classes: TemplateClassSheet[],
    instructionLines: string[],
  ): Promise<Buffer> {
    const builder = new WorkbookBuilder();
    const usedSheetNames = new Set<string>();

    for (const sampleClass of classes) {
      const matrixEntries: TimetableMatrixEntry[] = sampleClass.entries.map(
        (entry) => ({
          dayOfWeek: entry.dayOfWeek,
          periodNumber: entry.periodNumber,
          courseSectionCode: entry.subjectCode,
          courseSectionName: entry.subjectCode,
          teacherFullName: '',
          room: entry.room,
        }),
      );

      const matrix = buildTimetableMatrix(matrixEntries, (entry) =>
        formatTimetableImportCell(entry.courseSectionCode, entry.room),
      );

      builder.addSheetFromRowsWithMetadata(
        allocateExcelSheetName(sampleClass.code, usedSheetNames),
        matrix.columns,
        matrix.rows,
        {
          title: 'THỜI KHÓA BIỂU',
          lines: [
            {
              label: 'Lớp HC',
              value: formatHomeroomClassLabel(
                sampleClass.code,
                sampleClass.name,
              ),
            },
            { label: 'Năm học', value: sampleClass.academicYearName },
            { label: 'Học kỳ', value: sampleClass.semesterName },
            {
              label: 'Số tiết',
              value: String(sampleClass.entries.length),
            },
            {
              label: 'Ghi chú',
              value: sampleClass.filledFromPreviousYear
                ? 'Đã điền từ TKB HK2 năm trước (chỉ mã môn)'
                : sampleClass.isEntryGrade
                  ? 'Khối đầu cấp — gợi ý mã môn từ phân công'
                  : sampleClass.entries.length > 0
                    ? 'Gợi ý mã môn từ phân công / mẫu'
                    : 'Chưa có lớp môn + GV — điền tay',
            },
          ],
        },
      );
    }

    builder.addInstructionSheet(
      TIMETABLE_IMPORT_INSTRUCTION_SHEET_NAME,
      instructionLines,
    );

    return builder.toBuffer();
  }
}
