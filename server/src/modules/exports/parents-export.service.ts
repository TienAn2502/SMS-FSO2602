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
  PARENT_EXPORT_COLUMNS,
  PARENT_EXPORT_FILENAMES,
  PARENT_EXPORT_SHEET_NAME,
} from '@/modules/exports/constants/parents-export.constants';
import type { ExportParentsQuery } from '@/modules/exports/schemas/parents-export.schema';
import {
  buildParentsExportMetadata,
  spreadsheetMetadataToCsvPreamble,
} from '@/modules/exports/utils/parents-export-metadata.util';

export interface ParentsExportFile {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

const parentExportInclude = {
  user: {
    select: { email: true },
  },
  studentParents: {
    include: {
      student: {
        select: { externalCode: true },
      },
    },
    orderBy: { student: { fullName: 'asc' as const } },
  },
} as const;

type ParentForExport = Prisma.ParentGetPayload<{
  include: typeof parentExportInclude;
}>;

@Injectable()
export class ParentsExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportParents(
    schoolId: string,
    query: ExportParentsQuery,
  ): Promise<ParentsExportFile> {
    const parents = await this.findParentsForExport(schoolId, query);
    const rows = parents.flatMap((parent) => this.toExportRows(parent));
    const metadata = await buildParentsExportMetadata(
      this.prisma,
      schoolId,
      query,
      rows.length,
    );

    const buffer =
      query.format === 'csv'
        ? createCsvBuffer({
            columns: PARENT_EXPORT_COLUMNS,
            rows,
            preambleLines: spreadsheetMetadataToCsvPreamble(metadata),
          })
        : await new WorkbookBuilder()
            .addSheetFromRowsWithMetadata(
              PARENT_EXPORT_SHEET_NAME,
              PARENT_EXPORT_COLUMNS,
              rows,
              metadata,
            )
            .toBuffer();

    return {
      buffer,
      contentType:
        query.format === 'csv' ? getCsvContentType() : getXlsxContentType(),
      filename: PARENT_EXPORT_FILENAMES[query.format],
    };
  }

  private async findParentsForExport(
    schoolId: string,
    query: ExportParentsQuery,
  ): Promise<ParentForExport[]> {
    const where: Prisma.ParentWhereInput = {
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
                externalCode: {
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

    const orderBy: Prisma.ParentOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    return this.prisma.parent.findMany({
      where,
      orderBy,
      include: parentExportInclude,
    });
  }

  private toExportRows(parent: ParentForExport) {
    const base = {
      ma_ph: parent.externalCode ?? '',
      ho_ten: parent.fullName,
      phone: parent.phone ?? '',
      email: parent.user?.email ?? '',
      trang_thai: parent.status,
    };

    if (parent.studentParents.length === 0) {
      return [
        {
          ...base,
          ma_hs: '',
          quan_he: '',
          lien_he_chinh: '',
        },
      ];
    }

    return parent.studentParents.map((link) => ({
      ...base,
      ma_hs: link.student.externalCode ?? '',
      quan_he: link.relationship,
      lien_he_chinh: link.isPrimaryContact ? '1' : '0',
    }));
  }
}
