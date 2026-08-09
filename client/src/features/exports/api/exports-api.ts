import { api } from '@/lib/api';
import type { AcademicEntityStatus } from '@/types/api.types';

export type ExportFormat = 'xlsx' | 'csv';

export interface ExportStudentsParams {
  format?: ExportFormat;
  search?: string;
  status?: AcademicEntityStatus;
  homeroomClassId?: string;
  semesterId?: string;
  academicYearId?: string;
}

export interface ExportTeachersParams {
  format?: ExportFormat;
  search?: string;
  status?: AcademicEntityStatus;
}

export interface ExportParentsParams {
  format?: ExportFormat;
  search?: string;
  status?: AcademicEntityStatus;
}

export interface ExportHomeroomClassesParams {
  format?: ExportFormat;
  search?: string;
  status?: AcademicEntityStatus;
  academicYearId?: string;
  gradeLevelId?: string;
}

export interface ExportTeachingAssignmentsParams {
  format?: ExportFormat;
  search?: string;
  status?: AcademicEntityStatus;
  teacherId?: string;
  semesterId?: string;
  academicYearId?: string;
}

export interface ExportEnrollmentsParams {
  format?: ExportFormat;
  studentId?: string;
  semesterId?: string;
  academicYearId?: string;
  homeroomClassId?: string;
  status?: string;
}

export interface ExportGradebookParams {
  format?: ExportFormat;
  courseSectionId: string;
}

export interface ExportSemesterSummariesParams {
  format?: ExportFormat;
  semesterId?: string;
  homeroomClassId?: string;
  status?: 'DRAFT' | 'CLOSED';
  search?: string;
}

export interface ExportYearSummariesParams {
  format?: ExportFormat;
  academicYearId?: string;
  homeroomClassId?: string;
  promotionDecision?: string;
  status?: 'DRAFT' | 'CLOSED';
  search?: string;
}

export interface ExportAttendanceParams {
  format?: ExportFormat;
  courseSectionId?: string;
  teacherId?: string;
  semesterId?: string;
  academicYearId?: string;
  homeroomClassId?: string;
  sessionDate?: string;
  fromDate?: string;
  toDate?: string;
  status?: 'OPEN' | 'CLOSED';
}

export interface ExportTimetableParams {
  format?: ExportFormat;
  semesterId?: string;
  academicYearId?: string;
  courseSectionId?: string;
  teacherId?: string;
  homeroomClassId?: string;
  subjectId?: string;
  search?: string;
  status?: AcademicEntityStatus;
}

export type StudentExportFormat = ExportFormat;

