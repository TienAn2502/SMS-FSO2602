import { pickGraduatedStudentIdsFromSummaries } from '@/modules/grade-summaries/graduation-student-inactivation.util';

describe('pickGraduatedStudentIdsFromSummaries', () => {
  it('returns unique student ids with GRADUATED decision only', () => {
    expect(
      pickGraduatedStudentIdsFromSummaries([
        { studentId: 's1', promotionDecision: 'GRADUATED' },
        { studentId: 's2', promotionDecision: 'PROMOTED' },
        { studentId: 's1', promotionDecision: 'GRADUATED' },
      ]),
    ).toEqual(['s1']);
  });

  it('returns empty array when no graduates', () => {
    expect(
      pickGraduatedStudentIdsFromSummaries([
        { studentId: 's1', promotionDecision: 'PROMOTED' },
        { studentId: 's2', promotionDecision: 'RETAINED' },
      ]),
    ).toEqual([]);
  });
});
