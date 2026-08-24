import { EnrollmentStatus, PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

config({ path: resolve(__dirname, '../../.env.development') });
config({ path: resolve(__dirname, '../../.env') });

/**
 * Bù ghi danh ACTIVE sang HK đích từ HK nguồn (ACTIVE hoặc SEMESTER_COMPLETED).
 * Dùng khi đã đóng HK1 nhưng chưa tạo được ghi danh HK2.
 */
const envSchema = z.object({
  SEED_SCHOOL_CODE: z.string().min(1).default('DEMO'),
  SEED_YEAR_CODE: z.string().min(1).optional(),
  SEED_SOURCE_SEMESTER_CODE: z.string().min(1).default('HK1'),
  SEED_TARGET_SEMESTER_CODE: z.string().min(1).default('HK2'),
});

async function main(): Promise<void> {
  const env = envSchema.parse(process.env);
  const prisma = new PrismaClient();

  try {
    const school = await prisma.school.findUniqueOrThrow({
      where: { code: env.SEED_SCHOOL_CODE },
    });

    const academicYear = env.SEED_YEAR_CODE
      ? await prisma.academicYear.findFirstOrThrow({
          where: { schoolId: school.id, code: env.SEED_YEAR_CODE },
        })
      : await prisma.academicYear.findFirstOrThrow({
          where: { schoolId: school.id, isCurrent: true },
        });

    const [sourceSemester, targetSemester] = await Promise.all([
      prisma.semester.findFirstOrThrow({
        where: {
          schoolId: school.id,
          academicYearId: academicYear.id,
          code: env.SEED_SOURCE_SEMESTER_CODE,
        },
      }),
      prisma.semester.findFirstOrThrow({
        where: {
          schoolId: school.id,
          academicYearId: academicYear.id,
          code: env.SEED_TARGET_SEMESTER_CODE,
        },
      }),
    ]);

    const sourceRaw = await prisma.studentEnrollment.findMany({
      where: {
        schoolId: school.id,
        semesterId: sourceSemester.id,
        status: {
          in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.SEMESTER_COMPLETED],
        },
      },
      select: {
        studentId: true,
        homeroomClassId: true,
        status: true,
        homeroomClass: { select: { code: true } },
      },
      orderBy: [{ status: 'asc' }, { enrolledAt: 'asc' }],
    });

    const seen = new Set<string>();
    const source = sourceRaw.filter((row) => {
      if (seen.has(row.studentId)) return false;
      seen.add(row.studentId);
      return true;
    });

    const existing = new Set(
      (
        await prisma.studentEnrollment.findMany({
          where: {
            schoolId: school.id,
            semesterId: targetSemester.id,
            status: EnrollmentStatus.ACTIVE,
            studentId: { in: source.map((row) => row.studentId) },
          },
          select: { studentId: true },
        })
      ).map((row) => row.studentId),
    );

    const toCreate = source.filter((row) => !existing.has(row.studentId));

    console.log(
      `Backfill enrollments ${sourceSemester.code} → ${targetSemester.code}`,
    );
    console.log(
      `  source=${source.length}, alreadyOnTarget=${existing.size}, toCreate=${toCreate.length}`,
    );

    if (toCreate.length === 0) {
      console.log('Nothing to create.');
      return;
    }

    const result = await prisma.studentEnrollment.createMany({
      data: toCreate.map((row) => ({
        schoolId: school.id,
        studentId: row.studentId,
        semesterId: targetSemester.id,
        homeroomClassId: row.homeroomClassId,
        enrolledAt: targetSemester.startDate,
        note: `Ghi danh ${row.homeroomClass.code} ${targetSemester.code}`,
        status: EnrollmentStatus.ACTIVE,
      })),
    });

    // Đảm bảo HK1 đã đóng nếu còn ACTIVE
    const closed = await prisma.studentEnrollment.updateMany({
      where: {
        schoolId: school.id,
        semesterId: sourceSemester.id,
        status: EnrollmentStatus.ACTIVE,
      },
      data: {
        status: EnrollmentStatus.SEMESTER_COMPLETED,
        leftAt: sourceSemester.endDate,
      },
    });

    console.log('Done:', {
      created: result.count,
      sourceClosedNow: closed.count,
    });
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
