import { AssessmentType } from '@prisma/client';

export type ScoreImportSlotKey = `TX${number}` | 'GK' | 'CK';

export interface AssessmentSlotMapping {
  slotKey: ScoreImportSlotKey;
  assessmentId: string;
  assessmentName: string;
  type: AssessmentType;
  maxScore: number;
  status: string;
}

type AssessmentForSlot = {
  id: string;
  name: string;
  type: AssessmentType;
  assessmentDate: Date;
  maxScore: { toNumber(): number } | number;
  status: string;
};

function byDateThenName(a: AssessmentForSlot, b: AssessmentForSlot): number {
  return (
    a.assessmentDate.getTime() - b.assessmentDate.getTime() ||
    a.name.localeCompare(b.name, 'vi')
  );
}

/** Map đầu điểm → cột giống sổ điểm UI: TX1…TXn, GK, CK */
export function buildAssessmentSlotMappings(
  assessments: AssessmentForSlot[],
): AssessmentSlotMapping[] {
  const regular = assessments
    .filter((row) => row.type === AssessmentType.REGULAR)
    .sort(byDateThenName);
  const midterm = assessments
    .filter((row) => row.type === AssessmentType.MIDTERM)
    .sort(byDateThenName);
  const finals = assessments
    .filter((row) => row.type === AssessmentType.FINAL)
    .sort(byDateThenName);

  const mappings: AssessmentSlotMapping[] = [];

  regular.forEach((assessment, index) => {
    mappings.push({
      slotKey: `TX${index + 1}`,
      assessmentId: assessment.id,
      assessmentName: assessment.name,
      type: assessment.type,
      maxScore:
        typeof assessment.maxScore === 'number'
          ? assessment.maxScore
          : assessment.maxScore.toNumber(),
      status: assessment.status,
    });
  });

  if (midterm[0]) {
    mappings.push({
      slotKey: 'GK',
      assessmentId: midterm[0].id,
      assessmentName: midterm[0].name,
      type: midterm[0].type,
      maxScore:
        typeof midterm[0].maxScore === 'number'
          ? midterm[0].maxScore
          : midterm[0].maxScore.toNumber(),
      status: midterm[0].status,
    });
  }

  if (finals[0]) {
    mappings.push({
      slotKey: 'CK',
      assessmentId: finals[0].id,
      assessmentName: finals[0].name,
      type: finals[0].type,
      maxScore:
        typeof finals[0].maxScore === 'number'
          ? finals[0].maxScore
          : finals[0].maxScore.toNumber(),
      status: finals[0].status,
    });
  }

  return mappings;
}

export function isScoreImportMatrixHeaders(headers: string[]): boolean {
  const normalized = headers.map((header) => header.trim().toUpperCase());
  return normalized.some(
    (header) => header === 'GK' || header === 'CK' || /^TX\d+$/.test(header),
  );
}

export function scoreSlotHeaderLabel(slotKey: ScoreImportSlotKey): string {
  if (slotKey === 'GK') return 'Giữa kỳ';
  if (slotKey === 'CK') return 'Cuối kỳ';
  const match = slotKey.match(/^TX(\d+)$/);
  if (match) return `TX ${match[1]}`;
  return slotKey;
}
