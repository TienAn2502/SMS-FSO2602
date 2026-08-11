import {
  AcademicEntityStatus,
  PrismaClient,
} from '@prisma/client';

import { THPT_SUBJECTS } from './thpt-curriculum';

const ASSIGN_BATCH_SIZE = 100;

export interface TeachingTimetableSeedResult {
  assignmentCount: number;
  timetableCount: number;
}

export interface TimetableSeedResult {
  timetableCount: number;
  skippedCount: number;
}

/** Tính slot TKB: tránh trùng tiết trong lớp và trùng lịch GV cùng môn. */
export function computeTimetableSlot(
  classIndex: number,
  subjectIndex: number,
): { dayOfWeek: number; periodNumber: number } {
  const offset = classIndex * THPT_SUBJECTS.length + subjectIndex;
  return {
    dayOfWeek: (offset % 5) + 1,
    periodNumber: (Math.floor(offset / 5) % 3) + 1,
  };
}

function buildTeachersBySubjectIndex(
  teachers: Array<{ id: string; user: { email: string } | null }>,
): Map<number, string[]> {
  const sorted = [...teachers].sort((a, b) =>
    (a.user?.email ?? '').localeCompare(b.user?.email ?? ''),
  );

  const bySubject = new Map<number, string[]>();
  sorted.forEach((teacher, index) => {
    const subjectIndex = index % THPT_SUBJECTS.length;
    const list = bySubject.get(subjectIndex) ?? [];
    list.push(teacher.id);
    bySubject.set(subjectIndex, list);
  });

  return bySubject;
}

function buildHomeroomClassIndexMap(
  homeroomClasses: Array<{ id: string; code: string }>,
): Map<string, number> {
  const sorted = [...homeroomClasses].sort((a, b) => a.code.localeCompare(b.code));
  return new Map(sorted.map((homeroomClass, index) => [homeroomClass.id, index]));
}

/** Seed TKB từ phân công GV hiện có (không tạo teaching assignment mới). */
export async function seedTimetableEntriesForSemester(
  prisma: PrismaClient,
  schoolId: string,
  semesterId: string,
  options?: { replaceExisting?: boolean },
): Promise<TimetableSeedResult> {
  if (options?.replaceExisting) {
    await prisma.timetableEntry.deleteMany({ where: { schoolId, semesterId } });
  }

  const existingCount = await prisma.timetableEntry.count({
    where: { schoolId, semesterId },
  });
  if (existingCount > 0 && !options?.replaceExisting) {
    return { timetableCount: 0, skippedCount: existingCount };
  }

  const [courseSections, homeroomClasses] = await Promise.all([
    prisma.courseSection.findMany({
      where: { schoolId, semesterId, status: AcademicEntityStatus.ACTIVE },
      include: {
        gradeLevelSubject: { include: { subject: true } },
        homeroomClass: { select: { id: true, code: true } },
        teachingAssignments: {
          where: { schoolId, status: AcademicEntityStatus.ACTIVE },
          select: { teacherId: true },
          take: 1,
        },
      },
    }),
    prisma.homeroomClass.findMany({
      where: { schoolId, status: AcademicEntityStatus.ACTIVE },
      select: { id: true, code: true },
    }),
  ]);

  const classIndexById = buildHomeroomClassIndexMap(homeroomClasses);

  const timetableRows: Array<{
    schoolId: string;
    semesterId: string;
    courseSectionId: string;
    teacherId: string;
    dayOfWeek: number;
    periodNumber: number;
    room: string;
    status: AcademicEntityStatus;
  }> = [];

  let skippedCount = 0;

  for (const section of courseSections) {
    const teacherId = section.teachingAssignments[0]?.teacherId;
    if (!teacherId) {
      skippedCount += 1;
      continue;
    }

    const subjectCode = section.gradeLevelSubject.subject.code;
    const subjectIndex = THPT_SUBJECTS.findIndex(
      (subject) => subject.code === subjectCode,
    );
    if (subjectIndex < 0) {
      throw new Error(`Unknown subject code in course section ${section.code}`);
    }

    const homeroomClassId = section.homeroomClass?.id;
    if (!homeroomClassId) {
      throw new Error(`Course section ${section.code} missing homeroom class`);
    }

    const classIndex = classIndexById.get(homeroomClassId);
    if (classIndex === undefined) {
      throw new Error(`Missing class index for homeroom ${homeroomClassId}`);
    }

    const slot = computeTimetableSlot(classIndex, subjectIndex);
    const room = section.homeroomClass?.code ?? 'P.101';

    timetableRows.push({
      schoolId,
      semesterId,
      courseSectionId: section.id,
      teacherId,
      dayOfWeek: slot.dayOfWeek,
      periodNumber: slot.periodNumber,
      room: `P.${room}`,
      status: AcademicEntityStatus.ACTIVE,
    });
  }

  for (let i = 0; i < timetableRows.length; i += ASSIGN_BATCH_SIZE) {
    await prisma.timetableEntry.createMany({
      data: timetableRows.slice(i, i + ASSIGN_BATCH_SIZE),
    });
  }

  return {
    timetableCount: timetableRows.length,
    skippedCount,
  };
}