async function downloadExport(
  path: string,
  params: Record<string, string | undefined>,
  filename: string,
): Promise<void> {
  const response = await api.get(path, {
    params,
    responseType: 'blob',
  });

  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadStudentsExport(
  params: ExportStudentsParams,
): Promise<void> {
  const format = params.format ?? 'xlsx';
  await downloadExport(
    '/exports/students',
    {
      format,
      search: params.search,
      status: params.status,
      homeroomClassId: params.homeroomClassId,
      semesterId: params.semesterId,
      academicYearId: params.academicYearId,
    },
    format === 'csv' ? 'danh-sach-hoc-sinh.csv' : 'danh-sach-hoc-sinh.xlsx',
  );
}

export async function downloadTeachersExport(
  params: ExportTeachersParams,
): Promise<void> {
  const format = params.format ?? 'xlsx';
  await downloadExport(
    '/exports/teachers',
    {
      format,
      search: params.search,
      status: params.status,
    },
    format === 'csv' ? 'danh-sach-giao-vien.csv' : 'danh-sach-giao-vien.xlsx',
  );
}

export async function downloadParentsExport(
  params: ExportParentsParams,
): Promise<void> {
  const format = params.format ?? 'xlsx';
  await downloadExport(
    '/exports/parents',
    {
      format,
      search: params.search,
      status: params.status,
    },
    format === 'csv' ? 'danh-sach-phu-huynh.csv' : 'danh-sach-phu-huynh.xlsx',
  );
}

export async function downloadHomeroomClassesExport(
  params: ExportHomeroomClassesParams,
): Promise<void> {
  const format = params.format ?? 'xlsx';
  await downloadExport(
    '/exports/homeroom-classes',
    {
      format,
      search: params.search,
      status: params.status,
      academicYearId: params.academicYearId,
      gradeLevelId: params.gradeLevelId,
    },
    format === 'csv'
      ? 'danh-sach-lop-hanh-chinh.csv'
      : 'danh-sach-lop-hanh-chinh.xlsx',
  );
}

export async function downloadTeachingAssignmentsExport(
  params: ExportTeachingAssignmentsParams,
): Promise<void> {
  const format = params.format ?? 'xlsx';
  await downloadExport(
    '/exports/teaching-assignments',
    {
      format,
      search: params.search,
      status: params.status,
      teacherId: params.teacherId,
      semesterId: params.semesterId,
      academicYearId: params.academicYearId,
    },
    format === 'csv'
      ? 'danh-sach-phan-cong-giang-day.csv'
      : 'danh-sach-phan-cong-giang-day.xlsx',
  );
}

export async function downloadEnrollmentsExport(
  params: ExportEnrollmentsParams,
): Promise<void> {
  const format = params.format ?? 'xlsx';
  await downloadExport(
    '/exports/enrollments',
    {
      format,
      studentId: params.studentId,
      semesterId: params.semesterId,
      academicYearId: params.academicYearId,
      homeroomClassId: params.homeroomClassId,
      status: params.status,
    },
    format === 'csv' ? 'danh-sach-ghi-danh.csv' : 'danh-sach-ghi-danh.xlsx',
  );
}

export async function downloadGradebookExport(
  params: ExportGradebookParams,
): Promise<void> {
  const format = params.format ?? 'xlsx';
  await downloadExport(
    `/exports/gradebook/course-sections/${params.courseSectionId}`,
    { format },
    format === 'csv' ? 'so-diem-lop-mon.csv' : 'so-diem-lop-mon.xlsx',
  );
}

export async function downloadGradebookPdfExport(
  courseSectionId: string,
): Promise<void> {
  await downloadExport(
    `/exports/gradebook/course-sections/${courseSectionId}/pdf`,
    {},
    'so-diem-lop-mon.pdf',
  );
}

export async function downloadSemesterSummariesExport(
  params: ExportSemesterSummariesParams,
): Promise<void> {
  const format = params.format ?? 'xlsx';
  await downloadExport(
    '/exports/semester-summaries',
    {
      format,
      semesterId: params.semesterId,
      homeroomClassId: params.homeroomClassId,
      status: params.status,
      search: params.search,
    },
    format === 'csv' ? 'tong-ket-hoc-ky.csv' : 'tong-ket-hoc-ky.xlsx',
  );
}

export async function downloadSemesterSummariesPdfExport(
  params: Omit<ExportSemesterSummariesParams, 'format'>,
): Promise<void> {
  await downloadExport(
    '/exports/semester-summaries/pdf',
    {
      semesterId: params.semesterId,
      homeroomClassId: params.homeroomClassId,
      status: params.status,
      search: params.search,
    },
    'tong-ket-hoc-ky.pdf',
  );
}

export async function downloadYearSummariesExport(
  params: ExportYearSummariesParams,
): Promise<void> {
  const format = params.format ?? 'xlsx';
  await downloadExport(
    '/exports/year-summaries',
    {
      format,
      academicYearId: params.academicYearId,
      homeroomClassId: params.homeroomClassId,
      promotionDecision: params.promotionDecision,
      status: params.status,
      search: params.search,
    },
    format === 'csv' ? 'tong-ket-nam-hoc.csv' : 'tong-ket-nam-hoc.xlsx',
  );
}

export async function downloadYearSummariesPdfExport(
  params: Omit<ExportYearSummariesParams, 'format'>,
): Promise<void> {
  await downloadExport(
    '/exports/year-summaries/pdf',
    {
      academicYearId: params.academicYearId,
      homeroomClassId: params.homeroomClassId,
      promotionDecision: params.promotionDecision,
      status: params.status,
      search: params.search,
    },
    'tong-ket-nam-hoc.pdf',
  );
}

export async function downloadAttendanceExport(
  params: ExportAttendanceParams,
): Promise<void> {
  const format = params.format ?? 'xlsx';
  await downloadExport(
    '/exports/attendance',
    {
      format,
      courseSectionId: params.courseSectionId,
      teacherId: params.teacherId,
      semesterId: params.semesterId,
      academicYearId: params.academicYearId,
      homeroomClassId: params.homeroomClassId,
      sessionDate: params.sessionDate,
      fromDate: params.fromDate,
      toDate: params.toDate,
      status: params.status,
    },
    format === 'csv' ? 'bao-cao-diem-danh.csv' : 'bao-cao-diem-danh.xlsx',
  );
}

export async function downloadTimetableExport(
  params: ExportTimetableParams,
): Promise<void> {
  const format = params.format ?? 'xlsx';
  await downloadExport(
    '/exports/timetable',
    {
      format,
      semesterId: params.semesterId,
      academicYearId: params.academicYearId,
      courseSectionId: params.courseSectionId,
      teacherId: params.teacherId,
      homeroomClassId: params.homeroomClassId,
      subjectId: params.subjectId,
      search: params.search,
      status: params.status,
    },
    format === 'csv' ? 'thoi-khoa-bieu.csv' : 'thoi-khoa-bieu.xlsx',
  );
}

export async function downloadTimetablePdfExport(
  params: Omit<ExportTimetableParams, 'format'>,
): Promise<void> {
  await downloadExport(
    '/exports/timetable/pdf',
    {
      semesterId: params.semesterId,
      academicYearId: params.academicYearId,
      courseSectionId: params.courseSectionId,
      teacherId: params.teacherId,
      homeroomClassId: params.homeroomClassId,
      subjectId: params.subjectId,
      search: params.search,
      status: params.status,
    },
    'thoi-khoa-bieu.pdf',
  );
}
