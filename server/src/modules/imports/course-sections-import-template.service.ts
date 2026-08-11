import { Injectable } from '@nestjs/common';
import { AcademicEntityStatus } from '@prisma/client';

import { PrismaService } from '@/common/database/prisma.service';
import { WorkbookBuilder } from '@/common/files/workbook-builder.util';
import {
  buildCourseSectionCode,
  buildCourseSectionName,
  COURSE_SECTION_IMPORT_COLUMNS,
  COURSE_SECTION_IMPORT_INSTRUCTION_LINES,
  COURSE_SECTION_IMPORT_SAMPLE_BY_SHEET,
} from '@/modules/imports/constants/course-sections-import.constants';
import type { CourseSectionsImportTemplateQuery } from '@/modules/imports/schemas/course-sections-import.schema';

@Injectable()
export class CourseSectionsImportTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async buildTemplateBuffer(
    schoolId: string,
    query: CourseSectionsImportTemplateQuery,
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

    for (const [sheetName, rows] of Object.entries(
      COURSE_SECTION_IMPORT_SAMPLE_BY_SHEET,
    )) {
      builder.addSheetFromRows(
        sheetName,
        COURSE_SECTION_IMPORT_COLUMNS,
        rows,
      );
    }

    builder.addInstructionSheet(
      'Huong_dan',
      [
        ...COURSE_SECTION_IMPORT_INSTRUCTION_LINES,
        '',
        'File mẫu tham khảo: docs/samples/course-sections-import-sample.xlsx',
      ],
    );

    return builder.toBuffer();
  }

  /**
   * Đủ mọi lớp HC ACTIVE của năm học kỳ.
   * - Khối đầu cấp (vd. 10): môn từ cấu hình grade_level_subjects (tạo mới).
   * - Khối trên (11/12): ưu tiên môn từ lớp môn HK2 năm trước (cùng mã lớp);
   *   thiếu thì fallback grade_level_subjects.
   */
  private async buildFromSemester(
    schoolId: string,
    semesterId: string,
  ): Promise<Buffer | null> {
    const semester = await this.prisma.semester.findFirst({
      where: { id: semesterId, schoolId },
      select: {
        id: true,
        academicYearId: true,
        academicYear: { select: { id: true, startDate: true } },
      },
    });

    if (!semester) {
      return null;
    }

    const gradeLevels = await this.prisma.gradeLevel.findMany({
      where: { schoolId },
      select: { id: true, code: true },
    });
    const entryGradeCode = [...gradeLevels]
      .map((row) => ({ code: row.code, value: Number(row.code) }))
      .filter((row) => Number.isFinite(row.value))
      .sort((a, b) => a.value - b.value)[0]?.code;
    const gradeCodeById = new Map(
      gradeLevels.map((row) => [row.id, row.code] as const),
    );
    const entryGradeIds = new Set(
      gradeLevels
        .filter((row) => row.code === entryGradeCode)
        .map((row) => row.id),
    );

    const classes = await this.prisma.homeroomClass.findMany({
      where: {
        schoolId,
        academicYearId: semester.academicYearId,
        status: AcademicEntityStatus.ACTIVE,
      },
      select: {
        code: true,
        gradeLevelId: true,
      },
      orderBy: { code: 'asc' },
    });

    if (classes.length === 0) {
      return null;
    }

    const gradeLevelIds = [...new Set(classes.map((row) => row.gradeLevelId))];
    const glsRows = await this.prisma.gradeLevelSubject.findMany({
      where: {
        schoolId,
        gradeLevelId: { in: gradeLevelIds },
        status: AcademicEntityStatus.ACTIVE,
      },
      select: {
        gradeLevelId: true,
        subject: { select: { code: true, name: true } },
      },
      orderBy: { subject: { code: 'asc' } },
    });

    const subjectsByGrade = new Map<
      string,
      Array<{ code: string; name: string }>
    >();
    for (const row of glsRows) {
      const list = subjectsByGrade.get(row.gradeLevelId) ?? [];
      list.push({ code: row.subject.code, name: row.subject.name });
      subjectsByGrade.set(row.gradeLevelId, list);
    }

    const previousYearSubjectsByClassCode =
      await this.loadPreviousYearSubjectsByClassCode(
        schoolId,
        semester.academicYear.startDate,
      );

    const builder = new WorkbookBuilder();
    let anySheet = false;
    let entryClassCount = 0;
    let upperClassCount = 0;
    let upperFromPrevYear = 0;

    for (const homeroom of classes) {
      const isEntry = entryGradeIds.has(homeroom.gradeLevelId);
      let subjects = subjectsByGrade.get(homeroom.gradeLevelId) ?? [];

      if (!isEntry) {
        const fromPrev = previousYearSubjectsByClassCode.get(homeroom.code);
        if (fromPrev && fromPrev.length > 0) {
          // Chỉ giữ môn còn cấu hình cho khối hiện tại
          const allowed = new Map(
            subjects.map((row) => [row.code.toUpperCase(), row] as const),
          );
          const filtered = fromPrev
            .map((code) => allowed.get(code.toUpperCase()))
            .filter((row): row is { code: string; name: string } =>
              Boolean(row),
            );
          if (filtered.length > 0) {
            subjects = filtered;
            upperFromPrevYear += 1;
          }
        }
        upperClassCount += 1;
      } else {
        entryClassCount += 1;
      }

      if (subjects.length === 0) {
        continue;
      }

      const rows = subjects.map((subject) => ({
        ma_mon: subject.code,
        ten_lop_mon: buildCourseSectionName(subject.name, homeroom.code),
        ma_lop_mon: buildCourseSectionCode(subject.code, homeroom.code),
        email_gv: '',
      }));

      builder.addSheetFromRows(
        homeroom.code.slice(0, 31),
        COURSE_SECTION_IMPORT_COLUMNS,
        rows,
      );
      anySheet = true;
    }

    if (!anySheet) {
      return null;
    }

    builder.addInstructionSheet(
      'Huong_dan',
      [
        ...COURSE_SECTION_IMPORT_INSTRUCTION_LINES,
        '',
        `File điền sẵn ${classes.length} lớp HC ACTIVE của năm học kỳ.`,
        entryGradeCode
          ? `Khối đầu cấp (${entryGradeCode}): ${entryClassCount} lớp — môn từ cấu hình khối (tạo mới).`
          : `Khối đầu cấp: ${entryClassCount} lớp — môn từ cấu hình khối.`,
        `Khối trên: ${upperClassCount} lớp — ${upperFromPrevYear} lớp lấy môn từ HK2 năm trước (đã lọc theo cấu hình khối hiện tại); còn lại dùng cấu hình khối.`,
        'Chỉnh sửa / xóa dòng / thêm email_gv trước khi import. Import luôn tạo record mới.',
      ],
    );

    return builder.toBuffer();
  }

  private async loadPreviousYearSubjectsByClassCode(
    schoolId: string,
    targetYearStart: Date,
  ): Promise<Map<string, string[]>> {
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

    const sections = await this.prisma.courseSection.findMany({
      where: {
        schoolId,
        semesterId: sourceSemester.id,
        status: AcademicEntityStatus.ACTIVE,
        homeroomClassId: { not: null },
      },
      select: {
        homeroomClass: { select: { code: true } },
        gradeLevelSubject: {
          select: { subject: { select: { code: true } } },
        },
      },
      orderBy: { code: 'asc' },
    });

    const map = new Map<string, string[]>();
    for (const section of sections) {
      const classCode = section.homeroomClass?.code;
      const subjectCode = section.gradeLevelSubject.subject.code;
      if (!classCode || !subjectCode) {
        continue;
      }
      const list = map.get(classCode) ?? [];
      if (!list.includes(subjectCode)) {
        list.push(subjectCode);
      }
      map.set(classCode, list);
    }

    return map;
  }
}
