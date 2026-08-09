import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AcademicEntityStatus } from '@prisma/client';

import type { EnvConfig } from '@/common/config/env.schema';
import { PrismaService } from '@/common/database/prisma.service';
import { AppException } from '@/common/exceptions/app.exception';
import { detectImportFileFormat } from '@/common/files/detect-file-format.util';
import { parseTimetableMatrixXlsxBuffer } from '@/common/files/parse-timetable-matrix-xlsx.util';
import {
  parseTimetableImportCell,
  TIMETABLE_MATRIX_DAY_LABELS,
} from '@/common/utils/timetable-matrix.util';
import { timetableEntryInclude } from '@/modules/timetable-entries/mappers/timetable-entry.mapper';
import { TimetableEntriesService } from '@/modules/timetable-entries/timetable-entries.service';
import type {
  ImportTimetableFormInput,
  ResolvedTimetableImportEntry,
  TimetableImportCellError,
  TimetableImportResult,
} from '@/modules/imports/schemas/timetable-import.schema';

@Injectable()
export class TimetableImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<EnvConfig, true>,
    private readonly timetableEntriesService: TimetableEntriesService,
  ) {}

  async importTimetable(
    schoolId: string,
    file: Express.Multer.File | undefined,
    form: ImportTimetableFormInput,
  ): Promise<TimetableImportResult> {
    this.assertFilePresent(file);
    this.assertFileSize(file);
    this.assertXlsxFormat(file);

    const semester = await this.prisma.semester.findFirst({
      where: { id: form.semesterId, schoolId },
      select: { id: true, name: true },
    });

    if (!semester) {
      throw new AppException(
        'SEMESTER_NOT_FOUND',
        'Không tìm thấy học kỳ',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    let parsedSheets;
    try {
      parsedSheets = await parseTimetableMatrixXlsxBuffer(file.buffer);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message === 'WORKSHEET_EMPTY') {
          throw new AppException(
            'WORKSHEET_EMPTY',
            'File Excel không có sheet TKB',
            HttpStatus.BAD_REQUEST,
          );
        }

        if (error.message === 'TIMETABLE_IMPORT_HEADER_NOT_FOUND') {
          throw new AppException(
            'TIMETABLE_IMPORT_INVALID_FORMAT',
            'Không tìm thấy dòng header "Tiết" trong file',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      throw new AppException(
        'FILE_PARSE_ERROR',
        'Không đọc được nội dung file TKB',
        HttpStatus.BAD_REQUEST,
      );
    }

    const sheetsWithCells = parsedSheets.filter((sheet) => sheet.cells.length > 0);
    if (sheetsWithCells.length === 0) {
      throw new AppException(
        'IMPORT_EMPTY',
        'File không có tiết học để import',
        HttpStatus.BAD_REQUEST,
      );
    }

    const maxRows = this.configService.get('IMPORT_MAX_ROWS', { infer: true });
    const totalCells = sheetsWithCells.reduce(
      (count, sheet) => count + sheet.cells.length,
      0,
    );
    if (totalCells > maxRows) {
      throw new AppException(
        'IMPORT_TOO_MANY_ROWS',
        `File vượt quá ${maxRows} tiết cho phép`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const { entries, errors: resolvedErrors } = await this.resolveImportEntries(
      schoolId,
      form.semesterId,
      sheetsWithCells,
    );

    const errors = [...resolvedErrors];
    if (errors.length > 0) {
      throw this.buildValidationException(errors);
    }

    errors.push(...this.validateDuplicateSlots(entries));
    if (errors.length > 0) {
      throw this.buildValidationException(errors);
    }

    errors.push(
      ...(await this.validateDatabaseConflicts(
        schoolId,
        form.semesterId,
        form.mode,
        entries,
      )),
    );
    if (errors.length > 0) {
      throw this.buildValidationException(errors);
    }

    const persisted = await this.persistEntries(
      schoolId,
      form.semesterId,
      form.mode,
      entries,
    );

    return {
      successCount: persisted.created + persisted.updated,
      errorCount: 0,
      created: persisted.created,
      updated: persisted.updated,
      sheetsProcessed: sheetsWithCells.length,
      errors: [],
    };
  }

  private assertFilePresent(
    file: Express.Multer.File | undefined,
  ): asserts file is Express.Multer.File {
    if (!file) {
      throw new AppException(
        'VALIDATION_ERROR',
        'File upload là bắt buộc',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private assertFileSize(file: Express.Multer.File): void {
    const maxBytes = this.configService.get('IMPORT_MAX_BYTES', { infer: true });
    if (file.size > maxBytes) {
      throw new AppException(
        'FILE_TOO_LARGE',
        'File vượt quá giới hạn dung lượng cho phép',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private assertXlsxFormat(file: Express.Multer.File): void {
    const format = detectImportFileFormat(file);
    if (format !== 'xlsx') {
      throw new AppException(
        'UNSUPPORTED_FILE_FORMAT',
        'Import TKB ma trận chỉ hỗ trợ file .xlsx',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async resolveImportEntries(
    schoolId: string,
    semesterId: string,
    sheets: Awaited<ReturnType<typeof parseTimetableMatrixXlsxBuffer>>,
  ): Promise<{
    entries: ResolvedTimetableImportEntry[];
    errors: TimetableImportCellError[];
  }> {
    const errors: TimetableImportCellError[] = [];
    const entries: ResolvedTimetableImportEntry[] = [];

    const homeroomClasses = await this.prisma.homeroomClass.findMany({
      where: { schoolId, status: AcademicEntityStatus.ACTIVE },
      select: { id: true, code: true, name: true },
    });
    const homeroomClassByCode = new Map(
      homeroomClasses.map((homeroomClass) => [
        homeroomClass.code.toLowerCase(),
        homeroomClass,
      ]),
    );

    const courseSections = await this.prisma.courseSection.findMany({
      where: {
        schoolId,
        semesterId,
        status: AcademicEntityStatus.ACTIVE,
      },
      select: {
        id: true,
        code: true,
        homeroomClassId: true,
      },
    });
    const courseSectionByCode = new Map(
      courseSections.map((section) => [section.code.toLowerCase(), section]),
    );

    const teachers = await this.prisma.teacher.findMany({
      where: {
        schoolId,
        status: AcademicEntityStatus.ACTIVE,
      },
      select: {
        id: true,
        fullName: true,
        user: { select: { email: true } },
      },
    });
    const teacherByEmail = new Map<string, string>();
    const teacherByFullName = new Map<string, string>();
    for (const teacher of teachers) {
      if (teacher.user?.email) {
        teacherByEmail.set(teacher.user.email.toLowerCase(), teacher.id);
      }
      teacherByFullName.set(teacher.fullName.trim().toLowerCase(), teacher.id);
    }

    const assignments = await this.prisma.teachingAssignment.findMany({
      where: {
        schoolId,
        status: AcademicEntityStatus.ACTIVE,
        courseSection: { semesterId },
      },
      select: {
        teacherId: true,
        courseSectionId: true,
      },
    });
    const assignmentKey = new Set(
      assignments.map(
        (assignment) => `${assignment.teacherId}:${assignment.courseSectionId}`,
      ),
    );

    for (const sheet of sheets) {
      if (!sheet.homeroomClassCode) {
        errors.push({
          sheet: sheet.sheetName,
          field: 'Lớp HC',
          message: 'Không xác định được mã lớp HC từ metadata hoặc tên sheet',
        });
        continue;
      }

      const homeroomClass = homeroomClassByCode.get(
        sheet.homeroomClassCode.toLowerCase(),
      );
      if (!homeroomClass) {
        errors.push({
          sheet: sheet.sheetName,
          field: 'Lớp HC',
          message: `Không tìm thấy lớp HC "${sheet.homeroomClassCode}"`,
        });
        continue;
      }

      for (const cell of sheet.cells) {
        let parsedCell;
        try {
          parsedCell = parseTimetableImportCell(cell.rawValue);
        } catch {
          errors.push({
            sheet: sheet.sheetName,
            dayOfWeek: cell.dayOfWeek,
            periodNumber: cell.periodNumber,
            field: 'cell',
            message:
              'Ô phải có ít nhất 2 dòng: ma_lop_mon và email_gv (hoặc họ tên GV)',
          });
          continue;
        }

        if (!parsedCell) {
          continue;
        }

        const courseSection = courseSectionByCode.get(
          parsedCell.courseSectionCode.toLowerCase(),
        );
        if (!courseSection) {
          errors.push({
            sheet: sheet.sheetName,
            dayOfWeek: cell.dayOfWeek,
            periodNumber: cell.periodNumber,
            field: 'ma_lop_mon',
            message: `Không tìm thấy lớp môn "${parsedCell.courseSectionCode}"`,
          });
          continue;
        }

        if (courseSection.homeroomClassId !== homeroomClass.id) {
          errors.push({
            sheet: sheet.sheetName,
            dayOfWeek: cell.dayOfWeek,
            periodNumber: cell.periodNumber,
            field: 'ma_lop_mon',
            message: `Lớp môn "${parsedCell.courseSectionCode}" không thuộc lớp HC ${homeroomClass.code}`,
          });
          continue;
        }

        const teacherIdentifier = parsedCell.teacherIdentifier.toLowerCase();
        const teacherId =
          teacherByEmail.get(teacherIdentifier) ??
          teacherByFullName.get(teacherIdentifier);
        if (!teacherId) {
          errors.push({
            sheet: sheet.sheetName,
            dayOfWeek: cell.dayOfWeek,
            periodNumber: cell.periodNumber,
            field: 'email_gv',
            message: `Không tìm thấy giáo viên "${parsedCell.teacherIdentifier}"`,
          });
          continue;
        }

        if (!assignmentKey.has(`${teacherId}:${courseSection.id}`)) {
          errors.push({
            sheet: sheet.sheetName,
            dayOfWeek: cell.dayOfWeek,
            periodNumber: cell.periodNumber,
            field: 'email_gv',
            message: `Giáo viên chưa được phân công lớp môn "${parsedCell.courseSectionCode}"`,
          });
          continue;
        }

        entries.push({
          sheetName: sheet.sheetName,
          homeroomClassId: homeroomClass.id,
          homeroomClassCode: homeroomClass.code,
          courseSectionId: courseSection.id,
          courseSectionCode: courseSection.code,
          teacherId,
          dayOfWeek: cell.dayOfWeek,
          periodNumber: cell.periodNumber,
          room: parsedCell.room,
        });
      }
    }

    return { entries, errors };
  }

  private validateDuplicateSlots(
    entries: ResolvedTimetableImportEntry[],
  ): TimetableImportCellError[] {
    const errors: TimetableImportCellError[] = [];
    const courseSectionSlot = new Map<string, ResolvedTimetableImportEntry>();
    const teacherSlot = new Map<string, ResolvedTimetableImportEntry>();

    for (const entry of entries) {
      const slotKey = `${entry.courseSectionId}:${entry.dayOfWeek}:${entry.periodNumber}`;
      const teacherSlotKey = `${entry.teacherId}:${entry.dayOfWeek}:${entry.periodNumber}`;
      const existingSectionSlot = courseSectionSlot.get(slotKey);
      if (existingSectionSlot) {
        errors.push({
          sheet: entry.sheetName,
          dayOfWeek: entry.dayOfWeek,
          periodNumber: entry.periodNumber,
          field: 'ma_lop_mon',
          message: `Trùng tiết với sheet "${existingSectionSlot.sheetName}" cho lớp môn ${entry.courseSectionCode}`,
        });
      } else {
        courseSectionSlot.set(slotKey, entry);
      }

      const existingTeacherSlot = teacherSlot.get(teacherSlotKey);
      if (existingTeacherSlot) {
        errors.push({
          sheet: entry.sheetName,
          dayOfWeek: entry.dayOfWeek,
          periodNumber: entry.periodNumber,
          field: 'email_gv',
          message: `Giáo viên đã có tiết khác trong file (${existingTeacherSlot.sheetName})`,
        });
      } else {
        teacherSlot.set(teacherSlotKey, entry);
      }
    }

    return errors;
  }

  private async validateDatabaseConflicts(
    schoolId: string,
    semesterId: string,
    mode: ImportTimetableFormInput['mode'],
    entries: ResolvedTimetableImportEntry[],
  ): Promise<TimetableImportCellError[]> {
    const replacedHomeroomClassIds =
      mode === 'replace'
        ? new Set(entries.map((entry) => entry.homeroomClassId))
        : new Set<string>();

    const activeEntries = await this.prisma.timetableEntry.findMany({
      where: {
        schoolId,
        semesterId,
        status: AcademicEntityStatus.ACTIVE,
      },
      select: {
        teacherId: true,
        dayOfWeek: true,
        periodNumber: true,
        courseSectionId: true,
        courseSection: {
          select: {
            homeroomClassId: true,
          },
        },
      },
    });

    const errors: TimetableImportCellError[] = [];

    for (const entry of entries) {
      for (const existing of activeEntries) {
        if (
          mode === 'replace' &&
          existing.courseSection.homeroomClassId &&
          replacedHomeroomClassIds.has(existing.courseSection.homeroomClassId)
        ) {
          continue;
        }

        if (
          existing.courseSectionId === entry.courseSectionId &&
          existing.dayOfWeek === entry.dayOfWeek &&
          existing.periodNumber === entry.periodNumber
        ) {
          continue;
        }

        if (
          existing.teacherId === entry.teacherId &&
          existing.dayOfWeek === entry.dayOfWeek &&
          existing.periodNumber === entry.periodNumber
        ) {
          errors.push({
            sheet: entry.sheetName,
            dayOfWeek: entry.dayOfWeek,
            periodNumber: entry.periodNumber,
            field: 'email_gv',
            message: 'Giáo viên đã có tiết học khác vào thứ và tiết này',
          });
          break;
        }
      }
    }

    return errors;
  }

  private async persistEntries(
    schoolId: string,
    semesterId: string,
    mode: ImportTimetableFormInput['mode'],
    entries: ResolvedTimetableImportEntry[],
  ): Promise<{ created: number; updated: number }> {
    if (mode === 'replace') {
      const homeroomClassIds = [
        ...new Set(entries.map((entry) => entry.homeroomClassId)),
      ];

      await this.prisma.timetableEntry.updateMany({
        where: {
          schoolId,
          semesterId,
          status: AcademicEntityStatus.ACTIVE,
          courseSection: {
            homeroomClassId: { in: homeroomClassIds },
          },
        },
        data: { status: AcademicEntityStatus.INACTIVE },
      });
    }

    let created = 0;
    let updated = 0;

    for (const entry of entries) {
      const existing = await this.prisma.timetableEntry.findUnique({
        where: {
          courseSectionId_dayOfWeek_periodNumber: {
            courseSectionId: entry.courseSectionId,
            dayOfWeek: entry.dayOfWeek,
            periodNumber: entry.periodNumber,
          },
        },
      });

      if (existing?.status === AcademicEntityStatus.ACTIVE) {
        if (
          existing.teacherId !== entry.teacherId ||
          existing.room !== entry.room
        ) {
          await this.prisma.timetableEntry.update({
            where: { id: existing.id },
            data: {
              teacherId: entry.teacherId,
              room: entry.room,
            },
          });
          updated += 1;
        }
        continue;
      }

      if (existing?.status === AcademicEntityStatus.INACTIVE) {
        await this.prisma.timetableEntry.update({
          where: { id: existing.id },
          data: {
            teacherId: entry.teacherId,
            room: entry.room,
            status: AcademicEntityStatus.ACTIVE,
          },
          include: timetableEntryInclude,
        });
        updated += 1;
        continue;
      }

      await this.timetableEntriesService.create(schoolId, {
        courseSectionId: entry.courseSectionId,
        teacherId: entry.teacherId,
        dayOfWeek: entry.dayOfWeek,
        periodNumber: entry.periodNumber,
        room: entry.room ?? undefined,
      });
      created += 1;
    }

    return { created, updated };
  }

  private buildValidationException(errors: TimetableImportCellError[]) {
    return new AppException(
      'IMPORT_VALIDATION_FAILED',
      `Import TKB thất bại: ${errors.length} lỗi`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      errors.map((error) => ({
        field: this.formatErrorField(error),
        message: error.message,
      })),
      {
        successCount: 0,
        errorCount: errors.length,
        created: 0,
        updated: 0,
        sheetsProcessed: 0,
        errors,
      },
    );
  }

  private formatErrorField(error: TimetableImportCellError): string {
    const dayLabel =
      error.dayOfWeek !== undefined
        ? TIMETABLE_MATRIX_DAY_LABELS[error.dayOfWeek]
        : undefined;
    const slot =
      dayLabel && error.periodNumber
        ? `${dayLabel}/Tiết ${error.periodNumber}`
        : 'metadata';

    return `${error.sheet}.${slot}.${error.field}`;
  }
}
