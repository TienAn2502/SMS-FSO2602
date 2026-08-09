import { Injectable } from '@nestjs/common';
import { AcademicEntityStatus } from '@prisma/client';

import { WorkbookBuilder } from '@/common/files/workbook-builder.util';
import { PrismaService } from '@/common/database/prisma.service';
import {
  TEACHING_ASSIGNMENT_IMPORT_COLUMNS,
  TEACHING_ASSIGNMENT_IMPORT_INSTRUCTION_LINES,
  TEACHING_ASSIGNMENT_IMPORT_SAMPLE_ROWS,
  TEACHING_ASSIGNMENT_IMPORT_SHEET_NAME,
} from '@/modules/imports/constants/teaching-assignments-import.constants';
import type { TeachingAssignmentsImportTemplateQuery } from '@/modules/imports/schemas/teaching-assignments-import.schema';

@Injectable()
export class TeachingAssignmentsImportTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async buildTemplateBuffer(
    schoolId: string,
    query: TeachingAssignmentsImportTemplateQuery,
  ): Promise<Buffer> {
    const sampleRows = await this.resolveSampleRows(schoolId, query);

    const builder = new WorkbookBuilder();
    builder.addSheetFromRows(
      TEACHING_ASSIGNMENT_IMPORT_SHEET_NAME,
      TEACHING_ASSIGNMENT_IMPORT_COLUMNS,
      sampleRows,
    );
    builder.addInstructionSheet(
      'Huong_dan',
      TEACHING_ASSIGNMENT_IMPORT_INSTRUCTION_LINES,
    );
    return builder.toBuffer();
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
      TEACHING_ASSIGNMENT_IMPORT_INSTRUCTION_LINES,
    );
    return builder.toBuffer();
  }

  private async resolveSampleRows(
    schoolId: string,
    query: TeachingAssignmentsImportTemplateQuery,
  ): Promise<Record<string, string>[]> {
    if (!query.semesterId) {
      return TEACHING_ASSIGNMENT_IMPORT_SAMPLE_ROWS;
    }

    const [sections, assignments] = await Promise.all([
      this.prisma.courseSection.findMany({
        where: {
          schoolId,
          semesterId: query.semesterId,
          status: AcademicEntityStatus.ACTIVE,
        },
        take: 3,
        orderBy: { code: 'asc' },
        select: { code: true },
      }),
      this.prisma.teachingAssignment.findMany({
        where: {
          schoolId,
          status: AcademicEntityStatus.ACTIVE,
          courseSection: {
            semesterId: query.semesterId,
          },
        },
        take: 3,
        orderBy: { assignAt: 'asc' },
        select: {
          assignAt: true,
          courseSection: { select: { code: true } },
          teacher: {
            select: {
              user: { select: { email: true } },
            },
          },
        },
      }),
    ]);

    if (assignments.length > 0) {
      return assignments.map((assignment) => ({
        email_gv: assignment.teacher.user?.email ?? '',
        ma_lop_mon: assignment.courseSection.code,
        ngay_phan_cong: assignment.assignAt.toISOString().slice(0, 10),
      }));
    }

    if (sections.length > 0) {
      const teachers = await this.prisma.teacher.findMany({
        where: {
          schoolId,
          status: AcademicEntityStatus.ACTIVE,
          userId: { not: null },
        },
        take: sections.length,
        orderBy: { fullName: 'asc' },
        select: {
          user: { select: { email: true } },
        },
      });

      return sections.map((section, index) => ({
        email_gv: teachers[index]?.user?.email ?? '',
        ma_lop_mon: section.code,
        ngay_phan_cong: new Date().toISOString().slice(0, 10),
      }));
    }

    return TEACHING_ASSIGNMENT_IMPORT_SAMPLE_ROWS;
  }
}
