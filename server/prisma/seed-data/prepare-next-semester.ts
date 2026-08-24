import {
  AcademicEntityStatus,
  EnrollmentStatus,
  PrismaClient,
} from '@prisma/client';

export interface PrepareNextSemesterResult {
  courseSectionsCreated: number;
  courseSectionsSkipped: number;
  enrollmentsCreated: number;
  enrollmentsSkipped: number;
  sourceEnrollmentsClosed: number;
  teachingAssignmentsCreated: number;
  teachingAssignmentsSkipped: number;
}

/**
 * Sao chép lớp môn + ghi danh + phân công từ HK nguồn sang HK đích (cùng năm).
 * Đóng ghi danh ACTIVE ở HK nguồn → SEMESTER_COMPLETED.
 */
export async function prepareNextSemesterFromSource(
  prisma: PrismaClient,
  schoolId: string,
  sourceSemesterId: string,
  targetSemesterId: string,
): Promise<PrepareNextSemesterResult> {
  if (sourceSemesterId === targetSemesterId) {
    throw new Error('Source and target semester must differ');
  }

  const [sourceSemester, targetSemester] = await Promise.all([
    prisma.semester.findFirstOrThrow({
      where: { id: sourceSemesterId, schoolId },
    }),
    prisma.semester.findFirstOrThrow({
      where: { id: targetSemesterId, schoolId },
    }),
  ]);

  if (sourceSemester.academicYearId !== targetSemester.academicYearId) {
    throw new Error('Semesters must belong to the same academic year');
  }

  const sourceSections = await prisma.courseSection.findMany({
    where: {
      schoolId,
      semesterId: sourceSemesterId,
      status: AcademicEntityStatus.ACTIVE,
    },
    select: {
      homeroomClassId: true,
      gradeLevelSubjectId: true,
      name: true,
      code: true,
    },
    orderBy: { code: 'asc' },
  });

  const existingTargetSections = await prisma.courseSection.findMany({
    where: {
      schoolId,
      semesterId: targetSemesterId,
      status: AcademicEntityStatus.ACTIVE,
    },
    select: {
      homeroomClassId: true,
      gradeLevelSubjectId: true,
      code: true,
    },
  });

  const skipByClassSubject = new Set(
    existingTargetSections
      .filter((section) => section.homeroomClassId)
      .map(
        (section) =>
          `${section.homeroomClassId}:${section.gradeLevelSubjectId}`,
      ),
  );
  const skipByCode = new Set(
    existingTargetSections.map((section) => section.code),
  );

  const sectionsToCreate = sourceSections.filter((source) => {
    if (
      source.homeroomClassId &&
      skipByClassSubject.has(
        `${source.homeroomClassId}:${source.gradeLevelSubjectId}`,
      )
    ) {
      return false;
    }
    return !skipByCode.has(source.code);
  });

  let courseSectionsCreated = 0;
  if (sectionsToCreate.length > 0) {
    const result = await prisma.courseSection.createMany({
      data: sectionsToCreate.map((source) => ({
        schoolId,
        semesterId: targetSemesterId,
        homeroomClassId: source.homeroomClassId,
        gradeLevelSubjectId: source.gradeLevelSubjectId,
        name: source.name,
        code: source.code,
        status: AcademicEntityStatus.ACTIVE,
      })),
    });
    courseSectionsCreated = result.count;
  }

  const sourceEnrollmentsRaw = await prisma.studentEnrollment.findMany({
    where: {
      schoolId,
      semesterId: sourceSemesterId,
      status: {
        in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.SEMESTER_COMPLETED],
      },
    },
    select: {
      studentId: true,
      homeroomClassId: true,
      note: true,
      status: true,
      homeroomClass: { select: { code: true } },
    },
    orderBy: [{ status: 'asc' }, { enrolledAt: 'asc' }],
  });

  const seenStudentIds = new Set<string>();
  const sourceEnrollments = sourceEnrollmentsRaw.filter((row) => {
    if (seenStudentIds.has(row.studentId)) {
      return false;
    }
    seenStudentIds.add(row.studentId);
    return true;
  });

  const existingTargetStudentIds = new Set(
    (
      await prisma.studentEnrollment.findMany({
        where: {
          schoolId,
          semesterId: targetSemesterId,
          status: EnrollmentStatus.ACTIVE,
          studentId: { in: sourceEnrollments.map((row) => row.studentId) },
        },
        select: { studentId: true },
      })
    ).map((row) => row.studentId),
  );

  const enrollmentsToCreate = sourceEnrollments.filter(
    (row) => !existingTargetStudentIds.has(row.studentId),
  );

  let enrollmentsCreated = 0;
  if (enrollmentsToCreate.length > 0) {
    const result = await prisma.studentEnrollment.createMany({
      data: enrollmentsToCreate.map((source) => ({
        schoolId,
        studentId: source.studentId,
        semesterId: targetSemesterId,
        homeroomClassId: source.homeroomClassId,
        enrolledAt: targetSemester.startDate,
        note: `Ghi danh ${source.homeroomClass.code} ${targetSemester.code}`,
        status: EnrollmentStatus.ACTIVE,
      })),
    });
    enrollmentsCreated = result.count;
  }

  const closeResult = await prisma.studentEnrollment.updateMany({
    where: {
      schoolId,
      semesterId: sourceSemesterId,
      status: EnrollmentStatus.ACTIVE,
    },
    data: {
      status: EnrollmentStatus.SEMESTER_COMPLETED,
      leftAt: sourceSemester.endDate,
    },
  });

  const sourceAssignments = await prisma.teachingAssignment.findMany({
    where: {
      schoolId,
      status: AcademicEntityStatus.ACTIVE,
      courseSection: {
        semesterId: sourceSemesterId,
        status: AcademicEntityStatus.ACTIVE,
      },
    },
    include: {
      courseSection: { select: { code: true } },
    },
    orderBy: { assignAt: 'asc' },
  });

  const targetSections = await prisma.courseSection.findMany({
    where: {
      schoolId,
      semesterId: targetSemesterId,
      status: AcademicEntityStatus.ACTIVE,
    },
    select: { id: true, code: true },
  });
  const targetSectionIdByCode = new Map(
    targetSections.map((section) => [section.code, section.id]),
  );

  const sectionsWithActiveAssignment = new Set(
    (
      await prisma.teachingAssignment.findMany({
        where: {
          schoolId,
          status: AcademicEntityStatus.ACTIVE,
          courseSectionId: { in: targetSections.map((section) => section.id) },
        },
        select: { courseSectionId: true },
      })
    ).map((row) => row.courseSectionId),
  );

  let teachingAssignmentsCreated = 0;
  let teachingAssignmentsSkipped = 0;

  for (const source of sourceAssignments) {
    const targetSectionId = targetSectionIdByCode.get(source.courseSection.code);
    if (!targetSectionId || sectionsWithActiveAssignment.has(targetSectionId)) {
      teachingAssignmentsSkipped += 1;
      continue;
    }

    await prisma.teachingAssignment.create({
      data: {
        schoolId,
        teacherId: source.teacherId,
        courseSectionId: targetSectionId,
        assignAt: targetSemester.startDate,
        status: AcademicEntityStatus.ACTIVE,
      },
    });
    teachingAssignmentsCreated += 1;
    sectionsWithActiveAssignment.add(targetSectionId);
  }

  return {
    courseSectionsCreated,
    courseSectionsSkipped: sourceSections.length - sectionsToCreate.length,
    enrollmentsCreated,
    enrollmentsSkipped: sourceEnrollments.length - enrollmentsToCreate.length,
    sourceEnrollmentsClosed: closeResult.count,
    teachingAssignmentsCreated,
    teachingAssignmentsSkipped,
  };
}
