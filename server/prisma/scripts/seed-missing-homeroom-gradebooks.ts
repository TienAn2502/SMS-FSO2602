import {
  AcademicEntityStatus,
  AssessmentStatus,
  EnrollmentStatus,
  PrismaClient,
  SummaryStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

import { seedGradebook } from '../seed-data/gradebook';
import { seedSummaries } from '../seed-data/summaries';
import {
  DEMO_GRADE_LEVELS,
  STUDENTS_PER_CLASS,
  buildStudentDemoEmail,
  buildStudentDemoPhone,
} from '../seed-data/thpt-curriculum';
import { generateStudentProfile } from '../seed-data/vietnamese-names';

config({ path: resolve(__dirname, '../../.env.development') });
config({ path: resolve(__dirname, '../../.env') });

/** Lớp HC còn thiếu sổ điểm trên UI khóa HK (không có HS ghi danh). */
const DEFAULT_MISSING_CLASSES = [
  '11A4',
  '11A5',
  '12A1',
  '12A2',
  '12A3',
  '12A4',
  '12A5',
];

const envSchema = z.object({
  SEED_SCHOOL_CODE: z.string().min(1).default('DEMO'),
  SEED_YEAR_CODE: z.string().min(1).optional(),
  SEED_SEMESTER_CODE: z.string().min(1).default('HK1'),
  SEED_DEMO_PASSWORD: z.string().min(8).default('Demo@123456'),
  SEED_MISSING_CLASS_CODES: z.string().optional(),
});

async function main(): Promise<void> {
  const env = envSchema.parse(process.env);
  const prisma = new PrismaClient();
  const targetCodes = (
    env.SEED_MISSING_CLASS_CODES?.split(',') ?? DEFAULT_MISSING_CLASSES
  )
    .map((code) => code.trim())
    .filter(Boolean);

  try {
    const school = await prisma.school.findUniqueOrThrow({
      where: { code: env.SEED_SCHOOL_CODE },
    });

    const academicYear = env.SEED_YEAR_CODE
      ? await prisma.academicYear.findFirstOrThrow({
          where: { schoolId: school.id, code: env.SEED_YEAR_CODE },
        })
      : ((await prisma.academicYear.findFirst({
          where: { schoolId: school.id, isCurrent: true },
        })) ??
        (await prisma.academicYear.findFirstOrThrow({
          where: { schoolId: school.id },
          orderBy: { startDate: 'desc' },
        })));

    const semester = await prisma.semester.findFirstOrThrow({
      where: {
        schoolId: school.id,
        academicYearId: academicYear.id,
        code: env.SEED_SEMESTER_CODE,
      },
    });

    console.log(
      `Fill missing classes (${academicYear.name} / ${semester.code}): ${targetCodes.join(', ')}`,
    );

    const existingStudentCount = await prisma.student.count({
      where: { schoolId: school.id },
    });
    let globalIndex = existingStudentCount;
    const demoPasswordHash = await bcrypt.hash(env.SEED_DEMO_PASSWORD, 12);

    let studentsCreated = 0;
    let enrollmentsCreated = 0;

    for (const code of targetCodes) {
      const homeroom = await prisma.homeroomClass.findFirst({
        where: {
          schoolId: school.id,
          academicYearId: academicYear.id,
          code: { equals: code, mode: 'insensitive' },
        },
        include: { gradeLevel: { select: { code: true } } },
      });

      if (!homeroom) {
        console.log(`  skip ${code}: không tìm thấy lớp HC`);
        continue;
      }

      const enrollmentCount = await prisma.studentEnrollment.count({
        where: {
          schoolId: school.id,
          semesterId: semester.id,
          homeroomClassId: homeroom.id,
          status: {
            in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.SEMESTER_COMPLETED],
          },
        },
      });

      if (enrollmentCount > 0) {
        console.log(
          `  ${homeroom.code}: đã có ${enrollmentCount} HS — bỏ qua tạo HS`,
        );
        continue;
      }

      const grade = DEMO_GRADE_LEVELS.find(
        (item) => item.code === homeroom.gradeLevel.code,
      );
      if (!grade) {
        throw new Error(`Missing grade config ${homeroom.gradeLevel.code}`);
      }

      console.log(
        `  ${homeroom.code}: tạo ${STUDENTS_PER_CLASS} HS + ghi danh HK1...`,
      );

      for (let seat = 1; seat <= STUDENTS_PER_CLASS; seat += 1) {
        const profile = generateStudentProfile(globalIndex, grade.birthYear);
        const email = buildStudentDemoEmail(globalIndex);

        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email,
              passwordHash: demoPasswordHash,
              fullName: profile.fullName,
              role: UserRole.STUDENT,
              schoolId: school.id,
              status: UserStatus.ACTIVE,
            },
          });

          const student = await tx.student.create({
            data: {
              schoolId: school.id,
              userId: user.id,
              fullName: profile.fullName,
              dateOfBirth: profile.dateOfBirth,
              gender: profile.gender,
              phone: buildStudentDemoPhone(globalIndex),
              status: AcademicEntityStatus.ACTIVE,
              externalCode: `HS-25${globalIndex + 1}`,
            },
          });

          await tx.studentEnrollment.create({
            data: {
              schoolId: school.id,
              studentId: student.id,
              semesterId: semester.id,
              homeroomClassId: homeroom.id,
              enrolledAt: new Date('2025-09-01'),
              note: `Ghi danh ${homeroom.code} HK1`,
              status: EnrollmentStatus.ACTIVE,
            },
          });
        });

        studentsCreated += 1;
        enrollmentsCreated += 1;
        globalIndex += 1;
      }
    }

    console.log(
      `Students created: ${studentsCreated}, enrollments: ${enrollmentsCreated}`,
    );

    console.log('Seed sổ điểm (chỉ lớp/môn chưa có assessment)...');
    const gradebook = await seedGradebook(prisma, school.id, semester.id, {
      homeroomClassCodes: targetCodes,
      replaceExisting: false,
    });
    console.log('  ', gradebook);

    console.log('Tái tính tổng kết DRAFT toàn HK...');
    const summaries = await seedSummaries(prisma, school.id, semester.id, {
      status: SummaryStatus.DRAFT,
      createYearSummaries: false,
    });
    console.log('  ', summaries);

    console.log('Khóa sổ điểm còn OPEN...');
    const locked = await prisma.assessment.updateMany({
      where: {
        schoolId: school.id,
        semesterId: semester.id,
        status: AssessmentStatus.OPEN,
      },
      data: { status: AssessmentStatus.CLOSED },
    });
    console.log('  ', { assessmentsLocked: locked.count });

    console.log('Done — học kỳ vẫn chưa chốt (summaries DRAFT).');
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