export async function seedTeachingAssignmentsAndTimetable(
  prisma: PrismaClient,
  schoolId: string,
  semesterId: string,
  assignAt: Date,
  options?: { replaceExisting?: boolean },
): Promise<TeachingTimetableSeedResult> {
  const replaceExisting = options?.replaceExisting ?? false;

  if (replaceExisting) {
    await prisma.timetableEntry.deleteMany({ where: { schoolId, semesterId } });
    await prisma.teachingAssignment.deleteMany({
      where: {
        schoolId,
        courseSection: { semesterId },
      },
    });
  } else {
    const [existingAssignments, existingTimetable] = await Promise.all([
      prisma.teachingAssignment.count({
        where: { schoolId, courseSection: { semesterId } },
      }),
      prisma.timetableEntry.count({ where: { schoolId, semesterId } }),
    ]);

    if (existingAssignments > 0 || existingTimetable > 0) {
      return {
        assignmentCount: 0,
        timetableCount: 0,
      };
    }
  }

  const [teachers, courseSections, homeroomClasses] = await Promise.all([
    prisma.teacher.findMany({
      where: { schoolId, status: AcademicEntityStatus.ACTIVE },
      include: { user: { select: { email: true } } },
    }),
    prisma.courseSection.findMany({
      where: { schoolId, semesterId, status: AcademicEntityStatus.ACTIVE },
      include: {
        gradeLevelSubject: { include: { subject: true } },
        homeroomClass: { select: { id: true, code: true } },
      },
    }),
    prisma.homeroomClass.findMany({
      where: { schoolId, status: AcademicEntityStatus.ACTIVE },
      select: { id: true, code: true },
    }),
  ]);

  if (courseSections.length === 0) {
    throw new Error(
      'Không có lớp môn ACTIVE trong học kỳ — cần seed lớp môn trước',
    );
  }

  if (teachers.length === 0) {
    throw new Error('Không có giáo viên ACTIVE — cần seed giáo viên trước');
  }
  const teachersBySubject = buildTeachersBySubjectIndex(teachers);
  const classIndexById = buildHomeroomClassIndexMap(homeroomClasses);

  const assignmentRows: Array<{
    schoolId: string;
    teacherId: string;
    courseSectionId: string;
    assignAt: Date;
    status: AcademicEntityStatus;
  }> = [];

  const timetableRows: Array<{
    schoolId: string;
    semesterId: string;
    courseSectionId: string;
    teacherId: string;
    dayOfWeek: number;
    periodNumber: number;
    room: string;
    status: AcademicEntityStatus;
  }> = [];

  for (const section of courseSections) {
    const subjectCode = section.gradeLevelSubject.subject.code;
    const subjectIndex = THPT_SUBJECTS.findIndex(
      (subject) => subject.code === subjectCode,
    );
    if (subjectIndex < 0) {
      throw new Error(`Unknown subject code in course section ${section.code}`);
    }

    const homeroomClassId = section.homeroomClass?.id;
    if (!homeroomClassId) {
      throw new Error(`Course section ${section.code} missing homeroom class`);
    }

    const classIndex = classIndexById.get(homeroomClassId);
    if (classIndex === undefined) {
      throw new Error(`Missing class index for homeroom ${homeroomClassId}`);
    }

    const subjectTeachers = teachersBySubject.get(subjectIndex);
    if (!subjectTeachers?.length) {
      throw new Error(`No teacher seeded for subject ${subjectCode}`);
    }

    const teacherId = subjectTeachers[classIndex % subjectTeachers.length]!;
    const slot = computeTimetableSlot(classIndex, subjectIndex);
    const room = section.homeroomClass?.code ?? 'P.101';

    assignmentRows.push({
      schoolId,
      teacherId,
      courseSectionId: section.id,
      assignAt,
      status: AcademicEntityStatus.ACTIVE,
    });

    timetableRows.push({
      schoolId,
      semesterId,
      courseSectionId: section.id,
      teacherId,
      dayOfWeek: slot.dayOfWeek,
      periodNumber: slot.periodNumber,
      room: `P.${room}`,
      status: AcademicEntityStatus.ACTIVE,
    });
  }

  for (let i = 0; i < assignmentRows.length; i += ASSIGN_BATCH_SIZE) {
    await prisma.teachingAssignment.createMany({
      data: assignmentRows.slice(i, i + ASSIGN_BATCH_SIZE),
    });
  }

  for (let i = 0; i < timetableRows.length; i += ASSIGN_BATCH_SIZE) {
    await prisma.timetableEntry.createMany({
      data: timetableRows.slice(i, i + ASSIGN_BATCH_SIZE),
    });
  }

  return {
    assignmentCount: assignmentRows.length,
    timetableCount: timetableRows.length,
  };
}
