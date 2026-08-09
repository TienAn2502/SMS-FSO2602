import {
  buildHomeroomFinalizeReadiness,
  buildSemesterFinalizeReadiness,
} from '@/modules/grade-summaries/semester-finalization.util';

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

  describe('buildSemesterFinalizeReadiness', () => {
    it('is ready when at least one homeroom has draft summaries to close', () => {
      const result = buildSemesterFinalizeReadiness({
        semesterId: 'sem-1',
        semesterName: 'Học kỳ 1',
        semesterCode: 'HK1',
        homerooms: [
          buildHomeroomFinalizeReadiness({
            homeroomClassId: 'hr-1',
            homeroomClassCode: '10A1',
            activeStudentCount: 30,
            conductRecordCount: 30,
            semesterSummaryCount: 30,
            draftSummaryCount: 30,
            closedSummaryCount: 0,
            openGradebookSections: [],
            notStartedGradebookSections: [],
          }),
          buildHomeroomFinalizeReadiness({
            homeroomClassId: 'hr-2',
            homeroomClassCode: '10A2',
            activeStudentCount: 0,
            conductRecordCount: 0,
            semesterSummaryCount: 0,
            draftSummaryCount: 0,
            closedSummaryCount: 0,
            openGradebookSections: [],
            notStartedGradebookSections: [],
          }),
        ],
      });

      expect(result.ready).toBe(true);
      expect(result.alreadyClosed).toBe(false);
      expect(result.readyHomeroomClasses).toBe(2);
    });

    it('is not ready when every homeroom is already closed', () => {
      const closedHomeroom = buildHomeroomFinalizeReadiness({
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

      const result = buildSemesterFinalizeReadiness({
        semesterId: 'sem-1',
        semesterName: 'Học kỳ 2',
        semesterCode: 'HK2',
        homerooms: [closedHomeroom],
      });

      expect(result.ready).toBe(false);
      expect(result.alreadyClosed).toBe(true);
    });
  });
});
