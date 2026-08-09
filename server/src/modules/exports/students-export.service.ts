import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import {
  createCsvBuffer,
  getCsvContentType,
  getXlsxContentType,
} from '@/common/files/csv-writer.util';
import { WorkbookBuilder } from '@/common/files/workbook-builder.util';
import { PrismaService } from '@/common/database/prisma.service';
import { STUDENT_YEAR_ENROLLMENT_STATUSES } from '@/common/utils/enrollment-status.util';
import {
  STUDENT_EXPORT_COLUMNS,
  STUDENT_EXPORT_FILENAMES,
  STUDENT_EXPORT_SHEET_NAME,
} from '@/modules/exports/constants/students-export.constants';
import type { ExportStudentsQuery } from '@/modules/exports/schemas/students-export.schema';
import {
  buildStudentsExportMetadata,
  spreadsheetMetadataToCsvPreamble,
} from '@/modules/exports/utils/students-export-metadata.util';
import {
  pickCurrentEnrollment,
  studentInclude,
  toStudentResponse,
} from '@/modules/students/mappers/student.mapper';

export interface StudentsExportFile {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

type StudentForExport = Prisma.StudentGetPayload<{
  include: typeof studentInclude;
}>;

@Injectable()
export class StudentsExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportStudents(
    schoolId: string,
    query: ExportStudentsQuery,
  ): Promise<StudentsExportFile> {
    const students = await this.findStudentsForExport(schoolId, query);
    const rows = students.map((student) => this.toExportRow(student, query));
    const metadata = await buildStudentsExportMetadata(
      this.prisma,
      schoolId,
      query,
      rows.length,
    );

    const buffer =
      query.format === 'csv'
        ? createCsvBuffer({
            columns: STUDENT_EXPORT_COLUMNS,
            rows,
            preambleLines: spreadsheetMetadataToCsvPreamble(metadata),
          })
        : await new WorkbookBuilder()
            .addSheetFromRowsWithMetadata(
              STUDENT_EXPORT_SHEET_NAME,
              STUDENT_EXPORT_COLUMNS,
              rows,
              metadata,
            )
            .toBuffer();

    return {
      buffer,
      contentType:
        query.format === 'csv' ? getCsvContentType() : getXlsxContentType(),
      filename: STUDENT_EXPORT_FILENAMES[query.format],
    };
  }

  private async findStudentsForExport(
    schoolId: string,
    query: ExportStudentsQuery,
  ): Promise<StudentForExport[]> {
    const where: Prisma.StudentWhereInput = {
      schoolId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              {
                fullName: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                user: {
                  email: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              },
              {
                externalCode: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
      ...(query.homeroomClassId || query.semesterId || query.academicYearId
        ? {
            enrollments: {
              some: {
                status: { in: STUDENT_YEAR_ENROLLMENT_STATUSES },
                ...(query.homeroomClassId
                  ? { homeroomClassId: query.homeroomClassId }
                  : {}),
                ...(query.semesterId ? { semesterId: query.semesterId } : {}),
                ...(query.academicYearId
                  ? {
                      semester: {
                        academicYearId: query.academicYearId,
                      },
                    }
                  : {}),
              },
            },
          }
        : {}),
    };

    const orderBy: Prisma.StudentOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    return this.prisma.student.findMany({
      where,
      orderBy,
      include: studentInclude,
    });
  }

  private toExportRow(student: StudentForExport, query: ExportStudentsQuery) {
    const response = toStudentResponse(student);
    const enrollment = this.pickEnrollmentForExport(student.enrollments, query);

    return {
      ho_ten: response.fullName,
      ngay_sinh: response.dateOfBirth ?? '',
      gioi_tinh: response.gender ?? '',
      email: response.userEmail ?? '',
      ma_lop_hc: enrollment?.homeroomClass.code ?? '',
      external_code: response.externalCode ?? '',
      trang_thai: response.status,
    };
  }

  private pickEnrollmentForExport(
    enrollments: StudentForExport['enrollments'],
    query: ExportStudentsQuery,
  ) {
    const eligible = enrollments.filter((enrollment) =>
      STUDENT_YEAR_ENROLLMENT_STATUSES.includes(enrollment.status),
    );

    if (query.semesterId) {
      return (
        eligible.find(
          (enrollment) => enrollment.semesterId === query.semesterId,
        ) ?? null
      );
    }

    if (query.academicYearId) {
      const inYear = eligible.filter(
        (enrollment) =>
          enrollment.semester.academicYear.id === query.academicYearId,
      );

      const activeCurrent = inYear.find(
        (enrollment) =>
          enrollment.status === 'ACTIVE' && enrollment.semester.isCurrent,
      );

      if (activeCurrent) {
        return activeCurrent;
      }

      return inYear[0] ?? null;
    }

    return pickCurrentEnrollment(eligible);
  }
}
