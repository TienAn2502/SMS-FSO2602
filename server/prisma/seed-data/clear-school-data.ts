import { PrismaClient, UserRole } from '@prisma/client';

/** Xóa toàn bộ dữ liệu nghiệp vụ của trường demo (giữ school + SCHOOL_ADMIN). */
export async function clearSchoolDemoData(
  prisma: PrismaClient,
  schoolId: string,
): Promise<void> {
  await prisma.school.updateMany({
    where: { id: schoolId },
    data: { logoFileId: null },
  });

  await prisma.$transaction([
    prisma.attendanceRecord.deleteMany({ where: { schoolId } }),
    prisma.attendanceSession.deleteMany({ where: { schoolId } }),
    prisma.timetableEntry.deleteMany({ where: { schoolId } }),
    prisma.teachingAssignment.deleteMany({ where: { schoolId } }),
    prisma.studentParent.deleteMany({ where: { schoolId } }),
    prisma.studentEnrollment.deleteMany({ where: { schoolId } }),
    prisma.courseSection.deleteMany({ where: { schoolId } }),
    prisma.student.updateMany({
      where: { schoolId },
      data: { avatarFileId: null },
    }),
    prisma.student.deleteMany({ where: { schoolId } }),
    prisma.parent.deleteMany({ where: { schoolId } }),
    prisma.teacher.deleteMany({ where: { schoolId } }),
    prisma.homeroomClass.deleteMany({ where: { schoolId } }),
    prisma.gradeLevelSubject.deleteMany({ where: { schoolId } }),
    prisma.file.deleteMany({ where: { schoolId } }),
    prisma.semester.deleteMany({ where: { schoolId } }),
    prisma.academicYear.deleteMany({ where: { schoolId } }),
    prisma.gradeLevel.deleteMany({ where: { schoolId } }),
    prisma.subject.deleteMany({ where: { schoolId } }),
    prisma.user.deleteMany({
      where: {
        schoolId,
        role: { not: UserRole.SCHOOL_ADMIN },
      },
    }),
  ]);
}
