import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import {
  createCsvBuffer,
  getCsvContentType,
  getXlsxContentType,
} from '@/common/files/csv-writer.util';
import { WorkbookBuilder } from '@/common/files/workbook-builder.util';
import { PrismaService } from '@/common/database/prisma.service';
import { toIsoDateString } from '@/common/schemas/academic.schema';
import {
  TEACHING_ASSIGNMENT_EXPORT_COLUMNS,
  TEACHING_ASSIGNMENT_EXPORT_FILENAMES,
  TEACHING_ASSIGNMENT_EXPORT_SHEET_NAME,
} from '@/modules/exports/constants/teaching-assignments-export.constants';
import type { ExportTeachingAssignmentsQuery } from '@/modules/exports/schemas/teaching-assignments-export.schema';
import {
  buildTeachingAssignmentsExportMetadata,
  spreadsheetMetadataToCsvPreamble,
} from '@/modules/exports/utils/teaching-assignments-export-metadata.util';

export interface TeachingAssignmentsExportFile {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

const teachingAssignmentExportInclude = {
  teacher: {
    select: {
      fullName: true,
      user: { select: { email: true } },
    },
  },
  courseSection: {
    select: {
      code: true,
      name: true,
      semester: {
        select: {
          name: true,
          academicYear: { select: { name: true } },
        },
      },
    },
  },
} as const;

type TeachingAssignmentForExport = Prisma.TeachingAssignmentGetPayload<{
  include: typeof teachingAssignmentExportInclude;
}>;

@Injectable()
export class TeachingAssignmentsExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportTeachingAssignments(
    schoolId: string,
    query: ExportTeachingAssignmentsQuery,
  ): Promise<TeachingAssignmentsExportFile> {
    const assignments = await this.findAssignmentsForExport(schoolId, query);
    const rows = assignments.map((assignment) =>
      this.toExportRow(assignment),
    );
    const metadata = await buildTeachingAssignmentsExportMetadata(
      this.prisma,
      schoolId,
      query,
      rows.length,
    );

    const buffer =
      query.format === 'csv'
        ? createCsvBuffer({
            columns: TEACHING_ASSIGNMENT_EXPORT_COLUMNS,
            rows,
            preambleLines: spreadsheetMetadataToCsvPreamble(metadata),
          })
        : await new WorkbookBuilder()
            .addSheetFromRowsWithMetadata(
              TEACHING_ASSIGNMENT_EXPORT_SHEET_NAME,
              TEACHING_ASSIGNMENT_EXPORT_COLUMNS,
              rows,
              metadata,
            )
            .toBuffer();

    return {
      buffer,
      contentType:
        query.format === 'csv' ? getCsvContentType() : getXlsxContentType(),
      filename: TEACHING_ASSIGNMENT_EXPORT_FILENAMES[query.format],
    };
  }

  private async findAssignmentsForExport(
    schoolId: string,
    query: ExportTeachingAssignmentsQuery,
  ): Promise<TeachingAssignmentForExport[]> {
    const courseSectionFilter = this.buildCourseSectionFilter(query);

    const where: Prisma.TeachingAssignmentWhereInput = {
      schoolId,
      ...(query.teacherId ? { teacherId: query.teacherId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              {
                teacher: {
                  fullName: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              },
              {
                courseSection: {
                  code: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              },
              {
                courseSection: {
                  name: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              },
            ],
          }
        : {}),
      ...(courseSectionFilter ? { courseSection: courseSectionFilter } : {}),
    };

    const orderBy: Prisma.TeachingAssignmentOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    return this.prisma.teachingAssignment.findMany({
      where,
      orderBy,
      include: teachingAssignmentExportInclude,
    });
  }

  private buildCourseSectionFilter(
    query: ExportTeachingAssignmentsQuery,
  ): Prisma.CourseSectionWhereInput | undefined {
    if (query.semesterId) {
      return { semesterId: query.semesterId };
    }

    if (query.academicYearId) {
      return {
        semester: {
          academicYearId: query.academicYearId,
        },
      };
    }

    return undefined;
  }

  private toExportRow(assignment: TeachingAssignmentForExport) {
    return {
      email_gv: assignment.teacher.user?.email ?? '',
      ho_ten_gv: assignment.teacher.fullName,
      ma_lop_mon: assignment.courseSection.code,
      ten_lop_mon: assignment.courseSection.name,
      hoc_ky: assignment.courseSection.semester.name,
      nam_hoc: assignment.courseSection.semester.academicYear.name,
      ngay_phan_cong: toIsoDateString(assignment.assignAt),
      ngay_ket_thuc: assignment.endAt
        ? toIsoDateString(assignment.endAt)
        : '',
      trang_thai: assignment.status,
    };
  }
}
