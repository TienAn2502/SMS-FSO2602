import { HttpStatus, Injectable } from '@nestjs/common';
import { AcademicEntityStatus, Prisma } from '@prisma/client';

import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../common/database/prisma.service';
import type { PaginationMeta } from '../../common/types/api-response.types';
import {
  buildPaginationMeta,
  getSkip,
} from '../../common/utils/pagination.util';
import { CourseSectionsService } from '../course-sections/course-sections.service';
import { SemestersService } from '../semesters/semesters.service';
import { TeachersService } from '../teachers/teachers.service';
import {
  timetableEntryInclude,
  toTimetableEntryResponse,
  type TimetableEntryResponse,
} from './mappers/timetable-entry.mapper';
import type {
  CreateTimetableEntryInput,
  ListTimetableEntriesQuery,
  UpdateTimetableEntryInput,
} from './schemas/timetable-entry.schema';

@Injectable()
export class TimetableEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teachersService: TeachersService,
    private readonly courseSectionsService: CourseSectionsService,
    private readonly semestersService: SemestersService,
  ) {}

  async list(
    schoolId: string,
    query: ListTimetableEntriesQuery,
  ): Promise<{ items: TimetableEntryResponse[]; meta: PaginationMeta }> {
    const semesterId = await this.resolveSemesterId(schoolId, query);

    const where: Prisma.TimetableEntryWhereInput = {
      schoolId,
      ...(semesterId ? { semesterId } : {}),
      ...(query.courseSectionId
        ? { courseSectionId: query.courseSectionId }
        : {}),
      ...(query.teacherId ? { teacherId: query.teacherId } : {}),
      ...(query.dayOfWeek !== undefined ? { dayOfWeek: query.dayOfWeek } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.homeroomClassId
        ? {
            courseSection: {
              homeroomClassId: query.homeroomClassId,
            },
          }
        : {}),
      ...(query.academicYearId && !semesterId
        ? {
            semester: {
              academicYearId: query.academicYearId,
            },
          }
        : {}),
    };

    const orderBy: Prisma.TimetableEntryOrderByWithRelationInput[] = [
      { [query.sortBy]: query.sortOrder },
      ...(query.sortBy === 'dayOfWeek'
        ? [{ periodNumber: 'asc' as const }]
        : [{ dayOfWeek: 'asc' as const }]),
    ];

    const [total, entries] = await this.prisma.$transaction([
      this.prisma.timetableEntry.count({ where }),
      this.prisma.timetableEntry.findMany({
        where,
        orderBy,
        skip: getSkip(query.page, query.limit),
        take: query.limit,
        include: timetableEntryInclude,
      }),
    ]);

    return {
      items: entries.map(toTimetableEntryResponse),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async listByCourseSection(
    schoolId: string,
    courseSectionId: string,
    query: ListTimetableEntriesQuery,
  ): Promise<{ items: TimetableEntryResponse[]; meta: PaginationMeta }> {
    await this.courseSectionsService.findCourseSectionInTenant(
      schoolId,
      courseSectionId,
    );

    return this.list(schoolId, {
      ...query,
      courseSectionId,
    });
  }

  async findById(
    schoolId: string,
    entryId: string,
  ): Promise<TimetableEntryResponse> {
    const entry = await this.findEntryInTenant(schoolId, entryId);
    return toTimetableEntryResponse(entry);
  }

  async create(
    schoolId: string,
    input: CreateTimetableEntryInput,
  ): Promise<TimetableEntryResponse> {
    const courseSection =
      await this.courseSectionsService.findCourseSectionInTenant(
        schoolId,
        input.courseSectionId,
      );

    if (courseSection.status !== AcademicEntityStatus.ACTIVE) {
      throw new AppException(
        'COURSE_SECTION_NOT_FOUND',
        'Lớp môn học không hoạt động',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    await this.validateTeacherForEntry(schoolId, input.teacherId);

    await this.assertTeacherAssigned(
      schoolId,
      input.teacherId,
      input.courseSectionId,
    );

    await this.assertTeacherSlotAvailable(
      courseSection.semesterId,
      input.teacherId,
      input.dayOfWeek,
      input.periodNumber,
    );

    const existing = await this.prisma.timetableEntry.findUnique({
      where: {
        courseSectionId_dayOfWeek_periodNumber: {
          courseSectionId: input.courseSectionId,
          dayOfWeek: input.dayOfWeek,
          periodNumber: input.periodNumber,
        },
      },
    });

    if (existing) {
      if (existing.status === AcademicEntityStatus.ACTIVE) {
        throw new AppException(
          'TIMETABLE_SLOT_CONFLICT',
          'Lớp môn đã có tiết học vào thứ và tiết này',
          HttpStatus.CONFLICT,
        );
      }

      const reactivated = await this.prisma.timetableEntry.update({
        where: { id: existing.id },
        data: {
          teacherId: input.teacherId,
          room: input.room ?? null,
          status: AcademicEntityStatus.ACTIVE,
        },
        include: timetableEntryInclude,
      });

      return toTimetableEntryResponse(reactivated);
    }

    try {
      const entry = await this.prisma.timetableEntry.create({
        data: {
          schoolId,
          semesterId: courseSection.semesterId,
          courseSectionId: input.courseSectionId,
          teacherId: input.teacherId,
          dayOfWeek: input.dayOfWeek,
          periodNumber: input.periodNumber,
          room: input.room ?? null,
          status: AcademicEntityStatus.ACTIVE,
        },
        include: timetableEntryInclude,
      });

      return toTimetableEntryResponse(entry);
    } catch (error: unknown) {
      this.handleSlotConflict(error);
      throw error;
    }
  }

  async update(
    schoolId: string,
    entryId: string,
    input: UpdateTimetableEntryInput,
  ): Promise<TimetableEntryResponse> {
    const existing = await this.findEntryInTenant(schoolId, entryId);

    if (existing.status !== AcademicEntityStatus.ACTIVE) {
      throw new AppException(
        'TIMETABLE_ENTRY_NOT_FOUND',
        'Chỉ có thể cập nhật tiết học đang ACTIVE',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const teacherId = input.teacherId ?? existing.teacherId;
    const dayOfWeek = input.dayOfWeek ?? existing.dayOfWeek;
    const periodNumber = input.periodNumber ?? existing.periodNumber;

    if (input.teacherId !== undefined) {
      await this.validateTeacherForEntry(schoolId, teacherId);
      await this.assertTeacherAssigned(
        schoolId,
        teacherId,
        existing.courseSectionId,
      );
    }

    const slotChanged =
      dayOfWeek !== existing.dayOfWeek ||
      periodNumber !== existing.periodNumber;

    if (slotChanged) {
      const slotTaken = await this.prisma.timetableEntry.findFirst({
        where: {
          courseSectionId: existing.courseSectionId,
          dayOfWeek,
          periodNumber,
          status: AcademicEntityStatus.ACTIVE,
          id: { not: entryId },
        },
      });

      if (slotTaken) {
        throw new AppException(
          'TIMETABLE_SLOT_CONFLICT',
          'Lớp môn đã có tiết học vào thứ và tiết này',
          HttpStatus.CONFLICT,
        );
      }
    }

    const teacherChanged =
      teacherId !== existing.teacherId ||
      dayOfWeek !== existing.dayOfWeek ||
      periodNumber !== existing.periodNumber;

    if (teacherChanged) {
      await this.assertTeacherSlotAvailable(
        existing.semesterId,
        teacherId,
        dayOfWeek,
        periodNumber,
        entryId,
      );
    }

    try {
      const updated = await this.prisma.timetableEntry.update({
        where: { id: entryId },
        data: {
          ...(input.teacherId !== undefined ? { teacherId: input.teacherId } : {}),
          ...(input.dayOfWeek !== undefined ? { dayOfWeek: input.dayOfWeek } : {}),
          ...(input.periodNumber !== undefined
            ? { periodNumber: input.periodNumber }
            : {}),
          ...(input.room !== undefined ? { room: input.room } : {}),
        },
        include: timetableEntryInclude,
      });

      return toTimetableEntryResponse(updated);
    } catch (error: unknown) {
      this.handleSlotConflict(error);
      throw error;
    }
  }

  async remove(
    schoolId: string,
    entryId: string,
  ): Promise<TimetableEntryResponse> {
    const existing = await this.findEntryInTenant(schoolId, entryId);

    if (existing.status === AcademicEntityStatus.INACTIVE) {
      return toTimetableEntryResponse(existing);
    }

    const updated = await this.prisma.timetableEntry.update({
      where: { id: entryId },
      data: { status: AcademicEntityStatus.INACTIVE },
      include: timetableEntryInclude,
    });

    return toTimetableEntryResponse(updated);
  }

  private async validateTeacherForEntry(
    schoolId: string,
    teacherId: string,
  ): Promise<void> {
    const teacher = await this.teachersService.findTeacherInTenant(
      schoolId,
      teacherId,
    );

    if (teacher.status !== AcademicEntityStatus.ACTIVE) {
      throw new AppException(
        'TEACHER_NOT_FOUND',
        'Giáo viên không hoạt động',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private async assertTeacherAssigned(
    schoolId: string,
    teacherId: string,
    courseSectionId: string,
  ): Promise<void> {
    const assignment = await this.prisma.teachingAssignment.findFirst({
      where: {
        schoolId,
        teacherId,
        courseSectionId,
        status: AcademicEntityStatus.ACTIVE,
      },
    });

    if (!assignment) {
      throw new AppException(
        'TEACHER_NOT_ASSIGNED',
        'Giáo viên chưa được phân công lớp môn này',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private async assertTeacherSlotAvailable(
    semesterId: string,
    teacherId: string,
    dayOfWeek: number,
    periodNumber: number,
    excludeEntryId?: string,
  ): Promise<void> {
    const conflict = await this.prisma.timetableEntry.findFirst({
      where: {
        semesterId,
        teacherId,
        dayOfWeek,
        periodNumber,
        status: AcademicEntityStatus.ACTIVE,
        ...(excludeEntryId ? { id: { not: excludeEntryId } } : {}),
      },
    });

    if (conflict) {
      throw new AppException(
        'TEACHER_TIMETABLE_CONFLICT',
        'Giáo viên đã có tiết học vào thứ và tiết này trong cùng học kỳ',
        HttpStatus.CONFLICT,
      );
    }
  }

  private async findEntryInTenant(schoolId: string, entryId: string) {
    const entry = await this.prisma.timetableEntry.findFirst({
      where: { id: entryId, schoolId },
      include: timetableEntryInclude,
    });

    if (!entry) {
      throw new AppException(
        'TIMETABLE_ENTRY_NOT_FOUND',
        'Không tìm thấy tiết thời khóa biểu',
        HttpStatus.NOT_FOUND,
      );
    }

    return entry;
  }

  private async resolveSemesterId(
    schoolId: string,
    query: ListTimetableEntriesQuery,
  ): Promise<string | undefined> {
    if (query.includeAllSemesters) {
      return query.semesterId;
    }

    if (query.semesterId) {
      return query.semesterId;
    }

    if (query.academicYearId) {
      return undefined;
    }

    const currentSemester =
      await this.semestersService.findCurrentForSchool(schoolId);

    return currentSemester.id;
  }

  private handleSlotConflict(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppException(
        'TIMETABLE_SLOT_CONFLICT',
        'Lớp môn đã có tiết học vào thứ và tiết này',
        HttpStatus.CONFLICT,
      );
    }
  }
}
