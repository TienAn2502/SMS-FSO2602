import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  AssessmentStatus,
  AssessmentType,
  Prisma,
  PrismaClient,
  SubjectEvaluationMode,
} from '@prisma/client';
import { config } from 'dotenv';
import ExcelJS from 'exceljs';

config({ path: resolve(__dirname, '../.env.development') });
config({ path: resolve(__dirname, '../.env') });

const COURSE_SECTION_CODE = 'TOAN-10A1';
const SEMESTER_CODE = 'HK2';
const SCHOOL_CODE = 'DEMO';
const SHEET_NAME = 'Diem';
const OUTPUT_FILE = 'scores-import-toan-10a1-hk2.xlsx';

const GRADEBOOK_ENROLLMENT_STATUSES = [
  'ACTIVE',
  'SEMESTER_COMPLETED',
] as const;

type SlotKey = `TX${number}` | 'GK' | 'CK';

function getRegularAssessmentQuota(
  periodsPerYear: number | null | undefined,
  evaluationMode: SubjectEvaluationMode,
): number | null {
  if (evaluationMode === 'PASS_FAIL') return 2;
  if (periodsPerYear == null) return null;
  if (periodsPerYear <= 35) return 2;
  if (periodsPerYear <= 70) return 3;
  return 4;
}

function clampScore(value: number): number {
  const clamped = Math.max(4, Math.min(9.5, value));
  return Math.round(clamped * 2) / 2;
}

function pickScore(studentIndex: number, slotIndex: number): string {
  const tier = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9][studentIndex % 10] ?? 7;
  const noise = ((studentIndex * 3 + slotIndex * 5) % 7 - 3) * 0.15;
  return String(clampScore(tier + noise));
}

