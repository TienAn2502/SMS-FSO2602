import { HttpStatus, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '@/common/database/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import { PdfRendererService } from '@/common/pdf/pdf-renderer.service';
import { PdfTemplateService } from '@/common/pdf/pdf-template.service';
import {
  GRADEBOOK_PDF_FILENAME,
  PDF_CONTENT_TYPE,
  SEMESTER_SUMMARIES_PDF_FILENAME,
  STUDENT_SCORES_PDF_FILENAME,
  TIMETABLE_PDF_FILENAME,
  YEAR_SUMMARIES_PDF_FILENAME,
} from '@/modules/exports/constants/exports-pdf.constants';
import {
  SEMESTER_SUMMARY_EXPORT_COLUMNS,
} from '@/modules/exports/constants/semester-summaries-export.constants';
import {
  YEAR_SUMMARY_EXPORT_COLUMNS,
} from '@/modules/exports/constants/year-summaries-export.constants';
import type { ExportSemesterSummariesQuery } from '@/modules/exports/schemas/semester-summaries-export.schema';
import type { ExportTimetableQuery } from '@/modules/exports/schemas/timetable-export.schema';
import type { ExportYearSummariesQuery } from '@/modules/exports/schemas/year-summaries-export.schema';
import {
  buildDataTableHtml,
  buildDraftWatermarkHtml,
  buildMetadataBlockHtml,
  buildPageBreakHtml,
  buildTimetableMatrixHtml,
  formatPdfGeneratedAtLabel,
  type PdfTableColumn,
} from '@/modules/exports/utils/pdf-html.util';
import {
  semesterSummaryListInclude,
  yearSummaryListInclude,
} from '@/modules/grade-summaries/mappers/grade-summary.mapper';
import { GradebookGridService } from '@/modules/gradebook-grid/gradebook-grid.service';
import type { PortalStudentScoresGrid } from '@/modules/portal/mappers/portal-gradebook.mapper';
import type { TimetableEntryResponse } from '@/modules/timetable-entries/mappers/timetable-entry.mapper';
import { TimetableEntriesService } from '@/modules/timetable-entries/timetable-entries.service';
import {
  buildTimetableMatrix,
  formatHomeroomClassLabel,
  groupTimetableEntriesByHomeroomClass,
} from '@/common/utils/timetable-matrix.util';

export interface PdfExportFile {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

type SemesterSummaryForExport = Prisma.StudentSemesterSummaryGetPayload<{
  include: typeof semesterSummaryListInclude;
}>;

type YearSummaryForExport = Prisma.StudentYearSummaryGetPayload<{
  include: typeof yearSummaryListInclude;
}>;

type TimetablePdfQuery = Omit<ExportTimetableQuery, 'format'>;
type SemesterSummariesPdfQuery = Omit<ExportSemesterSummariesQuery, 'format'>;
type YearSummariesPdfQuery = Omit<ExportYearSummariesQuery, 'format'>;

interface TimetableExportContext {
  academicYearName: string;
  semesterName: string;
  homeroomClass: { code: string; name: string } | null;
  teacherFullName: string | null;
}

@Injectable()
export class ExportsPdfService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfTemplate: PdfTemplateService,
    private readonly pdfRenderer: PdfRendererService,
    private readonly gradebookGridService: GradebookGridService,
    private readonly timetableEntriesService: TimetableEntriesService,
  ) {}

  async exportGradebookPdf(
    schoolId: string,
    courseSectionId: string,
  ): Promise<PdfExportFile> {
    const grid = await this.gradebookGridService.getGradebookGridForCourseSection(
      schoolId,
      courseSectionId,
    );

    const school = await this.prisma.school.findFirst({
      where: { id: schoolId },
      select: { name: true },
    });

    const studentCodes = await this.loadStudentExternalCodes(
      schoolId,
      grid.rows.map((row) => row.studentId),
    );

    const scoreColumns: PdfTableColumn[] = grid.columns.map((column) => ({
      header: column.name || column.slotKey,
      key: column.slotKey,
      align: 'center',
    }));

    const columns: PdfTableColumn[] = [
      { header: 'Mã HS', key: 'ma_hs', align: 'center' },
      { header: 'Họ và tên', key: 'ho_ten' },
      ...scoreColumns,
      { header: 'TB HK', key: 'tb_hk', align: 'center' },
    ];

    const rows = grid.rows.map((row) => {
      const exportRow: Record<string, string> = {
        ma_hs: studentCodes.get(row.studentId) ?? '',
        ho_ten: row.studentFullName,
        tb_hk:
          row.semesterAverage != null ? String(row.semesterAverage) : '',
      };

      for (const column of grid.columns) {
        const cell = row.cells[column.slotKey];
        if (!cell) {
          exportRow[column.slotKey] = '';
          continue;
        }

        if (cell.absent) {
          exportRow[column.slotKey] = 'Vắng';
        } else if (cell.score != null) {
          exportRow[column.slotKey] = String(cell.score);
        } else {
          exportRow[column.slotKey] = '';
        }
      }

      return exportRow;
    });

    const infoLines = [
      {
        label: 'Lớp môn',
        value: `${grid.courseSectionCode} — ${grid.courseSectionName}`,
      },
      { label: 'Môn', value: grid.subjectName ?? grid.subjectCode ?? '—' },
      { label: 'Lớp HC', value: grid.homeroomClassCode ?? '—' },
      { label: 'Học kỳ', value: grid.semesterName },
      {
        label: 'Trạng thái sổ',
        value: grid.isLocked ? 'Đã khóa' : 'Đang nhập',
      },
      { label: 'Số học sinh', value: String(rows.length) },
    ];

    const bodyHtml = [
      !grid.isLocked ? buildDraftWatermarkHtml() : '',
      buildMetadataBlockHtml(infoLines),
      buildDataTableHtml(columns, rows, { compact: true, stt: true }),
    ].join('');

    const buffer = await this.renderReport({
      title: 'SỔ ĐIỂM LỚP MÔN',
      subtitle: `${grid.courseSectionCode} — ${grid.subjectName ?? grid.subjectCode ?? ''}`,
      schoolName: school?.name,
      academicYearLabel: grid.academicYearName,
      bodyHtml,
    });

    return {
      buffer,
      contentType: PDF_CONTENT_TYPE,
      filename: GRADEBOOK_PDF_FILENAME,
    };
  }

  async exportTimetablePdf(
    schoolId: string,
    query: TimetablePdfQuery,
  ): Promise<PdfExportFile> {
    const entries = await this.timetableEntriesService.listForMatrix(schoolId, {
      ...query,
      includeAllSemesters: false,
    });

    if (entries.length === 0) {
      throw new AppException(
        'TIMETABLE_EXPORT_EMPTY',
        'Không có tiết học để export với bộ lọc đã chọn',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const context = await this.resolveTimetableContext(schoolId, query, entries);
    const school = await this.prisma.school.findFirst({
      where: { id: schoolId },
      select: { name: true },
    });

    const sections: string[] = [];
    const shouldGroup =
      !query.homeroomClassId && !query.teacherId && !query.courseSectionId;

    if (shouldGroup) {
      const homeroomClassIds = [
        ...new Set(
          entries
            .map((entry) => entry.homeroomClassId)
            .filter((id): id is string => Boolean(id)),
        ),
      ];

      const homeroomClasses = homeroomClassIds.length
        ? await this.prisma.homeroomClass.findMany({
            where: { id: { in: homeroomClassIds }, schoolId },
            select: { id: true, code: true, name: true },
          })
        : [];

      const homeroomClassById = new Map(
        homeroomClasses.map((homeroomClass) => [
          homeroomClass.id,
          { code: homeroomClass.code, name: homeroomClass.name },
        ]),
      );

      const groups = groupTimetableEntriesByHomeroomClass(
        entries,
        homeroomClassById,
      );

      groups.forEach((group, index) => {
        if (index > 0) {
          sections.push(buildPageBreakHtml());
        }

        const infoLines = this.buildTimetableInfoLines(context, group.entries, {
          code: group.homeroomClassCode,
          name: group.homeroomClassName,
        });
        const { columns, rows } = buildTimetableMatrix(group.entries);

        sections.push(
          buildMetadataBlockHtml(infoLines),
          buildTimetableMatrixHtml(columns, rows),
        );
      });
    } else {
      const infoLines = this.buildTimetableInfoLines(context, entries);
      const { columns, rows } = buildTimetableMatrix(entries);

      sections.push(
        buildMetadataBlockHtml(infoLines),
        buildTimetableMatrixHtml(columns, rows),
      );
    }

    const buffer = await this.renderReport({
      title: 'THỜI KHÓA BIỂU',
      subtitle: context.homeroomClass
        ? formatHomeroomClassLabel(
            context.homeroomClass.code,
            context.homeroomClass.name,
          )
        : undefined,
      schoolName: school?.name,
      academicYearLabel: `${context.academicYearName} · ${context.semesterName}`,
      bodyHtml: sections.join(''),
      landscape: true,
    });

    return {
      buffer,
      contentType: PDF_CONTENT_TYPE,
      filename: TIMETABLE_PDF_FILENAME,
    };
  }

  async exportSemesterSummariesPdf(
    schoolId: string,
    query: SemesterSummariesPdfQuery,
  ): Promise<PdfExportFile> {
    const summaries = await this.findSemesterSummaries(schoolId, query);
    const studentCodes = await this.loadStudentExternalCodes(
      schoolId,
      summaries.map((summary) => summary.studentId),
    );

    const rows = summaries.map((summary) => ({
      ma_hs: studentCodes.get(summary.studentId) ?? '',
      ho_ten: summary.student.fullName,
      ma_lop_hc: summary.homeroomClass.code,
      hoc_ky: summary.semester.name,
      tb_chung: summary.overallAverage?.toString() ?? '',
      hoc_luc: summary.academicResultLevel ?? '',
      hanh_kiem: summary.trainingResultLevel ?? '',
      so_mon: summary.subjectCount?.toString() ?? '',
      trang_thai: summary.status,
    }));

    const metadata = await this.buildSemesterSummaryMetadata(
      schoolId,
      query,
      rows.length,
    );

    const showDraftWatermark =
      query.status === 'DRAFT' ||
      (!query.status && summaries.some((summary) => summary.status === 'DRAFT'));

    const columns = this.toPdfColumns(SEMESTER_SUMMARY_EXPORT_COLUMNS);
    const bodyHtml = [
      showDraftWatermark ? buildDraftWatermarkHtml() : '',
      buildMetadataBlockHtml(metadata.lines),
      buildDataTableHtml(columns, rows, { compact: true, stt: true }),
    ].join('');

    const buffer = await this.renderReport({
      title: metadata.title,
      schoolName: metadata.lines.find((line) => line.label === 'Trường')?.value,
      subtitle: metadata.lines.find((line) => line.label === 'Học kỳ')?.value,
      bodyHtml,
    });

    return {
      buffer,
      contentType: PDF_CONTENT_TYPE,
      filename: SEMESTER_SUMMARIES_PDF_FILENAME,
    };
  }

  async exportYearSummariesPdf(
    schoolId: string,
    query: YearSummariesPdfQuery,
  ): Promise<PdfExportFile> {
    const summaries = await this.findYearSummaries(schoolId, query);
    const studentCodes = await this.loadStudentExternalCodes(
      schoolId,
      summaries.map((summary) => summary.studentId),
    );

    const rows = summaries.map((summary) => ({
      ma_hs: studentCodes.get(summary.studentId) ?? '',
      ho_ten: summary.student.fullName,
      ma_lop_hc: summary.homeroomClass.code,
      khoi: summary.homeroomClass.gradeLevel.code,
      nam_hoc: summary.academicYear.name,
      tb_chung: summary.overallAverage?.toString() ?? '',
      hoc_luc: summary.academicResultLevel ?? '',
      hanh_kiem: summary.trainingResultLevel ?? '',
      quyet_dinh: summary.promotionDecision,
      lop_nam_sau: summary.nextHomeroomClass?.code ?? '',
      so_buoi_vang: summary.absentSessionCount?.toString() ?? '',
      trang_thai: summary.status,
    }));

    const metadata = await this.buildYearSummaryMetadata(
      schoolId,
      query,
      rows.length,
    );

    const showDraftWatermark =
      query.status === 'DRAFT' ||
      (!query.status && summaries.some((summary) => summary.status === 'DRAFT'));

    const columns = this.toPdfColumns(YEAR_SUMMARY_EXPORT_COLUMNS);
    const bodyHtml = [
      showDraftWatermark ? buildDraftWatermarkHtml() : '',
      buildMetadataBlockHtml(metadata.lines),
      buildDataTableHtml(columns, rows, { compact: true, stt: true }),
    ].join('');

    const buffer = await this.renderReport({
      title: metadata.title,
      schoolName: metadata.lines.find((line) => line.label === 'Trường')?.value,
      subtitle: metadata.lines.find((line) => line.label === 'Năm học')?.value,
      bodyHtml,
      landscape: true,
    });

    return {
      buffer,
      contentType: PDF_CONTENT_TYPE,
      filename: YEAR_SUMMARIES_PDF_FILENAME,
    };
  }

  async exportStudentScoresPdf(
    schoolId: string,
    grid: PortalStudentScoresGrid,
    studentName: string,
    studentCode?: string,
  ): Promise<PdfExportFile> {
    const school = await this.prisma.school.findFirst({
      where: { id: schoolId },
      select: { name: true },
    });

    const columns: PdfTableColumn[] = [
      { header: 'Môn học', key: 'mon_hoc' },
      { header: 'Giáo viên', key: 'giao_vien' },
      ...grid.columns.map((column) => ({
        header: column.label,
        key: column.slotKey,
        align: 'center' as const,
      })),
      { header: 'TB HK', key: 'tb_hk', align: 'center' as const },
    ];

    const rows = grid.rows.map((row) => {
      const exportRow: Record<string, string> = {
        mon_hoc: row.subjectName ?? row.subjectCode ?? '—',
        giao_vien: row.teacherFullName ?? '—',
        tb_hk:
          row.semesterAverage != null ? String(row.semesterAverage) : '',
      };

      for (const column of grid.columns) {
        const cell = row.cells[column.slotKey];
        if (!cell) {
          exportRow[column.slotKey] = '';
          continue;
        }

        if (cell.absent) {
          exportRow[column.slotKey] = 'Vắng';
        } else if (cell.score != null) {
          exportRow[column.slotKey] = String(cell.score);
        } else {
          exportRow[column.slotKey] = '';
        }
      }

      return exportRow;
    });

    const infoLines = [
      { label: 'Học sinh', value: studentName },
      ...(studentCode ? [{ label: 'Mã HS', value: studentCode }] : []),
      { label: 'Lớp HC', value: grid.homeroomClassCode ?? '—' },
      { label: 'Học kỳ', value: grid.semesterName },
      { label: 'Năm học', value: grid.academicYearName },
    ];

    const bodyHtml = [
      buildMetadataBlockHtml(infoLines),
      buildDataTableHtml(columns, rows, { compact: true, stt: true }),
    ].join('');

    const buffer = await this.renderReport({
      title: 'BẢNG ĐIỂM CÁ NHÂN',
      subtitle: studentName,
      schoolName: school?.name,
      academicYearLabel: `${grid.academicYearName} · ${grid.semesterName}`,
      bodyHtml,
      landscape: true,
    });

    return {
      buffer,
      contentType: PDF_CONTENT_TYPE,
      filename: STUDENT_SCORES_PDF_FILENAME,
    };
  }

  private async renderReport(params: {
    title: string;
    subtitle?: string;
    schoolName?: string;
    academicYearLabel?: string;
    bodyHtml: string;
    landscape?: boolean;
  }): Promise<Buffer> {
    const html = this.pdfTemplate.renderBaseLayout({
      title: params.title,
      subtitle: params.subtitle,
      schoolName: params.schoolName,
      academicYearLabel: params.academicYearLabel,
      bodyHtml: params.bodyHtml,
      generatedAtLabel: formatPdfGeneratedAtLabel(),
    });

    return this.pdfRenderer.renderHtmlToPdf(html, {
      landscape: params.landscape ?? false,
    });
  }

  private toPdfColumns(
    columns: Array<{ header: string; key: string }>,
  ): PdfTableColumn[] {
    return columns.map((column) => ({
      header: column.header,
      key: column.key,
      align:
        column.key === 'ho_ten' || column.key === 'ma_hs'
          ? 'left'
          : 'center',
    }));
  }

  private async loadStudentExternalCodes(
    schoolId: string,
    studentIds: string[],
  ): Promise<Map<string, string>> {
    if (studentIds.length === 0) {
      return new Map();
    }

    const students = await this.prisma.student.findMany({
      where: { schoolId, id: { in: studentIds } },
      select: { id: true, externalCode: true },
    });

    return new Map(
      students.map((student) => [student.id, student.externalCode ?? '']),
    );
  }

  private async findSemesterSummaries(
    schoolId: string,
    query: SemesterSummariesPdfQuery,
  ): Promise<SemesterSummaryForExport[]> {
    const where: Prisma.StudentSemesterSummaryWhereInput = {
      schoolId,
      ...(query.semesterId ? { semesterId: query.semesterId } : {}),
      ...(query.homeroomClassId
        ? { homeroomClassId: query.homeroomClassId }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            student: {
              fullName: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
          }
        : {}),
    };

    return this.prisma.studentSemesterSummary.findMany({
      where,
      orderBy: { [query.sortBy]: query.sortOrder },
      include: semesterSummaryListInclude,
    });
  }

  private async findYearSummaries(
    schoolId: string,
    query: YearSummariesPdfQuery,
  ): Promise<YearSummaryForExport[]> {
    const where: Prisma.StudentYearSummaryWhereInput = {
      schoolId,
      ...(query.academicYearId
        ? { academicYearId: query.academicYearId }
        : {}),
      ...(query.homeroomClassId
        ? { homeroomClassId: query.homeroomClassId }
        : {}),
      ...(query.promotionDecision
        ? { promotionDecision: query.promotionDecision }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            student: {
              fullName: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
          }
        : {}),
    };

    return this.prisma.studentYearSummary.findMany({
      where,
      orderBy: { [query.sortBy]: query.sortOrder },
      include: yearSummaryListInclude,
    });
  }

  private async buildSemesterSummaryMetadata(
    schoolId: string,
    query: SemesterSummariesPdfQuery,
    totalCount: number,
  ) {
    const [school, semester, homeroomClass] = await Promise.all([
      this.prisma.school.findFirst({
        where: { id: schoolId },
        select: { name: true },
      }),
      query.semesterId
        ? this.prisma.semester.findFirst({
            where: { id: query.semesterId, schoolId },
            select: { name: true },
          })
        : Promise.resolve(null),
      query.homeroomClassId
        ? this.prisma.homeroomClass.findFirst({
            where: { id: query.homeroomClassId, schoolId },
            select: { code: true, name: true },
          })
        : Promise.resolve(null),
    ]);

    return {
      title: 'TỔNG KẾT HỌC KỲ',
      lines: [
        { label: 'Trường', value: school?.name ?? '—' },
        { label: 'Học kỳ', value: semester?.name ?? 'Tất cả' },
        {
          label: 'Lớp HC',
          value: homeroomClass
            ? `${homeroomClass.code} (${homeroomClass.name})`
            : 'Tất cả',
        },
        { label: 'Trạng thái', value: query.status ?? 'Tất cả' },
        { label: 'Tổng số bản ghi', value: String(totalCount) },
      ],
    };
  }

  private async buildYearSummaryMetadata(
    schoolId: string,
    query: YearSummariesPdfQuery,
    totalCount: number,
  ) {
    const [school, academicYear, homeroomClass] = await Promise.all([
      this.prisma.school.findFirst({
        where: { id: schoolId },
        select: { name: true },
      }),
      query.academicYearId
        ? this.prisma.academicYear.findFirst({
            where: { id: query.academicYearId, schoolId },
            select: { name: true },
          })
        : Promise.resolve(null),
      query.homeroomClassId
        ? this.prisma.homeroomClass.findFirst({
            where: { id: query.homeroomClassId, schoolId },
            select: { code: true, name: true },
          })
        : Promise.resolve(null),
    ]);

    return {
      title: 'TỔNG KẾT NĂM HỌC',
      lines: [
        { label: 'Trường', value: school?.name ?? '—' },
        { label: 'Năm học', value: academicYear?.name ?? 'Tất cả' },
        {
          label: 'Lớp HC',
          value: homeroomClass
            ? `${homeroomClass.code} (${homeroomClass.name})`
            : 'Tất cả',
        },
        {
          label: 'Quyết định',
          value: query.promotionDecision ?? 'Tất cả',
        },
        { label: 'Trạng thái', value: query.status ?? 'Tất cả' },
        { label: 'Tổng số bản ghi', value: String(totalCount) },
      ],
    };
  }

  private async resolveTimetableContext(
    schoolId: string,
    query: TimetablePdfQuery,
    entries: TimetableEntryResponse[],
  ): Promise<TimetableExportContext> {
    const [homeroomClass, teacher, semester, academicYear] = await Promise.all([
      query.homeroomClassId
        ? this.prisma.homeroomClass.findFirst({
            where: { id: query.homeroomClassId, schoolId },
            select: { code: true, name: true },
          })
        : Promise.resolve(null),
      query.teacherId
        ? this.prisma.teacher.findFirst({
            where: { id: query.teacherId, schoolId },
            select: { fullName: true },
          })
        : Promise.resolve(null),
      query.semesterId
        ? this.prisma.semester.findFirst({
            where: { id: query.semesterId, schoolId },
            select: { name: true, academicYearId: true },
          })
        : entries[0]?.semesterId
          ? this.prisma.semester.findFirst({
              where: { id: entries[0].semesterId, schoolId },
              select: { name: true, academicYearId: true },
            })
          : Promise.resolve(null),
      query.academicYearId
        ? this.prisma.academicYear.findFirst({
            where: { id: query.academicYearId, schoolId },
            select: { name: true },
          })
        : Promise.resolve(null),
    ]);

    let academicYearName = academicYear?.name ?? '—';
    if (!academicYear && semester?.academicYearId) {
      const resolvedYear = await this.prisma.academicYear.findFirst({
        where: { id: semester.academicYearId, schoolId },
        select: { name: true },
      });
      academicYearName = resolvedYear?.name ?? '—';
    }

    return {
      academicYearName,
      semesterName: semester?.name ?? '—',
      homeroomClass,
      teacherFullName: teacher?.fullName ?? null,
    };
  }

  private buildTimetableInfoLines(
    context: TimetableExportContext,
    entries: TimetableEntryResponse[],
    groupHomeroomClass?: { code: string; name: string },
  ): Array<{ label: string; value: string }> {
    const homeroomClass = groupHomeroomClass ?? context.homeroomClass;
    const lines: Array<{ label: string; value: string }> = [
      { label: 'Năm học', value: context.academicYearName },
      { label: 'Học kỳ', value: context.semesterName },
    ];

    if (homeroomClass) {
      lines.unshift({
        label: 'Lớp HC',
        value: formatHomeroomClassLabel(
          homeroomClass.code,
          homeroomClass.name,
        ),
      });
    }

    if (context.teacherFullName) {
      lines.push({ label: 'Giáo viên', value: context.teacherFullName });
    }

    lines.push({ label: 'Số tiết', value: String(entries.length) });

    return lines;
  }
}
