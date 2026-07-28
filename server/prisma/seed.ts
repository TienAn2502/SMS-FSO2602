import {
  AcademicEntityStatus,
  EnrollmentStatus,
  Gender,
  PrismaClient,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

import { clearSchoolDemoData } from './seed-data/clear-school-data';
import { seedAttendance } from './seed-data/attendance';
import { seedParents } from './seed-data/parents';
import { seedTeachingAssignmentsAndTimetable } from './seed-data/teaching-and-timetable';
import {
  CLASSES_PER_GRADE,
  DEMO_GRADE_LEVELS,
  DEMO_TEACHER_COUNT,
  STUDENTS_PER_CLASS,
  THPT_SUBJECTS,
  buildHomeroomClassCode,
  buildStudentDemoEmail,
  DEMO_PARENT_ACCOUNT_COUNT,
  DEMO_STUDENTS_WITH_PARENTS,
} from './seed-data/thpt-curriculum';
import {
  generateStudentProfile,
  generateTeacherName,
} from './seed-data/vietnamese-names';

config({ path: resolve(__dirname, '../.env.development') });
config({ path: resolve(__dirname, '../.env') });

const seedEnvSchema = z.object({
  SEED_ADMIN_EMAIL: z.string().email(),
  SEED_ADMIN_PASSWORD: z.string().min(8),
  SEED_DEMO_PASSWORD: z.string().min(8).default('Demo@123456'),
  SEED_SCHOOL_CODE: z.string().min(1),
  SEED_SCHOOL_NAME: z.string().min(1),
  SEED_SCHOOL_TYPE: z.enum(['TH', 'THCS', 'THPT', 'OTHER']).default('THPT'),
  SEED_CLEAR_DEMO: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
});

const prisma = new PrismaClient();

interface SeedUserInput {
  email: string;
  fullName: string;
  role: UserRole;
  passwordHash: string;
  schoolId: string;
}

interface HomeroomClassSeed {
  id: string;
  code: string;
  gradeCode: string;
}

async function upsertUser(input: SeedUserInput) {
  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      fullName: input.fullName,
      schoolId: input.schoolId,
      role: input.role,
    },
    create: {
      email: input.email,
      passwordHash: input.passwordHash,
      fullName: input.fullName,
      schoolId: input.schoolId,
      role: input.role,
    },
  });
}

async function seedTeachers(schoolId: string, demoPasswordHash: string) {
  const teachers: Array<{ teacherId: string; userId: string; index: number }> = [];

  for (let i = 0; i < DEMO_TEACHER_COUNT; i++) {
    const fullName = generateTeacherName(i);
    const specialization =
      THPT_SUBJECTS[i % THPT_SUBJECTS.length]?.name ?? 'Giáo viên';
    const email = `teacher${String(i + 1).padStart(2, '0')}@demo.edu.vn`;

    const user = await upsertUser({
      email,
      fullName,
      passwordHash: demoPasswordHash,
      schoolId,
      role: UserRole.TEACHER,
    });

    const teacher = await prisma.teacher.upsert({
      where: {
        schoolId_userId: {
          schoolId,
          userId: user.id,
        },
      },
      update: {
        fullName,
        specialization,
        gender: i % 2 === 0 ? Gender.MALE : Gender.FEMALE,
        status: AcademicEntityStatus.ACTIVE,
      },
      create: {
        schoolId,
        userId: user.id,
        fullName,
        specialization,
        gender: i % 2 === 0 ? Gender.MALE : Gender.FEMALE,
        status: AcademicEntityStatus.ACTIVE,
      },
    });

    teachers.push({ teacherId: teacher.id, userId: user.id, index: i });
  }

  return teachers;
}

