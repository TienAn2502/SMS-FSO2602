import { PassFailResult, SubjectEvaluationMode } from '@prisma/client';

import { computeSemesterSummaryFields } from '@/modules/grade-summaries/semester-summary-recompute.util';

describe('computeSemesterSummaryFields', () => {
  it('computes overall average from numeric subjects only', () => {
    const result = computeSemesterSummaryFields(
      [
        {
          evaluationMode: SubjectEvaluationMode.NUMERIC,
          semesterAverage: { toNumber: () => 8 },
          passFailResult: null,
        },
        {
          evaluationMode: SubjectEvaluationMode.NUMERIC,
          semesterAverage: { toNumber: () => 6 },
          passFailResult: null,
        },
        {
          evaluationMode: SubjectEvaluationMode.PASS_FAIL,
          semesterAverage: null,
          passFailResult: PassFailResult.PASS,
        },
      ],
      null,
    );

    expect(result.overallAverage).toBe(7);
    expect(result.subjectCount).toBe(2);
    expect(result.academicResultLevel).not.toBeNull();
  });
});
