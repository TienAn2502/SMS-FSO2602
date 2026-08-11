import { HttpStatus, Injectable } from '@nestjs/common';
import { AcademicEntityStatus, Gender } from '@prisma/client';

import { PrismaService } from '@/common/database/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import { WorkbookBuilder } from '@/common/files/workbook-builder.util';
import { toIsoDateString } from '@/common/schemas/academic.schema';
import { ClassPlacementService } from '@/modules/class-placement/class-placement.service';
import {
  CLASS_PLACEMENT_IMPORT_COLUMNS,
  CLASS_PLACEMENT_IMPORT_INSTRUCTION_LINES,
  CLASS_PLACEMENT_IMPORT_SAMPLE_BY_SHEET,
  buildClassPlacementImportInstructionLines,
} from '@/modules/imports/constants/class-placement-import.constants';
import type { ClassPlacementImportTemplateQuery } from '@/modules/imports/schemas/class-placement-import.schema';
import { suggestClassPlacementSheets } from '@/modules/imports/utils/suggest-class-placement-sheets.util';

function formatGender(gender: Gender | string | null | undefined): string {
  if (gender === Gender.MALE || gender === 'MALE') {
    return 'Nam';
  }
  if (gender === Gender.FEMALE || gender === 'FEMALE') {
    return 'Nữ';
  }
  if (gender === Gender.OTHER || gender === 'OTHER') {
    return 'Khác';
  }
  return '';
}

@Injectable()
export class ClassPlacementImportTemplateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classPlacementService: ClassPlacementService,
  ) {}

  async buildTemplateBuffer(
    schoolId: string,
    query: ClassPlacementImportTemplateQuery,
  ): Promise<Buffer> {
    if (query.academicYearId && query.semesterId) {
      return this.buildFromUnassignedPool(
        schoolId,
        query.academicYearId,
        query.semesterId,
      );
    }

    return this.buildStaticSampleBuffer();
  }

  private async buildStaticSampleBuffer(): Promise<Buffer> {
    const builder = new WorkbookBuilder();

    for (const [sheetName, rows] of Object.entries(
      CLASS_PLACEMENT_IMPORT_SAMPLE_BY_SHEET,
    )) {
      builder.addSheetFromRows(
        sheetName,
        CLASS_PLACEMENT_IMPORT_COLUMNS,
        rows,
      );
    }

    builder.addInstructionSheet(
      'Huong_dan',
      CLASS_PLACEMENT_IMPORT_INSTRUCTION_LINES,
    );

    return builder.toBuffer();
  }

  private async buildFromUnassignedPool(
    schoolId: string,
    academicYearId: string,
    semesterId: string,
  ): Promise<Buffer> {
    const semester = await this.prisma.semester.findFirst({
      where: { id: semesterId, schoolId, academicYearId },
      select: {
        id: true,
        code: true,
        name: true,
        academicYear: { select: { name: true } },
      },
    });

    if (!semester) {
      throw new AppException(
        'SEMESTER_NOT_FOUND',
        'Học kỳ không thuộc năm học đã chọn',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const pool = await this.classPlacementService.getUnassignedPool(
      schoolId,
      academicYearId,
      semesterId,
    );

    const gradeLevels = await this.prisma.gradeLevel.findMany({
      where: { schoolId },
      select: { id: true, code: true },
      orderBy: { code: 'asc' },
    });
    const entryGrade = [...gradeLevels].sort(
      (a, b) => Number(a.code) - Number(b.code),
    )[0];

    const entryClasses = entryGrade
      ? await this.prisma.homeroomClass.findMany({
          where: {
            schoolId,
            academicYearId,
            gradeLevelId: entryGrade.id,
            status: AcademicEntityStatus.ACTIVE,
          },
          select: { code: true },
          orderBy: { code: 'asc' },
        })
      : [];

    const sheetMap = suggestClassPlacementSheets(pool, {
      entryGradeCode: entryGrade?.code ?? null,
      entryClassCodes: entryClasses.map((row) => row.code),
    });

    const studentIds = pool.map((row) => row.studentId);
    const students = await this.prisma.student.findMany({
      where: { schoolId, id: { in: studentIds } },
      select: {
        id: true,
        fullName: true,
        dateOfBirth: true,
        gender: true,
        externalCode: true,
        user: { select: { email: true } },
      },
    });
    const studentById = new Map(students.map((row) => [row.id, row] as const));

    const builder = new WorkbookBuilder();
    let included = 0;
    let skippedNoDob = 0;
    let skippedNoKey = 0;
    let retainedCount = 0;
    let newIntakeCount = 0;

    const reasonByStudentId = new Map(
      pool.map((row) => [row.studentId, row.reason] as const),
    );

    const sortedSheets = [...sheetMap.entries()].sort(([a], [b]) =>
      a.localeCompare(b, 'vi'),
    );

    for (const [sheetName, ids] of sortedSheets) {
      const rows: Record<string, string>[] = [];

      for (const studentId of ids) {
        const student = studentById.get(studentId);
        if (!student) {
          continue;
        }

        const hasKey = Boolean(student.externalCode || student.user?.email);
        if (!hasKey) {
          skippedNoKey += 1;
          continue;
        }

        if (!student.dateOfBirth) {
          skippedNoDob += 1;
          continue;
        }

        const reason = reasonByStudentId.get(studentId);
        if (reason === 'RETAINED') {
          retainedCount += 1;
        } else {
          newIntakeCount += 1;
        }

        rows.push({
          ho_ten: student.fullName,
          ngay_sinh: toIsoDateString(student.dateOfBirth),
          gioi_tinh: formatGender(student.gender),
          email: student.user?.email ?? '',
          mat_khau: '',
          external_code: student.externalCode ?? '',
        });
        included += 1;
      }

      if (rows.length === 0) {
        continue;
      }

      builder.addSheetFromRows(
        sheetName.slice(0, 31),
        CLASS_PLACEMENT_IMPORT_COLUMNS,
        rows,
      );
    }

    if (included === 0) {
      for (const [sheetName, rows] of Object.entries(
        CLASS_PLACEMENT_IMPORT_SAMPLE_BY_SHEET,
      )) {
        builder.addSheetFromRows(
          sheetName,
          CLASS_PLACEMENT_IMPORT_COLUMNS,
          rows,
        );
      }
    }

    builder.addInstructionSheet(
      'Huong_dan',
      buildClassPlacementImportInstructionLines({
        academicYearName: semester.academicYear.name,
        semesterLabel: `${semester.code} — ${semester.name}`,
        included,
        retainedCount,
        newIntakeCount,
        skippedNoDob,
        skippedNoKey,
        usedStaticFallback: included === 0,
      }),
    );

    return builder.toBuffer();
  }
}
