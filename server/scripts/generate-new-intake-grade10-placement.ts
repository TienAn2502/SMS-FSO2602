import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  AcademicEntityStatus,
  Gender,
  PrismaClient,
} from '@prisma/client';
import { config } from 'dotenv';

import { WorkbookBuilder } from '@/common/files/workbook-builder.util';
import { toIsoDateString } from '@/common/schemas/academic.schema';
import {
  buildClassPlacementImportInstructionLines,
  CLASS_PLACEMENT_IMPORT_COLUMNS,
} from '@/modules/imports/constants/class-placement-import.constants';
import { suggestClassPlacementSheets } from '@/modules/imports/utils/suggest-class-placement-sheets.util';
import {
  buildHomeroomClassCode,
  CLASSES_PER_GRADE,
  STUDENTS_PER_CLASS,
} from '../prisma/seed-data/thpt-curriculum';
import { generateStudentProfile } from '../prisma/seed-data/vietnamese-names';

config({ path: resolve(__dirname, '../.env.development') });
config({ path: resolve(__dirname, '../.env') });

const SCHOOL_CODE = 'DEMO';
const GRADE_CODE = '10';
const SEMESTER_CODE = 'HK1';
const OUTPUT_FILE = 'class-placement-hs-moi-len-lop-10.xlsx';
/** HS mới vào lớp 10 năm học 2026–2027 → sinh ~2011 */
const NEW_INTAKE_BIRTH_YEAR = 2011;
const SYNTHETIC_GLOBAL_INDEX_OFFSET = 10_000;

function formatGender(gender: Gender | string | null | undefined): string {
  if (gender === Gender.MALE || gender === 'MALE') {
    return 'Nam';
  }
  if (gender === Gender.FEMALE || gender === 'FEMALE') {
    return 'Nữ';
  }
  if (gender === Gender.OTHER || gender === 'OTHER') {
    return 'Khác';
  }
  return '';
}

