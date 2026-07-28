import type {
  CourseSection,
  Semester,
  Teacher,
  TimetableEntry,
} from '@prisma/client';

type TimetableEntryWithRelations = TimetableEntry & {
  courseSection: Pick<
    CourseSection,
    'id' | 'code' | 'name' | 'homeroomClassId'
  >;
  teacher: Pick<Teacher, 'id' | 'fullName'>;
  semester: Pick<Semester, 'id' | 'academicYearId'>;
};

export interface TimetableEntryResponse {
  id: string;
  semesterId: string;
  academicYearId: string;
  courseSectionId: string;
  courseSectionCode: string;
  courseSectionName: string;
  homeroomClassId: string | null;
  teacherId: string;
  teacherFullName: string;
  dayOfWeek: number;
  periodNumber: number;
  room: string | null;
  status: TimetableEntry['status'];
}

export const timetableEntryInclude = {
  courseSection: {
    select: { id: true, code: true, name: true, homeroomClassId: true },
  },
  teacher: {
    select: { id: true, fullName: true },
  },
  semester: {
    select: { id: true, academicYearId: true },
  },
} as const;

export function toTimetableEntryResponse(
  entry: TimetableEntryWithRelations,
): TimetableEntryResponse {
  return {
    id: entry.id,
    semesterId: entry.semesterId,
    academicYearId: entry.semester.academicYearId,
    courseSectionId: entry.courseSectionId,
    courseSectionCode: entry.courseSection.code,
    courseSectionName: entry.courseSection.name,
    homeroomClassId: entry.courseSection.homeroomClassId,
    teacherId: entry.teacherId,
    teacherFullName: entry.teacher.fullName,
    dayOfWeek: entry.dayOfWeek,
    periodNumber: entry.periodNumber,
    room: entry.room,
    status: entry.status,
  };
}
