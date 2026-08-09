import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import {
  createCsvBuffer,
  getCsvContentType,
  getXlsxContentType,
} from '@/common/files/csv-writer.util';
import { WorkbookBuilder } from '@/common/files/workbook-builder.util';
import { PrismaService } from '@/common/database/prisma.service';
import {
  TEACHER_EXPORT_COLUMNS,
  TEACHER_EXPORT_FILENAMES,
  TEACHER_EXPORT_SHEET_NAME,
} from '@/modules/exports/constants/teachers-export.constants';
import type { ExportTeachersQuery } from '@/modules/exports/schemas/teachers-export.schema';
import {
  buildTeachersExportMetadata,
  spreadsheetMetadataToCsvPreamble,
} from '@/modules/exports/utils/teachers-export-metadata.util';
import {
  teacherListInclude,
  toTeacherListResponse,
} from '@/modules/teachers/mappers/teacher.mapper';

export interface TeachersExportFile {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

type TeacherForExport = Prisma.TeacherGetPayload<{
  include: typeof teacherListInclude;
}>;

@Injectable()
export class TeachersExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportTeachers(
    schoolId: string,
    query: ExportTeachersQuery,
  ): Promise<TeachersExportFile> {
    const teachers = await this.findTeachersForExport(schoolId, query);
    const rows = teachers.map((teacher) => this.toExportRow(teacher));
    const metadata = await buildTeachersExportMetadata(
      this.prisma,
      schoolId,
      query,
      rows.length,
    );

    const buffer =
      query.format === 'csv'
        ? createCsvBuffer({
            columns: TEACHER_EXPORT_COLUMNS,
            rows,
            preambleLines: spreadsheetMetadataToCsvPreamble(metadata),
          })
        : await new WorkbookBuilder()
            .addSheetFromRowsWithMetadata(
              TEACHER_EXPORT_SHEET_NAME,
              TEACHER_EXPORT_COLUMNS,
              rows,
              metadata,
            )
            .toBuffer();

    return {
      buffer,
      contentType:
        query.format === 'csv' ? getCsvContentType() : getXlsxContentType(),
      filename: TEACHER_EXPORT_FILENAMES[query.format],
    };
  }

  private async findTeachersForExport(
    schoolId: string,
    query: ExportTeachersQuery,
  ): Promise<TeacherForExport[]> {
    const where: Prisma.TeacherWhereInput = {
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
            ],
          }
        : {}),
    };

    const orderBy: Prisma.TeacherOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    return this.prisma.teacher.findMany({
      where,
      orderBy,
      include: teacherListInclude,
    });
  }

  private toExportRow(teacher: TeacherForExport) {
    const response = toTeacherListResponse(teacher);

    return {
      ho_ten: response.fullName,
      ngay_sinh: response.dateOfBirth ?? '',
      gioi_tinh: response.gender ?? '',
      email: response.userEmail ?? '',
      phone: response.phone ?? '',
      chuyen_mon: response.specialization ?? '',
      dia_chi: response.address ?? '',
      trang_thai: response.status,
    };
  }
}
