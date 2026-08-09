import type { AcademicEntityStatus } from '@prisma/client';

import type { PrismaService } from '@/common/database/prisma.service';
import type { SpreadsheetSheetMetadata } from '@/common/files/file-format.types';
import type { ExportTeachersQuery } from '@/modules/exports/schemas/teachers-export.schema';

const ALL_LABEL = 'Tất cả';

const TEACHER_STATUS_LABELS: Record<AcademicEntityStatus, string> = {
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Ngưng hoạt động',
};

function formatExportTimestamp(date: Date): string {
  return date.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function spreadsheetMetadataToCsvPreamble(
  metadata: SpreadsheetSheetMetadata,
): string[] {
  return [
    metadata.title,
    ...metadata.lines.map((line) => `${line.label}: ${line.value}`),
  ];
}

export async function buildTeachersExportMetadata(
  prisma: PrismaService,
  schoolId: string,
  query: ExportTeachersQuery,
  totalCount: number,
): Promise<SpreadsheetSheetMetadata> {
  const school = await prisma.school.findFirst({
    where: { id: schoolId },
    select: { name: true },
  });

  return {
    title: 'DANH SÁCH GIÁO VIÊN',
    lines: [
      { label: 'Trường', value: school?.name ?? '—' },
      {
        label: 'Trạng thái',
        value: query.status ? TEACHER_STATUS_LABELS[query.status] : ALL_LABEL,
      },
      {
        label: 'Tìm kiếm',
        value: query.search?.trim() ? query.search.trim() : '—',
      },
      {
        label: 'Tổng số giáo viên',
        value: String(totalCount),
      },
      {
        label: 'Ngày xuất',
        value: formatExportTimestamp(new Date()),
      },
    ],
  };
}
