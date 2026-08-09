import type { AcademicEntityStatus } from '@prisma/client';

import type { PrismaService } from '@/common/database/prisma.service';
import type { SpreadsheetSheetMetadata } from '@/common/files/file-format.types';
import type { ExportStudentsQuery } from '@/modules/exports/schemas/students-export.schema';

const ALL_LABEL = 'Tất cả';

const STUDENT_STATUS_LABELS: Record<AcademicEntityStatus, string> = {
  ACTIVE: 'Đang học',
  INACTIVE: 'Ngưng học',
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

function toMetadataLines(metadata: SpreadsheetSheetMetadata): string[] {
  return [
    metadata.title,
    ...metadata.lines.map((line) => `${line.label}: ${line.value}`),
  ];
}

export function spreadsheetMetadataToCsvPreamble(
  metadata: SpreadsheetSheetMetadata,
): string[] {
  return toMetadataLines(metadata);
}

export async function buildStudentsExportMetadata(
  prisma: PrismaService,
  schoolId: string,
  query: ExportStudentsQuery,
  totalCount: number,
): Promise<SpreadsheetSheetMetadata> {
  const [school, academicYear, semester, homeroomClass] = await Promise.all([
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
    query.semesterId
      ? prisma.semester.findFirst({
          where: { id: query.semesterId, schoolId },
          select: { name: true },
        })
      : Promise.resolve(null),
    query.homeroomClassId
      ? prisma.homeroomClass.findFirst({
          where: { id: query.homeroomClassId, schoolId },
          select: { code: true, name: true },
        })
      : Promise.resolve(null),
  ]);

  const homeroomClassLabel = homeroomClass
    ? homeroomClass.name
      ? `${homeroomClass.code} (${homeroomClass.name})`
      : homeroomClass.code
    : ALL_LABEL;

  return {
    title: 'DANH SÁCH HỌC SINH',
    lines: [
      { label: 'Trường', value: school?.name ?? '—' },
      {
        label: 'Năm học',
        value: academicYear?.name ?? ALL_LABEL,
      },
      {
        label: 'Học kỳ',
        value: semester?.name ?? ALL_LABEL,
      },
      {
        label: 'Lớp hành chính',
        value: homeroomClassLabel,
      },
      {
        label: 'Trạng thái học sinh',
        value: query.status ? STUDENT_STATUS_LABELS[query.status] : ALL_LABEL,
      },
      {
        label: 'Tìm kiếm',
        value: query.search?.trim() ? query.search.trim() : '—',
      },
      {
        label: 'Tổng số học sinh',
        value: String(totalCount),
      },
      {
        label: 'Ngày xuất',
        value: formatExportTimestamp(new Date()),
      },
    ],
  };
}