function buildSyntheticSheets(): Map<string, Record<string, string>[]> {
  const sheetRows = new Map<string, Record<string, string>[]>();

  for (let classIndex = 0; classIndex < CLASSES_PER_GRADE; classIndex += 1) {
    const sheetName = buildHomeroomClassCode(GRADE_CODE, classIndex);
    const rows: Record<string, string>[] = [];

    for (let seat = 0; seat < STUDENTS_PER_CLASS; seat += 1) {
      const globalIndex =
        SYNTHETIC_GLOBAL_INDEX_OFFSET + classIndex * STUDENTS_PER_CLASS + seat;
      const profile = generateStudentProfile(globalIndex, NEW_INTAKE_BIRTH_YEAR);

      rows.push({
        ho_ten: profile.fullName,
        ngay_sinh: toIsoDateString(profile.dateOfBirth),
        gioi_tinh: formatGender(profile.gender),
        email:
          seat % 4 === 0
            ? `tuyen10.${String(classIndex + 1).padStart(2, '0')}${String(seat + 1).padStart(2, '0')}@demo.edu.vn`
            : '',
        mat_khau: seat % 5 === 0 ? 'Demo@123456' : '',
        external_code: '',
      });
    }

    sheetRows.set(sheetName, rows);
  }

  return sheetRows;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const builder = new WorkbookBuilder();

  let included = 0;
  let newIntakeCount = 0;
  let usedStaticFallback = true;
  let academicYearName = '2026–2027 (mẫu)';
  let semesterLabel = 'HK1 — Học kỳ I';

  try {
    const school = await prisma.school.findUnique({
      where: { code: SCHOOL_CODE },
    });

    if (school) {
      const semester = await prisma.semester.findFirst({
        where: {
          schoolId: school.id,
          code: SEMESTER_CODE,
          academicYear: { isCurrent: true },
        },
        include: { academicYear: { select: { id: true, name: true } } },
      });

      if (semester) {
        academicYearName = semester.academicYear.name;
        semesterLabel = `${semester.code} — ${semester.name}`;

        const enrolledStudentRows = await prisma.studentEnrollment.findMany({
          where: {
            schoolId: school.id,
            semesterId: semester.id,
            status: { in: ['ACTIVE', 'SEMESTER_COMPLETED'] },
          },
          select: { studentId: true },
          distinct: ['studentId'],
        });
        const enrolledIds = new Set(
          enrolledStudentRows.map((row) => row.studentId),
        );

        const gradeLevel = await prisma.gradeLevel.findFirst({
          where: { schoolId: school.id, code: GRADE_CODE },
          select: { id: true, code: true },
        });

        const entryClasses = gradeLevel
          ? await prisma.homeroomClass.findMany({
              where: {
                schoolId: school.id,
                academicYearId: semester.academicYearId,
                gradeLevelId: gradeLevel.id,
                status: AcademicEntityStatus.ACTIVE,
              },
              select: { code: true },
              orderBy: { code: 'asc' },
            })
          : [];

        const retainedSummaries = await prisma.studentYearSummary.findMany({
          where: {
            schoolId: school.id,
            status: 'CLOSED',
            promotionDecision: 'RETAINED',
            academicYearId: { not: semester.academicYearId },
          },
          select: { studentId: true },
        });
        const retainedIds = new Set(
          retainedSummaries.map((row) => row.studentId),
        );

        const candidates = await prisma.student.findMany({
          where: {
            schoolId: school.id,
            status: AcademicEntityStatus.ACTIVE,
            id: { notIn: [...enrolledIds] },
          },
          select: {
            id: true,
            fullName: true,
            dateOfBirth: true,
            gender: true,
            externalCode: true,
            user: { select: { email: true } },
          },
          orderBy: { fullName: 'asc' },
        });

        const newIntakePool = candidates
          .filter((row) => !retainedIds.has(row.id))
          .map((row) => ({
            studentId: row.id,
            reason: 'NEW_INTAKE' as const,
            previousHomeroomClassCode: null,
            previousGradeLevelId: null,
          }));

        const sheetMap = suggestClassPlacementSheets(newIntakePool, {
          entryGradeCode: gradeLevel?.code ?? GRADE_CODE,
          entryClassCodes: entryClasses.map((row) => row.code),
        });

        const studentById = new Map(
          candidates.map((row) => [row.id, row] as const),
        );

        for (const [sheetName, ids] of [...sheetMap.entries()].sort(([a], [b]) =>
          a.localeCompare(b, 'vi'),
        )) {
          const rows: Record<string, string>[] = [];

          for (const studentId of ids) {
            const student = studentById.get(studentId);
            if (!student?.dateOfBirth) {
              continue;
            }

            rows.push({
              ho_ten: student.fullName,
              ngay_sinh: toIsoDateString(student.dateOfBirth),
              gioi_tinh: formatGender(student.gender),
              email: student.user?.email ?? '',
              mat_khau: '',
              external_code: student.externalCode ?? '',
            });
            included += 1;
            newIntakeCount += 1;
          }

          if (rows.length > 0) {
            builder.addSheetFromRows(
              sheetName.slice(0, 31),
              CLASS_PLACEMENT_IMPORT_COLUMNS,
              rows,
            );
          }
        }

        if (included > 0) {
          usedStaticFallback = false;
        }
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  if (usedStaticFallback) {
    const syntheticSheets = buildSyntheticSheets();
    included = 0;
    newIntakeCount = 0;

    for (const [sheetName, rows] of [...syntheticSheets.entries()].sort(
      ([a], [b]) => a.localeCompare(b, 'vi'),
    )) {
      builder.addSheetFromRows(
        sheetName,
        CLASS_PLACEMENT_IMPORT_COLUMNS,
        rows,
      );
      included += rows.length;
      newIntakeCount += rows.length;
    }
  }

  builder.addInstructionSheet(
    'Huong_dan',
    buildClassPlacementImportInstructionLines({
      academicYearName,
      semesterLabel,
      included,
      retainedCount: 0,
      newIntakeCount,
      skippedNoDob: 0,
      skippedNoKey: 0,
      usedStaticFallback,
    }),
  );

  const outputDir = resolve(__dirname, '../../docs/samples');
  await mkdir(outputDir, { recursive: true });
  const outputPath = resolve(outputDir, OUTPUT_FILE);
  await writeFile(outputPath, await builder.toBuffer());

  console.log(
    `Created: ${outputPath} (${included} HS mới lên lớp 10${usedStaticFallback ? ', dữ liệu mẫu' : ', từ DB'})`,
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
