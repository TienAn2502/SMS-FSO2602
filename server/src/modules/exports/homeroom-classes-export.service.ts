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
  HOMEROOM_CLASS_EXPORT_COLUMNS,
  HOMEROOM_CLASS_EXPORT_FILENAMES,
  HOMEROOM_CLASS_EXPORT_SHEET_NAME,
} from '@/modules/exports/constants/homeroom-classes-export.constants';
import type { ExportHomeroomClassesQuery } from '@/modules/exports/schemas/homeroom-classes-export.schema';
import {
  buildHomeroomClassesExportMetadata,
  spreadsheetMetadataToCsvPreamble,
} from '@/modules/exports/utils/homeroom-classes-export-metadata.util';

export interface HomeroomClassesExportFile {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

const homeroomClassExportInclude = {
  academicYear: {
    select: { name: true },
  },
  gradeLevel: {
    select: { code: true, name: true },
  },
  homeroomTeacher: {
    select: {
      fullName: true,
      user: { select: { email: true } },
    },
  },
} as const;

type HomeroomClassForExport = Prisma.HomeroomClassGetPayload<{
  include: typeof homeroomClassExportInclude;
}>;

@Injectable()
export class HomeroomClassesExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportHomeroomClasses(
    schoolId: string,
    query: ExportHomeroomClassesQuery,
  ): Promise<HomeroomClassesExportFile> {
    const homeroomClasses = await this.findHomeroomClassesForExport(
      schoolId,
      query,
    );
    const rows = homeroomClasses.map((homeroomClass) =>
      this.toExportRow(homeroomClass),
    );
    const metadata = await buildHomeroomClassesExportMetadata(
      this.prisma,
      schoolId,
      query,
      rows.length,
    );

    const buffer =
      query.format === 'csv'
        ? createCsvBuffer({
            columns: HOMEROOM_CLASS_EXPORT_COLUMNS,
            rows,
            preambleLines: spreadsheetMetadataToCsvPreamble(metadata),
          })
        : await new WorkbookBuilder()
            .addSheetFromRowsWithMetadata(
              HOMEROOM_CLASS_EXPORT_SHEET_NAME,
              HOMEROOM_CLASS_EXPORT_COLUMNS,
              rows,
              metadata,
            )
            .toBuffer();

    return {
      buffer,
      contentType:
        query.format === 'csv' ? getCsvContentType() : getXlsxContentType(),
      filename: HOMEROOM_CLASS_EXPORT_FILENAMES[query.format],
    };
  }

  private async findHomeroomClassesForExport(
    schoolId: string,
    query: ExportHomeroomClassesQuery,
  ): Promise<HomeroomClassForExport[]> {
    const where: Prisma.HomeroomClassWhereInput = {
      schoolId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.academicYearId ? { academicYearId: query.academicYearId } : {}),
      ...(query.gradeLevelId ? { gradeLevelId: query.gradeLevelId } : {}),
      ...(query.search
        ? {
            OR: [
              {
                name: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                code: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.HomeroomClassOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    return this.prisma.homeroomClass.findMany({
      where,
      orderBy,
      include: homeroomClassExportInclude,
    });
  }

  private toExportRow(homeroomClass: HomeroomClassForExport) {
    return {
      ma_lop_hc: homeroomClass.code,
      ten_lop: homeroomClass.name,
      ma_khoi: homeroomClass.gradeLevel.code,
      ten_khoi: homeroomClass.gradeLevel.name,
      nam_hoc: homeroomClass.academicYear.name,
      si_so: homeroomClass.capacity?.toString() ?? '',
      ho_ten_gvcn: homeroomClass.homeroomTeacher?.fullName ?? '',
      email_gvcn: homeroomClass.homeroomTeacher?.user?.email ?? '',
      trang_thai: homeroomClass.status,
    };
  }
}
