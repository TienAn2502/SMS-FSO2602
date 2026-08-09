import { AssessmentStatus, SummaryStatus } from '@prisma/client';

import {
  buildSemesterFinalizeReadinessFromContext,
  type SemesterFinalizeReadinessContext,
} from '@/modules/grade-summaries/semester-finalization-readiness.util';
import { buildHomeroomFinalizeReadiness } from '@/modules/grade-summaries/semester-finalization.util';

describe('semester-finalization-readiness.util', () => {
  it('builds readiness from loaded context', () => {
    const context: SemesterFinalizeReadinessContext = {
      semester: { id: 'sem-1', name: 'Học kỳ 1', code: 'HK1' },
      homeroomClasses: [{ id: 'hr-1', code: '10A1' }],
      courseSections: [
        { id: 'cs-1', code: '10A1-TOAN', homeroomClassId: 'hr-1' },
        { id: 'cs-2', code: '10A1-LY', homeroomClassId: 'hr-1' },
      ],
      assessments: [
        { courseSectionId: 'cs-1', status: AssessmentStatus.CLOSED },
        { courseSectionId: 'cs-2', status: AssessmentStatus.OPEN },
      ],
      enrollmentCounts: [{ homeroomClassId: 'hr-1', count: 30 }],
      conductCounts: [{ homeroomClassId: 'hr-1', count: 30 }],
      summaryCounts: [
        { homeroomClassId: 'hr-1', status: SummaryStatus.DRAFT, count: 30 },
      ],
    };

    const result = buildSemesterFinalizeReadinessFromContext(context);

    expect(result.ready).toBe(false);
    expect(result.homeroomIssues).toHaveLength(1);
    expect(result.homeroomIssues[0]?.issues[0]?.code).toBe('OPEN_GRADEBOOKS');
  });

  it('returns empty readiness when no homeroom classes exist', () => {
    const result = buildSemesterFinalizeReadinessFromContext({
      semester: { id: 'sem-1', name: 'Học kỳ 1', code: 'HK1' },
      homeroomClasses: [],
      courseSections: [],
      assessments: [],
      enrollmentCounts: [],
      conductCounts: [],
      summaryCounts: [],
    });

    expect(result.totalHomeroomClasses).toBe(0);
    expect(result.ready).toBe(false);
  });
});

describe('semester-finalization.util', () => {
  describe('buildHomeroomFinalizeReadiness', () => {
    it('marks homeroom ready when gradebooks locked and conduct complete', () => {
      const result = buildHomeroomFinalizeReadiness({
        homeroomClassId: 'hr-1',
        homeroomClassCode: '10A1',
        activeStudentCount: 30,
        conductRecordCount: 30,
        semesterSummaryCount: 30,
        draftSummaryCount: 30,
        closedSummaryCount: 0,
        openGradebookSections: [],
        notStartedGradebookSections: [],
      });

      expect(result.ready).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('reports open gradebooks and missing conduct', () => {
      const result = buildHomeroomFinalizeReadiness({
        homeroomClassId: 'hr-1',
        homeroomClassCode: '10A1',
        activeStudentCount: 30,
        conductRecordCount: 28,
        semesterSummaryCount: 30,
        draftSummaryCount: 30,
        closedSummaryCount: 0,
        openGradebookSections: ['10A1-TOAN'],
        notStartedGradebookSections: ['10A1-LY'],
      });

      expect(result.ready).toBe(false);
      expect(result.issues.map((issue) => issue.code)).toEqual([
        'OPEN_GRADEBOOKS',
        'OPEN_GRADEBOOKS',
        'MISSING_CONDUCT',
      ]);
    });

    it('treats fully closed homeroom as ready but flagged already closed', () => {
      const result = buildHomeroomFinalizeReadiness({
        homeroomClassId: 'hr-1',
        homeroomClassCode: '10A1',
        activeStudentCount: 30,
        conductRecordCount: 30,
        semesterSummaryCount: 30,
        draftSummaryCount: 0,
        closedSummaryCount: 30,
        openGradebookSections: [],
        notStartedGradebookSections: [],
      });

      expect(result.ready).toBe(true);
      expect(result.issues).toEqual([
        expect.objectContaining({ code: 'ALREADY_CLOSED' }),
      ]);
    });
  });
});