async function seedAcademicStructure(
  schoolId: string,
  teacherIds: string[],
) {
  const academicYear = await prisma.academicYear.create({
    data: {
      schoolId,
      name: '2025-2026',
      code: '2025-26',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-05-31'),
      isCurrent: true,
      status: AcademicEntityStatus.ACTIVE,
    },
  });

  await prisma.academicYear.updateMany({
    where: {
      schoolId,
      isCurrent: true,
      id: { not: academicYear.id },
    },
    data: { isCurrent: false },
  });

  const hk1 = await prisma.semester.create({
    data: {
      schoolId,
      academicYearId: academicYear.id,
      code: 'HK1',
      name: 'Học kỳ 1',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2025-12-31'),
      isCurrent: true,
      status: AcademicEntityStatus.ACTIVE,
    },
  });

  await prisma.semester.create({
    data: {
      schoolId,
      academicYearId: academicYear.id,
      code: 'HK2',
      name: 'Học kỳ 2',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-05-31'),
      isCurrent: false,
      status: AcademicEntityStatus.ACTIVE,
    },
  });

  await prisma.semester.updateMany({
    where: { schoolId, id: { not: hk1.id } },
    data: { isCurrent: false },
  });

  const gradeLevelIds = new Map<string, string>();
  for (const grade of DEMO_GRADE_LEVELS) {
    const record = await prisma.gradeLevel.create({
      data: {
        schoolId,
        code: grade.code,
        name: grade.name,
      },
    });
    gradeLevelIds.set(grade.code, record.id);
  }

  const subjectIds = new Map<string, string>();
  for (const subject of THPT_SUBJECTS) {
    const record = await prisma.subject.create({
      data: {
        schoolId,
        code: subject.code,
        name: subject.name,
        status: AcademicEntityStatus.ACTIVE,
      },
    });
    subjectIds.set(subject.code, record.id);
  }

  const gradeLevelSubjectIds = new Map<string, string>();
  for (const grade of DEMO_GRADE_LEVELS) {
    const gradeLevelId = gradeLevelIds.get(grade.code);
    if (!gradeLevelId) {
      throw new Error(`Missing grade level ${grade.code}`);
    }

    for (const subject of THPT_SUBJECTS) {
      const subjectId = subjectIds.get(subject.code);
      if (!subjectId) {
        throw new Error(`Missing subject ${subject.code}`);
      }

      const key = `${grade.code}:${subject.code}`;
      const record = await prisma.gradeLevelSubject.create({
        data: {
          schoolId,
          gradeLevelId,
          subjectId,
          isRequired: subject.isRequired,
          status: AcademicEntityStatus.ACTIVE,
        },
      });
      gradeLevelSubjectIds.set(key, record.id);
    }
  }

  const homeroomClasses: HomeroomClassSeed[] = [];
  let homeroomTeacherCursor = 0;

  for (const grade of DEMO_GRADE_LEVELS) {
    const gradeLevelId = gradeLevelIds.get(grade.code);
    if (!gradeLevelId) {
      throw new Error(`Missing grade level ${grade.code}`);
    }

    for (let classIndex = 0; classIndex < CLASSES_PER_GRADE; classIndex++) {
      const code = buildHomeroomClassCode(grade.code, classIndex);
      const homeroomTeacherId =
        teacherIds[homeroomTeacherCursor % teacherIds.length];
      homeroomTeacherCursor += 1;

      if (!homeroomTeacherId) {
        throw new Error('Missing homeroom teacher for seed');
      }

      const homeroomClass = await prisma.homeroomClass.create({
        data: {
          schoolId,
          academicYearId: academicYear.id,
          gradeLevelId,
          name: code,
          code,
          capacity: 45,
          homeroomTeacherId,
          status: AcademicEntityStatus.ACTIVE,
        },
      });

      homeroomClasses.push({
        id: homeroomClass.id,
        code,
        gradeCode: grade.code,
      });

      for (const subject of THPT_SUBJECTS) {
        const gradeLevelSubjectId = gradeLevelSubjectIds.get(
          `${grade.code}:${subject.code}`,
        );
        if (!gradeLevelSubjectId) {
          throw new Error(
            `Missing grade level subject ${grade.code}:${subject.code}`,
          );
        }

        const sectionCode = `${subject.code}-${code}`;
        await prisma.courseSection.create({
          data: {
            schoolId,
            semesterId: hk1.id,
            homeroomClassId: homeroomClass.id,
            gradeLevelSubjectId,
            name: `${subject.name} ${code}`,
            code: sectionCode,
            status: AcademicEntityStatus.ACTIVE,
          },
        });
      }
    }
  }

  return {
    academicYear,
    hk1Semester: hk1,
    homeroomClasses,
    gradeLevelCount: gradeLevelIds.size,
    subjectCount: subjectIds.size,
    courseSectionCount:
      homeroomClasses.length * THPT_SUBJECTS.length,
  };
}

async function seedStudentsAndEnrollments(
  schoolId: string,
  semesterId: string,
  homeroomClasses: HomeroomClassSeed[],
  demoPasswordHash: string,
) {
  let studentCount = 0;
  let enrollmentCount = 0;
  let globalIndex = 0;

  for (const homeroomClass of homeroomClasses) {
    const grade = DEMO_GRADE_LEVELS.find(
      (item) => item.code === homeroomClass.gradeCode,
    );
    if (!grade) {
      throw new Error(`Missing grade config ${homeroomClass.gradeCode}`);
    }

    for (let seat = 1; seat <= STUDENTS_PER_CLASS; seat++) {
      const profile = generateStudentProfile(globalIndex, grade.birthYear);
      const email = buildStudentDemoEmail(globalIndex);

      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            passwordHash: demoPasswordHash,
            fullName: profile.fullName,
            role: UserRole.STUDENT,
            schoolId,
            status: UserStatus.ACTIVE,
          },
        });

        const student = await tx.student.create({
          data: {
            schoolId,
            userId: user.id,
            fullName: profile.fullName,
            dateOfBirth: profile.dateOfBirth,
            gender: profile.gender,
            status: AcademicEntityStatus.ACTIVE,
          },
        });

        await tx.studentEnrollment.create({
          data: {
            schoolId,
            studentId: student.id,
            semesterId,
            homeroomClassId: homeroomClass.id,
            enrolledAt: new Date('2025-09-01'),
            note: `Ghi danh ${homeroomClass.code} HK1`,
            status: EnrollmentStatus.ACTIVE,
          },
        });
      });

      studentCount += 1;
      enrollmentCount += 1;
      globalIndex += 1;
    }
  }

  return { studentCount, enrollmentCount };
}

