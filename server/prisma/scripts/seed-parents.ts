import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

import { seedParents } from '../seed-data/parents';
import {
  DEMO_PARENT_ACCOUNT_COUNT,
  DEMO_STUDENTS_WITH_PARENTS,
} from '../seed-data/thpt-curriculum';

config({ path: resolve(__dirname, '../../.env.development') });
config({ path: resolve(__dirname, '../../.env') });

/**
 * Seed hồ sơ PH + liên kết HS (và tài khoản parent01… cho một phần).
 * Idempotent: xóa PH / liên kết / user PARENT của trường rồi tạo lại.
 *
 * Env:
 * - SEED_SCHOOL_CODE (mặc định DEMO)
 * - SEED_DEMO_PASSWORD (mặc định Demo@123456)
 * - SEED_PARENTS_REPLACE (mặc định true)
 */
const envSchema = z.object({
  SEED_SCHOOL_CODE: z.string().min(1).default('DEMO'),
  SEED_DEMO_PASSWORD: z.string().min(8).default('Demo@123456'),
  SEED_PARENTS_REPLACE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
});

async function clearParentsForSchool(
  prisma: PrismaClient,
  schoolId: string,
): Promise<void> {
  await prisma.$transaction([
    prisma.studentParent.deleteMany({ where: { schoolId } }),
    prisma.parent.deleteMany({ where: { schoolId } }),
    prisma.user.deleteMany({
      where: { schoolId, role: UserRole.PARENT },
    }),
  ]);
}

async function main(): Promise<void> {
  const env = envSchema.parse(process.env);
  const prisma = new PrismaClient();

  try {
    const school = await prisma.school.findUniqueOrThrow({
      where: { code: env.SEED_SCHOOL_CODE },
    });

    const studentCount = await prisma.student.count({
      where: { schoolId: school.id },
    });
    if (studentCount === 0) {
      throw new Error(
        `Trường ${school.code} chưa có học sinh — chạy seed HS trước.`,
      );
    }

    const existingParents = await prisma.parent.count({
      where: { schoolId: school.id },
    });

    console.log(
      `Seeding parents (school=${school.code}, students=${studentCount}, existingParents=${existingParents})...`,
    );
    console.log(
      `  accounts≈${DEMO_PARENT_ACCOUNT_COUNT}, profiles for first ${DEMO_STUDENTS_WITH_PARENTS} students, replace=${env.SEED_PARENTS_REPLACE}`,
    );

    if (existingParents > 0 && !env.SEED_PARENTS_REPLACE) {
      console.log(
        'Skipped: đã có phụ huynh (đặt SEED_PARENTS_REPLACE=true để ghi đè).',
      );
      return;
    }

    if (existingParents > 0) {
      console.log('Clearing existing parents / links / PARENT users...');
      await clearParentsForSchool(prisma, school.id);
    }

    const demoPasswordHash = await bcrypt.hash(env.SEED_DEMO_PASSWORD, 12);
    const result = await seedParents(prisma, school.id, demoPasswordHash);

    console.log('Done.');
    console.log(
      `  Profiles: ${result.parentProfileCount} (login accounts: ${result.parentAccountCount}, password: ${env.SEED_DEMO_PASSWORD})`,
    );
    console.log(`  Student–parent links: ${result.studentParentLinkCount}`);
    console.log(
      '  Login tip: parent01@demo.edu.vn … hoặc mã PH-1 / SĐT 090…',
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
