import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { z } from 'zod';

config({ path: resolve(__dirname, '../.env.development') });
config({ path: resolve(__dirname, '../.env') });

const seedEnvSchema = z.object({
  SEED_ADMIN_EMAIL: z.string().email(),
  SEED_ADMIN_PASSWORD: z.string().min(8),
  SEED_DEMO_PASSWORD: z.string().min(8).default('Demo@123456'),
  SEED_SCHOOL_CODE: z.string().min(1),
  SEED_SCHOOL_NAME: z.string().min(1),
  SEED_SCHOOL_TYPE: z.enum(['TH', 'THCS', 'THPT', 'OTHER']).default('THPT'),
});

const prisma = new PrismaClient();

interface SeedUserInput {
  email: string;
  fullName: string;
  role: UserRole;
  passwordHash: string;
  schoolId: string;
}

const DEMO_TEACHERS: Array<Pick<SeedUserInput, 'email' | 'fullName'>> = [
  { email: 'teacher1@demo.edu.vn', fullName: 'Nguyễn Văn An' },
  { email: 'teacher2@demo.edu.vn', fullName: 'Trần Thị Bình' },
  { email: 'teacher3@demo.edu.vn', fullName: 'Lê Hoàng Cường' },
];

const DEMO_STUDENTS: Array<Pick<SeedUserInput, 'email' | 'fullName'>> = [
  { email: 'student1@demo.edu.vn', fullName: 'Phạm Minh Đức' },
  { email: 'student2@demo.edu.vn', fullName: 'Hoàng Thị Em' },
  { email: 'student3@demo.edu.vn', fullName: 'Vũ Quốc Huy' },
  { email: 'student4@demo.edu.vn', fullName: 'Đặng Thu Hà' },
  { email: 'student5@demo.edu.vn', fullName: 'Bùi Văn Khoa' },
];

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

  console.log(`Seeding admin user: ${env.SEED_ADMIN_EMAIL}`);
  const adminPasswordHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 12);

  const admin = await upsertUser({
    email: env.SEED_ADMIN_EMAIL,
    passwordHash: adminPasswordHash,
    fullName: 'Quản trị viên Demo',
    schoolId: school.id,
    role: UserRole.SCHOOL_ADMIN,
  });

  console.log('Seeding demo teachers...');
  const demoPasswordHash = await bcrypt.hash(env.SEED_DEMO_PASSWORD, 12);

  for (const teacher of DEMO_TEACHERS) {
    await upsertUser({
      ...teacher,
      passwordHash: demoPasswordHash,
      schoolId: school.id,
      role: UserRole.TEACHER,
    });
  }

  console.log('Seeding demo students...');
  for (const student of DEMO_STUDENTS) {
    await upsertUser({
      ...student,
      passwordHash: demoPasswordHash,
      schoolId: school.id,
      role: UserRole.STUDENT,
    });
  }

  console.log('Seed completed.');
  console.log(`  School: ${school.name} (${school.code})`);
  console.log(`  Admin: ${admin.email} (${admin.role})`);
  console.log(`  Teachers: ${DEMO_TEACHERS.length} accounts (password: ${env.SEED_DEMO_PASSWORD})`);
  console.log(`  Students: ${DEMO_STUDENTS.length} accounts (password: ${env.SEED_DEMO_PASSWORD})`);
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
