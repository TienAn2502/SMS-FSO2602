import { SummaryStatus } from '@prisma/client';

import {
  buildYearRecomputeIndexes,
  computeDraftYearSummaryForStudent,
  type YearRecomputeContext,
} from '@/modules/grade-summaries/year-summary-recompute.util';

describe('year-summary-recompute.util', () => {
  const context: YearRecomputeContext = {
    homeroomClassId: 'homeroom-1',
    isGraduatingGrade: true,
    studentIds: ['student-1'],
    semesterIds: ['hk1-id', 'hk2-id'],
    hk1: { id: 'hk1-id', code: 'HK1' },
    hk2: { id: 'hk2-id', code: 'HK2' },
  };

  it('skips students with CLOSED year summary', () => {
    const indexes = buildYearRecomputeIndexes({
      semesterSummaries: [],
      conductRecords: [],
      absenceGroups: [],
      numericSubjectResults: [],
      passFailSubjectResults: [],
      existingYearSummaries: [
        { studentId: 'student-1', status: SummaryStatus.CLOSED },
      ],
    });

    expect(
      computeDraftYearSummaryForStudent({
        studentId: 'student-1',
        context,
        indexes,
      }),
    ).toBeNull();
  });

  it('returns PENDING when year data is incomplete', () => {
    const indexes = buildYearRecomputeIndexes({
      semesterSummaries: [
        {
          studentId: 'student-1',
          overallAverage: { toNumber: () => 7 },
          academicResultLevel: 'FAIR',
          trainingResultLevel: 'GOOD',
          status: SummaryStatus.DRAFT,
          semester: { code: 'HK1' },
        },
      ],
      conductRecords: [],
      absenceGroups: [],
      numericSubjectResults: [],
      passFailSubjectResults: [],
      existingYearSummaries: [],
    });

    expect(
      computeDraftYearSummaryForStudent({
        studentId: 'student-1',
        context,
        indexes,
      })?.promotionDecision,
    ).toBe('PENDING');
  });

  it('returns GRADUATED for final grade when year data is complete', () => {
    const indexes = buildYearRecomputeIndexes({
      semesterSummaries: [
        {
          studentId: 'student-1',
          overallAverage: { toNumber: () => 7 },
          academicResultLevel: 'FAIR',
          trainingResultLevel: 'GOOD',
          status: SummaryStatus.CLOSED,
          semester: { code: 'HK1' },
        },
        {
          studentId: 'student-1',
          overallAverage: { toNumber: () => 8 },
          academicResultLevel: 'GOOD',
          trainingResultLevel: 'GOOD',
          status: SummaryStatus.CLOSED,
          semester: { code: 'HK2' },
        },
      ],
      conductRecords: [
        {
          studentId: 'student-1',
          semesterId: 'hk1-id',
          trainingResultLevel: 'GOOD',
          status: SummaryStatus.CLOSED,
        },
        {
          studentId: 'student-1',
          semesterId: 'hk2-id',
          trainingResultLevel: 'GOOD',
          status: SummaryStatus.CLOSED,
        },
      ],
      absenceGroups: [],
      numericSubjectResults: [
        { studentId: 'student-1', yearAverage: { toNumber: () => 7.5 } },
        { studentId: 'student-1', yearAverage: { toNumber: () => 7.8 } },
        { studentId: 'student-1', yearAverage: { toNumber: () => 8.0 } },
        { studentId: 'student-1', yearAverage: { toNumber: () => 8.1 } },
        { studentId: 'student-1', yearAverage: { toNumber: () => 8.2 } },
        { studentId: 'student-1', yearAverage: { toNumber: () => 8.3 } },
        { studentId: 'student-1', yearAverage: { toNumber: () => 7.0 } },
        { studentId: 'student-1', yearAverage: { toNumber: () => 7.5 } },
        { studentId: 'student-1', yearAverage: { toNumber: () => 6.8 } },
        { studentId: 'student-1', yearAverage: { toNumber: () => 6.6 } },
      ],
      passFailSubjectResults: [],
      existingYearSummaries: [],
    });

    expect(
      computeDraftYearSummaryForStudent({
        studentId: 'student-1',
        context,
        indexes,
      })?.promotionDecision,
    ).toBe('GRADUATED');
  });
});
