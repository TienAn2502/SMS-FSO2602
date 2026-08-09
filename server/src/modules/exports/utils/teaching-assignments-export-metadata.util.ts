import type { AcademicEntityStatus } from '@prisma/client';

import type { PrismaService } from '@/common/database/prisma.service';
import type { SpreadsheetSheetMetadata } from '@/common/files/file-format.types';
import type { ExportTeachingAssignmentsQuery } from '@/modules/exports/schemas/teaching-assignments-export.schema';

const ALL_LABEL = 'Tất cả';

const ASSIGNMENT_STATUS_LABELS: Record<AcademicEntityStatus, string> = {
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

export async function buildTeachingAssignmentsExportMetadata(
  prisma: PrismaService,
  schoolId: string,
  query: ExportTeachingAssignmentsQuery,
  totalCount: number,
): Promise<SpreadsheetSheetMetadata> {
  const [school, academicYear, semester, teacher] = await Promise.all([
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
    query.teacherId
      ? prisma.teacher.findFirst({
          where: { id: query.teacherId, schoolId },
          select: { fullName: true },
        })
      : Promise.resolve(null),
  ]);

  return {
    title: 'DANH SÁCH PHÂN CÔNG GIẢNG DẠY',
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
        label: 'Giáo viên',
        value: teacher?.fullName ?? ALL_LABEL,
      },
      {
        label: 'Trạng thái',
        value: query.status
          ? ASSIGNMENT_STATUS_LABELS[query.status]
          : ALL_LABEL,
      },
      {
        label: 'Tìm kiếm',
        value: query.search?.trim() ? query.search.trim() : '—',
      },
      {
        label: 'Tổng số phân công',
        value: String(totalCount),
      },
      {
        label: 'Ngày xuất',
        value: formatExportTimestamp(new Date()),
      },
    ],
  };
}
