import type { AcademicEntityStatus } from '@prisma/client';

import type { PrismaService } from '@/common/database/prisma.service';
import type { SpreadsheetSheetMetadata } from '@/common/files/file-format.types';
import type { ExportHomeroomClassesQuery } from '@/modules/exports/schemas/homeroom-classes-export.schema';

const ALL_LABEL = 'Tất cả';

const HOMEROOM_CLASS_STATUS_LABELS: Record<AcademicEntityStatus, string> = {
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

export async function buildHomeroomClassesExportMetadata(
  prisma: PrismaService,
  schoolId: string,
  query: ExportHomeroomClassesQuery,
  totalCount: number,
): Promise<SpreadsheetSheetMetadata> {
  const [school, academicYear, gradeLevel] = await Promise.all([
    prisma.school.findFirst({
      where: { id: schoolId },
      select: { name: true },
    }),
    query.academicYearId
      ? prisma.academicYear.findFirst({
          where: { id: query.academicYearId, schoolId },
          select: { name: true },
        })
      : Promise.resolve(null),
    query.gradeLevelId
      ? prisma.gradeLevel.findFirst({
          where: { id: query.gradeLevelId, schoolId },
          select: { name: true, code: true },
        })
      : Promise.resolve(null),
  ]);

  const gradeLevelLabel = gradeLevel
    ? `${gradeLevel.code} (${gradeLevel.name})`
    : ALL_LABEL;

  return {
    title: 'DANH SÁCH LỚP HÀNH CHÍNH',
    lines: [
      { label: 'Trường', value: school?.name ?? '—' },
      {
        label: 'Năm học',
        value: academicYear?.name ?? ALL_LABEL,
      },
      {
        label: 'Khối',
        value: gradeLevelLabel,
      },
      {
        label: 'Trạng thái',
        value: query.status
          ? HOMEROOM_CLASS_STATUS_LABELS[query.status]
          : ALL_LABEL,
      },
      {
        label: 'Tìm kiếm',
        value: query.search?.trim() ? query.search.trim() : '—',
      },
      {
        label: 'Tổng số lớp HC',
        value: String(totalCount),
      },
      {
        label: 'Ngày xuất',
        value: formatExportTimestamp(new Date()),
      },
    ],
  };
}
