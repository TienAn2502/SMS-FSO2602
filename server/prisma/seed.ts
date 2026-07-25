import {
  AcademicEntityStatus,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { resolve } from 'node:path';
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

const DEMO_GRADE_LEVELS = [
  { code: '10', name: 'Khối 10' },
  { code: '11', name: 'Khối 11' },
  { code: '12', name: 'Khối 12' },
] as const;

const DEMO_SUBJECTS = [
  { code: 'TOAN', name: 'Toán học' },
  { code: 'VAN', name: 'Ngữ văn' },
  { code: 'ANH', name: 'Tiếng Anh' },
] as const;

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

async function seedAcademicStructure(schoolId: string, homeroomTeacherId: string) {
  const academicYear = await prisma.academicYear.upsert({
    where: {
      schoolId_code: {
        schoolId,
        code: '2025-26',
      },
    },
    update: {
      name: '2025-2026',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-05-31'),
      isCurrent: true,
      status: AcademicEntityStatus.ACTIVE,
    },
    create: {
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

  for (const semester of [
    {
      code: 'HK1',
      name: 'Học kỳ 1',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2025-12-31'),
      isCurrent: true,
    },
    {
      code: 'HK2',
      name: 'Học kỳ 2',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-05-31'),
      isCurrent: false,
    },
  ]) {
    await prisma.semester.upsert({
      where: {
        academicYearId_code: {
          academicYearId: academicYear.id,
          code: semester.code,
        },
      },
      update: {
        name: semester.name,
        startDate: semester.startDate,
        endDate: semester.endDate,
        schoolId,
        status: AcademicEntityStatus.ACTIVE,
        isCurrent: semester.isCurrent,
      },
      create: {
        schoolId,
        academicYearId: academicYear.id,
        code: semester.code,
        name: semester.name,
        startDate: semester.startDate,
        endDate: semester.endDate,
        status: AcademicEntityStatus.ACTIVE,
        isCurrent: semester.isCurrent,
      },
    });
  }

  await prisma.semester.updateMany({
    where: { schoolId },
    data: { isCurrent: false },
  });

  await prisma.semester.updateMany({
    where: { schoolId, academicYearId: academicYear.id, code: 'HK1' },
    data: { isCurrent: true },
  });

  const gradeLevels = new Map<string, string>();
  for (const grade of DEMO_GRADE_LEVELS) {
    const record = await prisma.gradeLevel.upsert({
      where: {
        schoolId_code: {
          schoolId,
          code: grade.code,
        },
      },
      update: { name: grade.name },
      create: {
        schoolId,
        code: grade.code,
        name: grade.name,
      },
    });
    gradeLevels.set(grade.code, record.id);
  }

  const subjects = new Map<string, string>();
  for (const subject of DEMO_SUBJECTS) {
    const record = await prisma.subject.upsert({
      where: {
        schoolId_code: {
          schoolId,
          code: subject.code,
        },
      },
      update: {
        name: subject.name,
        status: AcademicEntityStatus.ACTIVE,
      },
      create: {
        schoolId,
        code: subject.code,
        name: subject.name,
        status: AcademicEntityStatus.ACTIVE,
      },
    });
    subjects.set(subject.code, record.id);
  }

  const gradeLevelSubjects = new Map<string, string>();
  const grade10Id = gradeLevels.get('10');
  if (!grade10Id) {
    throw new Error('Missing grade level 10 for seed');
  }

  for (const subject of DEMO_SUBJECTS) {
    const subjectId = subjects.get(subject.code);
    if (!subjectId) {
      throw new Error(`Missing subject ${subject.code} for seed`);
    }

    const record = await prisma.gradeLevelSubject.upsert({
      where: {
        schoolId_gradeLevelId_subjectId: {
          schoolId,
          gradeLevelId: grade10Id,
          subjectId,
        },
      },
      update: {
        isRequired: true,
        status: AcademicEntityStatus.ACTIVE,
      },
      create: {
        schoolId,
        gradeLevelId: grade10Id,
        subjectId,
        isRequired: true,
        status: AcademicEntityStatus.ACTIVE,
      },
    });
    gradeLevelSubjects.set(subject.code, record.id);
  }

  const homeroomClass = await prisma.homeroomClass.upsert({
    where: {
      schoolId_academicYearId_code: {
        schoolId,
        academicYearId: academicYear.id,
        code: '10A1',
      },
    },
    update: {
      name: '10A1',
      gradeLevelId: grade10Id,
      capacity: 45,
      homeroomTeacherId,
      status: AcademicEntityStatus.ACTIVE,
    },
    create: {
      schoolId,
      academicYearId: academicYear.id,
      gradeLevelId: grade10Id,
      name: '10A1',
      code: '10A1',
      capacity: 45,
      homeroomTeacherId,
      status: AcademicEntityStatus.ACTIVE,
    },
  });

  for (const subject of DEMO_SUBJECTS) {
    const gradeLevelSubjectId = gradeLevelSubjects.get(subject.code);
    if (!gradeLevelSubjectId) {
      throw new Error(`Missing grade level subject ${subject.code} for seed`);
    }

    const code = `${subject.code}-10A1`;
    const name = `${subject.name} 10A1`;

    await prisma.courseSection.upsert({
      where: {
        schoolId_academicYearId_code: {
          schoolId,
          academicYearId: academicYear.id,
          code,
        },
      },
      update: {
        name,
        homeroomClassId: homeroomClass.id,
        gradeLevelSubjectId,
        status: AcademicEntityStatus.ACTIVE,
      },
      create: {
        schoolId,
        academicYearId: academicYear.id,
        homeroomClassId: homeroomClass.id,
        gradeLevelSubjectId,
        name,
        code,
        status: AcademicEntityStatus.ACTIVE,
      },
    });
  }

  return {
    academicYear,
    homeroomClass,
    gradeLevelCount: gradeLevels.size,
    subjectCount: subjects.size,
    courseSectionCount: DEMO_SUBJECTS.length,
  };
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

  let firstTeacherId: string | null = null;
  for (const teacher of DEMO_TEACHERS) {
    const record = await upsertUser({
      ...teacher,
      passwordHash: demoPasswordHash,
      schoolId: school.id,
      role: UserRole.TEACHER,
    });
    firstTeacherId ??= record.id;
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

  if (!firstTeacherId) {
    throw new Error('No demo teacher available for homeroom class seed');
  }

  console.log('Seeding Sprint 2 academic structure...');
  const academic = await seedAcademicStructure(school.id, firstTeacherId);

  console.log('Seed completed.');
  console.log(`  School: ${school.name} (${school.code})`);
  console.log(`  Admin: ${admin.email} (${admin.role})`);
  console.log(`  Teachers: ${DEMO_TEACHERS.length} accounts (password: ${env.SEED_DEMO_PASSWORD})`);
  console.log(`  Students: ${DEMO_STUDENTS.length} accounts (password: ${env.SEED_DEMO_PASSWORD})`);
  console.log(`  Academic year: ${academic.academicYear.name} (is_current)`);
  console.log(`  Grade levels: ${academic.gradeLevelCount}`);
  console.log(`  Subjects: ${academic.subjectCount}`);
  console.log(`  Homeroom class: ${academic.homeroomClass.code}`);
  console.log(`  Course sections: ${academic.courseSectionCount}`);
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