function offsetDate(base: Date, days: number): Date {
  const result = new Date(base);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function byDateThenName(
  a: { assessmentDate: Date; name: string },
  b: { assessmentDate: Date; name: string },
): number {
  return (
    a.assessmentDate.getTime() - b.assessmentDate.getTime() ||
    a.name.localeCompare(b.name, 'vi')
  );
}

/** Map đầu điểm → cột giống sổ điểm UI: TX1…TXn, GK, CK */
function buildSlotMappings(
  assessments: Array<{
    id: string;
    name: string;
    type: AssessmentType;
    assessmentDate: Date;
  }>,
): Array<{ slotKey: SlotKey; assessmentId: string; name: string }> {
  const regular = assessments
    .filter((row) => row.type === AssessmentType.REGULAR)
    .sort(byDateThenName);
  const midterm = assessments
    .filter((row) => row.type === AssessmentType.MIDTERM)
    .sort(byDateThenName);
  const finals = assessments
    .filter((row) => row.type === AssessmentType.FINAL)
    .sort(byDateThenName);

  const mappings: Array<{
    slotKey: SlotKey;
    assessmentId: string;
    name: string;
  }> = [];

  regular.forEach((assessment, index) => {
    mappings.push({
      slotKey: `TX${index + 1}`,
      assessmentId: assessment.id,
      name: assessment.name,
    });
  });

  if (midterm[0]) {
    mappings.push({
      slotKey: 'GK',
      assessmentId: midterm[0].id,
      name: midterm[0].name,
    });
  }

  if (finals[0]) {
    mappings.push({
      slotKey: 'CK',
      assessmentId: finals[0].id,
      name: finals[0].name,
    });
  }

  return mappings;
}

async function ensureOpenAssessments(
  prisma: PrismaClient,
  params: {
    schoolId: string;
    semesterId: string;
    courseSectionId: string;
    teacherId: string;
    evaluationMode: SubjectEvaluationMode;
    periodsPerYear: number | null;
    semesterStart: Date;
    semesterEnd: Date;
  },
): Promise<
  Array<{
    id: string;
    name: string;
    type: AssessmentType;
    assessmentDate: Date;
  }>
> {
  const existing = await prisma.assessment.findMany({
    where: {
      schoolId: params.schoolId,
      courseSectionId: params.courseSectionId,
    },
    select: {
      id: true,
      name: true,
      type: true,
      assessmentDate: true,
    },
    orderBy: { assessmentDate: 'asc' },
  });

  if (existing.length > 0) {
    await prisma.assessment.updateMany({
      where: {
        schoolId: params.schoolId,
        courseSectionId: params.courseSectionId,
        status: AssessmentStatus.CLOSED,
      },
      data: { status: AssessmentStatus.OPEN },
    });
    return existing;
  }

  const txQuota = getRegularAssessmentQuota(
    params.periodsPerYear,
    params.evaluationMode,
  );
  if (txQuota == null) {
    throw new Error('Missing periodsPerYear for TOAN-10A1');
  }

  const spanDays = Math.max(
    1,
    Math.floor(
      (params.semesterEnd.getTime() - params.semesterStart.getTime()) /
        (24 * 60 * 60 * 1000),
    ),
  );
  const mid = offsetDate(params.semesterStart, Math.floor(spanDays / 2));
  const txSpacing = txQuota > 1 ? Math.floor(spanDays / txQuota) : 0;

  const plans: Array<{
    type: AssessmentType;
    name: string;
    assessmentDate: Date;
  }> = [];

  for (let i = 0; i < txQuota; i += 1) {
    plans.push({
      type: AssessmentType.REGULAR,
      name: `Điểm TX ${i + 1}`,
      assessmentDate: offsetDate(params.semesterStart, i * txSpacing),
    });
  }

  if (params.evaluationMode === SubjectEvaluationMode.NUMERIC) {
    plans.push(
      {
        type: AssessmentType.MIDTERM,
        name: 'Kiểm tra giữa kỳ',
        assessmentDate: mid,
      },
      {
        type: AssessmentType.FINAL,
        name: 'Kiểm tra cuối kỳ',
        assessmentDate: offsetDate(params.semesterEnd, -7),
      },
    );
  }

  const created: Array<{
    id: string;
    name: string;
    type: AssessmentType;
    assessmentDate: Date;
  }> = [];
  for (const plan of plans) {
    const assessment = await prisma.assessment.create({
      data: {
        schoolId: params.schoolId,
        semesterId: params.semesterId,
        courseSectionId: params.courseSectionId,
        teacherId: params.teacherId,
        type: plan.type,
        name: plan.name,
        assessmentDate: plan.assessmentDate,
        maxScore: new Prisma.Decimal(10),
        status: AssessmentStatus.OPEN,
        note: null,
      },
      select: {
        id: true,
        name: true,
        type: true,
        assessmentDate: true,
      },
    });
    created.push(assessment);
  }

  return created;
}

async function buildMatrixWorkbookBuffer(params: {
  courseSectionCode: string;
  courseSectionName: string;
  subjectName: string;
  homeroomCode: string;
  yearName: string;
  semesterName: string;
  slotKeys: SlotKey[];
  slotLabels: string;
  rows: Array<{
    ma_hs: string;
    ho_ten: string;
    scores: Record<string, string>;
  }>;
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(SHEET_NAME);

  sheet.getCell('A1').value = 'MẪU IMPORT ĐIỂM';
  sheet.mergeCells('A1:D1');
  sheet.getRow(1).font = { bold: true, size: 14 };

  const meta: Array<[string, string]> = [
    ['Lớp môn', `${params.courseSectionCode} — ${params.courseSectionName}`],
    ['Môn học', params.subjectName],
    ['Lớp HC', params.homeroomCode],
    ['Năm học', params.yearName],
    ['Học kỳ', params.semesterName],
    ['Đầu điểm', params.slotLabels],
  ];

  meta.forEach(([label, value], index) => {
    const row = 2 + index;
    sheet.getCell(`A${row}`).value = label;
    sheet.getCell(`B${row}`).value = value;
  });

  const headerRow = 2 + meta.length + 1;
  const headers = ['ma_hs', 'ho_ten', ...params.slotKeys];
  headers.forEach((header, index) => {
    const cell = sheet.getRow(headerRow).getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true };
  });

  params.rows.forEach((row, index) => {
    const excelRow = sheet.getRow(headerRow + 1 + index);
    excelRow.getCell(1).value = row.ma_hs;
    excelRow.getCell(2).value = row.ho_ten;
    params.slotKeys.forEach((slotKey, slotIndex) => {
      excelRow.getCell(3 + slotIndex).value = row.scores[slotKey] ?? '';
    });
  });

  sheet.getColumn(1).width = 16;
  sheet.getColumn(2).width = 28;
  params.slotKeys.forEach((_, index) => {
    sheet.getColumn(3 + index).width = 8;
  });

  const guide = workbook.addWorksheet('Huong_dan');
  [
    'Hướng dẫn import điểm',
    '',
    'File dạng bảng sổ điểm: ma_hs | ho_ten | TX1 | TX2 | … | GK | CK',
    'Cột TX/GK/CK khớp cột trên UI sổ điểm lớp môn.',
    '',
    'Import vào lớp môn TOAN-10A1, chọn «Tất cả (bảng TX / Giữa kỳ / Cuối kỳ)»',
    'Không cần chọn từng đầu điểm.',
    'Sổ điểm phải đang OPEN (chưa khóa).',
  ].forEach((line, index) => {
    guide.getCell(`A${index + 1}`).value = line;
  });
  guide.getColumn(1).width = 80;

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

async function removeLegacyPerAssessmentFiles(
  outputDir: string,
): Promise<void> {
  const { readdir } = await import('node:fs/promises');
  const files = await readdir(outputDir);
  for (const file of files) {
    if (
      file.startsWith('scores-import-toan-10a1-hk2-') &&
      file.endsWith('.xlsx')
    ) {
      await unlink(resolve(outputDir, file));
      console.log(`Removed legacy: ${file}`);
    }
  }
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    const school = await prisma.school.findUniqueOrThrow({
      where: { code: SCHOOL_CODE },
    });

    const semester = await prisma.semester.findFirstOrThrow({
      where: {
        schoolId: school.id,
        code: SEMESTER_CODE,
        academicYear: { isCurrent: true },
      },
      include: { academicYear: { select: { name: true } } },
    });

    const courseSection = await prisma.courseSection.findFirstOrThrow({
      where: {
        schoolId: school.id,
        semesterId: semester.id,
        code: COURSE_SECTION_CODE,
      },
      include: {
        homeroomClass: { select: { id: true, code: true } },
        gradeLevelSubject: {
          select: {
            periodsPerYear: true,
            evaluationMode: true,
            subject: { select: { name: true } },
          },
        },
        teachingAssignments: {
          where: { status: 'ACTIVE' },
          take: 1,
          select: { teacherId: true },
        },
      },
    });

    const teacherId = courseSection.teachingAssignments[0]?.teacherId;
    if (!teacherId) {
      throw new Error(`No teaching assignment for ${COURSE_SECTION_CODE}`);
    }
    if (!courseSection.homeroomClassId || !courseSection.homeroomClass) {
      throw new Error(`${COURSE_SECTION_CODE} missing homeroom class`);
    }

    console.log('Ensuring OPEN assessments...');
    const assessments = await ensureOpenAssessments(prisma, {
      schoolId: school.id,
      semesterId: semester.id,
      courseSectionId: courseSection.id,
      teacherId,
      evaluationMode: courseSection.gradeLevelSubject.evaluationMode,
      periodsPerYear: courseSection.gradeLevelSubject.periodsPerYear,
      semesterStart: semester.startDate,
      semesterEnd: semester.endDate,
    });

    const slots = buildSlotMappings(assessments);
    if (slots.length === 0) {
      throw new Error('No TX/GK/CK slots for TOAN-10A1');
    }

    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        schoolId: school.id,
        semesterId: semester.id,
        homeroomClassId: courseSection.homeroomClassId,
        status: { in: [...GRADEBOOK_ENROLLMENT_STATUSES] },
      },
      orderBy: { student: { fullName: 'asc' } },
      select: {
        student: { select: { fullName: true, externalCode: true } },
      },
    });

    if (enrollments.length === 0) {
      throw new Error('No students enrolled in 10A1 for HK2');
    }

    const rows = enrollments.map((enrollment, studentIndex) => ({
      ma_hs: enrollment.student.externalCode ?? '',
      ho_ten: enrollment.student.fullName,
      scores: Object.fromEntries(
        slots.map((slot, slotIndex) => [
          slot.slotKey,
          pickScore(studentIndex, slotIndex),
        ]),
      ),
    }));

    const buffer = await buildMatrixWorkbookBuffer({
      courseSectionCode: courseSection.code,
      courseSectionName: courseSection.name,
      subjectName: courseSection.gradeLevelSubject.subject.name,
      homeroomCode: courseSection.homeroomClass.code,
      yearName: semester.academicYear.name,
      semesterName: semester.name,
      slotKeys: slots.map((slot) => slot.slotKey),
      slotLabels: slots
        .map((slot) => `${slot.slotKey} (${slot.name})`)
        .join(', '),
      rows,
    });

    const outputDir = resolve(__dirname, '../../docs/samples');
    await mkdir(outputDir, { recursive: true });
    await removeLegacyPerAssessmentFiles(outputDir);

    const outputPath = resolve(outputDir, OUTPUT_FILE);
    await writeFile(outputPath, buffer);

    console.log(
      `Created: ${outputPath} (${rows.length} HS × ${slots.map((s) => s.slotKey).join('|')})`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
