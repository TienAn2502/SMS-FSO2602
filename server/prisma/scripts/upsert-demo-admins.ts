import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

config({ path: resolve(__dirname, '../../.env.development') });
config({ path: resolve(__dirname, '../../.env') });

const envSchema = z.object({
  SEED_SCHOOL_CODE: z.string().min(1).default('demo-thpt'),
  SEED_ADMIN_EMAIL: z.string().email().default('school_admin@demo.edu.vn'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('SchoolAdmin@123456'),
  SEED_SYSTEM_ADMIN_EMAIL: z
    .string()
    .email()
    .default('system_admin@demo.edu.vn'),
  SEED_SYSTEM_ADMIN_PASSWORD: z
    .string()
    .min(8)
    .default('SystemAdmin@123456'),
  LEGACY_ADMIN_EMAIL: z.string().email().default('admin@demo.edu.vn'),
});

async function main(): Promise<void> {
  const env = envSchema.parse(process.env);
  const prisma = new PrismaClient();

  try {
    const legacyAdmin = await prisma.user.findUnique({
      where: { email: env.LEGACY_ADMIN_EMAIL },
    });

    const demoSchool =
      (legacyAdmin?.schoolId
        ? await prisma.school.findUnique({ where: { id: legacyAdmin.schoolId } })
        : null) ??
      (await prisma.school.findFirst({
        where: { code: env.SEED_SCHOOL_CODE },
      })) ??
      (await prisma.school.findFirst({
        orderBy: { createdAt: 'asc' },
      }));

    if (!demoSchool) {
      throw new Error(
        'Không tìm thấy trường demo. Chạy seed trước hoặc đặt SEED_SCHOOL_CODE.',
      );
    }

    const schoolAdminPasswordHash = await bcrypt.hash(
      env.SEED_ADMIN_PASSWORD,
      12,
    );
    const systemAdminPasswordHash = await bcrypt.hash(
      env.SEED_SYSTEM_ADMIN_PASSWORD,
      12,
    );

    const legacyAdminForRename = await prisma.user.findUnique({
      where: { email: env.LEGACY_ADMIN_EMAIL },
    });

    if (
      legacyAdminForRename &&
      legacyAdminForRename.email !== env.SEED_ADMIN_EMAIL
    ) {
      const existingTarget = await prisma.user.findUnique({
        where: { email: env.SEED_ADMIN_EMAIL },
      });

      if (existingTarget && existingTarget.id !== legacyAdminForRename.id) {
        await prisma.user.delete({ where: { id: legacyAdminForRename.id } });
        console.log(`Removed legacy admin duplicate: ${env.LEGACY_ADMIN_EMAIL}`);
      } else {
        await prisma.user.update({
          where: { id: legacyAdminForRename.id },
          data: {
            email: env.SEED_ADMIN_EMAIL,
            passwordHash: schoolAdminPasswordHash,
            fullName: 'Quản trị viên trường Demo',
            role: UserRole.SCHOOL_ADMIN,
            schoolId: demoSchool.id,
            status: UserStatus.ACTIVE,
          },
        });
        console.log(
          `Renamed legacy admin ${env.LEGACY_ADMIN_EMAIL} -> ${env.SEED_ADMIN_EMAIL}`,
        );
      }
    }

    const schoolAdmin = await prisma.user.upsert({
      where: { email: env.SEED_ADMIN_EMAIL },
      update: {
        passwordHash: schoolAdminPasswordHash,
        fullName: 'Quản trị viên trường Demo',
        role: UserRole.SCHOOL_ADMIN,
        schoolId: demoSchool.id,
        status: UserStatus.ACTIVE,
      },
      create: {
        email: env.SEED_ADMIN_EMAIL,
        passwordHash: schoolAdminPasswordHash,
        fullName: 'Quản trị viên trường Demo',
        role: UserRole.SCHOOL_ADMIN,
        schoolId: demoSchool.id,
        status: UserStatus.ACTIVE,
      },
    });

    const systemAdmin = await prisma.user.upsert({
      where: { email: env.SEED_SYSTEM_ADMIN_EMAIL },
      update: {
        passwordHash: systemAdminPasswordHash,
        fullName: 'Quản trị viên hệ thống',
        role: UserRole.SYSTEM_ADMIN,
        schoolId: null,
        status: UserStatus.ACTIVE,
      },
      create: {
        email: env.SEED_SYSTEM_ADMIN_EMAIL,
        passwordHash: systemAdminPasswordHash,
        fullName: 'Quản trị viên hệ thống',
        role: UserRole.SYSTEM_ADMIN,
        schoolId: null,
        status: UserStatus.ACTIVE,
      },
    });

    // Dọn trường ảo legacy nếu còn sót sau migration.
    const platformSchool = await prisma.school.findUnique({
      where: { code: 'platform' },
    });
    if (platformSchool) {
      await prisma.user.updateMany({
        where: { schoolId: platformSchool.id },
        data: { schoolId: null },
      });
      await prisma.school.delete({ where: { id: platformSchool.id } });
      console.log('Removed legacy platform school.');
    }

    console.log('Demo admin accounts updated.');
    console.log(`  School admin: ${schoolAdmin.email} (${schoolAdmin.role})`);
    console.log(
      `  System admin: ${systemAdmin.email} (${systemAdmin.role}, schoolId=null)`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