async function main(): Promise<void> {
  const env = seedEnvSchema.parse(process.env);

  console.log(`Seeding school: ${env.SEED_SCHOOL_NAME}`);
  const school = await prisma.school.upsert({
    where: { code: env.SEED_SCHOOL_CODE },
    update: {
      name: env.SEED_SCHOOL_NAME,
      shortName: env.SEED_SCHOOL_NAME,
      schoolType: env.SEED_SCHOOL_TYPE,
    },
    create: {
      code: env.SEED_SCHOOL_CODE,
      name: env.SEED_SCHOOL_NAME,
      shortName: env.SEED_SCHOOL_NAME,
      schoolType: env.SEED_SCHOOL_TYPE,
    },
  });

  if (env.SEED_CLEAR_DEMO) {
    console.log('Clearing existing demo data for school...');
    await clearSchoolDemoData(prisma, school.id);
  }

  console.log(`Seeding admin user: ${env.SEED_ADMIN_EMAIL}`);
  const adminPasswordHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 12);

  const admin = await upsertUser({
    email: env.SEED_ADMIN_EMAIL,
    passwordHash: adminPasswordHash,
    fullName: 'Quản trị viên Demo',
    schoolId: school.id,
    role: UserRole.SCHOOL_ADMIN,
  });

  console.log(`Seeding ${DEMO_TEACHER_COUNT} demo teachers...`);
  const demoPasswordHash = await bcrypt.hash(env.SEED_DEMO_PASSWORD, 12);
  const teacherUsers = await seedTeachers(school.id, demoPasswordHash);
  const teacherIds = teacherUsers.map((teacher) => teacher.teacherId);

  console.log('Seeding academic structure (grades, subjects, homeroom classes)...');
  const academic = await seedAcademicStructure(school.id, teacherIds);

  const totalStudents =
    DEMO_GRADE_LEVELS.length * CLASSES_PER_GRADE * STUDENTS_PER_CLASS;
  console.log(`Seeding ${totalStudents} students (${STUDENTS_PER_CLASS}/lớp)...`);
  const students = await seedStudentsAndEnrollments(
    school.id,
    academic.hk1Semester.id,
    academic.homeroomClasses,
    demoPasswordHash,
  );

  console.log('Seeding teaching assignments and timetable entries...');
  const teachingTimetable = await seedTeachingAssignmentsAndTimetable(
    prisma,
    school.id,
    academic.hk1Semester.id,
    new Date('2025-09-01'),
  );

  console.log(
    `Seeding parents (${DEMO_PARENT_ACCOUNT_COUNT} accounts, ${DEMO_STUDENTS_WITH_PARENTS} students with profiles)...`,
  );
  const parents = await seedParents(prisma, school.id, demoPasswordHash);

  console.log('Seeding sample attendance (10A1 — TOAN/VAN/ANH)...');
  const attendance = await seedAttendance(
    prisma,
    school.id,
    academic.hk1Semester.id,
  );

  console.log('Seed completed.');
  console.log(`  School: ${school.name} (${school.code})`);
  console.log(`  Admin: ${admin.email} (${admin.role})`);
  console.log(
    `  Teachers: ${DEMO_TEACHER_COUNT} accounts (password: ${env.SEED_DEMO_PASSWORD})`,
  );
  console.log(
    `  Students: ${students.studentCount} accounts (student0001…${String(students.studentCount).padStart(4, '0')}@demo.edu.vn, password: ${env.SEED_DEMO_PASSWORD}) + ${students.enrollmentCount} enrollments`,
  );
  console.log(`  Academic year: ${academic.academicYear.name} (is_current)`);
  console.log(`  Grade levels: ${academic.gradeLevelCount}`);
  console.log(`  Subjects (BGD THPT): ${academic.subjectCount}`);
  console.log(
    `  Homeroom classes: ${DEMO_GRADE_LEVELS.length} khối × ${CLASSES_PER_GRADE} lớp = ${academic.homeroomClasses.length}`,
  );
  console.log(`  Course sections (HK1): ${academic.courseSectionCount}`);
  console.log(
    `  Teaching assignments: ${teachingTimetable.assignmentCount}`,
  );
  console.log(`  Timetable entries: ${teachingTimetable.timetableCount}`);
  console.log(
    `  Parents: ${parents.parentProfileCount} profiles (${parents.parentAccountCount} login accounts, password: ${env.SEED_DEMO_PASSWORD})`,
  );
  console.log(`  Student–parent links: ${parents.studentParentLinkCount}`);
  console.log(
    `  Attendance: ${attendance.sessionCount} sessions, ${attendance.recordCount} records (10A1 demo)`,
  );
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
