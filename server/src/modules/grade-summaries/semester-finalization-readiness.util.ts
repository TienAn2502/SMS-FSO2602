import { AssessmentStatus, SummaryStatus } from '@prisma/client';

import type { SemesterFinalizeReadiness } from '@/modules/grade-summaries/semester-finalization.types';
import {
  buildHomeroomFinalizeReadiness,
  buildSemesterFinalizeReadiness,
} from '@/modules/grade-summaries/semester-finalization.util';

export type SemesterFinalizeReadinessHomeroomRef = {
  id: string;
  code: string;
};

export type SemesterFinalizeReadinessCourseSection = {
  id: string;
  code: string;
  homeroomClassId: string | null;
};

export type SemesterFinalizeReadinessAssessment = {
  courseSectionId: string;
  status: AssessmentStatus;
};

export type SemesterFinalizeReadinessContext = {
  semester: { id: string; name: string; code: string };
  homeroomClasses: SemesterFinalizeReadinessHomeroomRef[];
  courseSections: SemesterFinalizeReadinessCourseSection[];
  assessments: SemesterFinalizeReadinessAssessment[];
  enrollmentCounts: Array<{ homeroomClassId: string; count: number }>;
  conductCounts: Array<{ homeroomClassId: string; count: number }>;
  summaryCounts: Array<{
    homeroomClassId: string;
    status: SummaryStatus;
    count: number;
  }>;
};

export function buildSemesterFinalizeReadinessFromContext(
  context: SemesterFinalizeReadinessContext,
): SemesterFinalizeReadiness {
  const { semester, homeroomClasses } = context;

  if (homeroomClasses.length === 0) {
    return buildSemesterFinalizeReadiness({
      semesterId: semester.id,
      semesterName: semester.name,
      semesterCode: semester.code,
      homerooms: [],
    });
  }

  const assessmentsBySection = buildAssessmentsBySectionMap(
    context.assessments,
  );
  const sectionsByHomeroom = buildSectionsByHomeroomMap(context.courseSections);
  const enrollmentCountMap = new Map(
    context.enrollmentCounts.map((row) => [row.homeroomClassId, row.count]),
  );
  const conductCountMap = new Map(
    context.conductCounts.map((row) => [row.homeroomClassId, row.count]),
  );
  const summaryCountMap = buildSummaryCountMap(context.summaryCounts);

  const homerooms = homeroomClasses.map((homeroom) => {
    const sections = sectionsByHomeroom.get(homeroom.id) ?? [];
    const openGradebookSections: string[] = [];
    const notStartedGradebookSections: string[] = [];

    for (const section of sections) {
      const stats = assessmentsBySection.get(section.id);

      if (!stats || stats.total === 0) {
        notStartedGradebookSections.push(section.code);
        continue;
      }

      if (stats.open > 0) {
        openGradebookSections.push(section.code);
      }
    }

    const summaryStats = summaryCountMap.get(homeroom.id) ?? {
      total: 0,
      draft: 0,
      closed: 0,
    };

    return buildHomeroomFinalizeReadiness({
      homeroomClassId: homeroom.id,
      homeroomClassCode: homeroom.code,
      activeStudentCount: enrollmentCountMap.get(homeroom.id) ?? 0,
      conductRecordCount: conductCountMap.get(homeroom.id) ?? 0,
      semesterSummaryCount: summaryStats.total,
      draftSummaryCount: summaryStats.draft,
      closedSummaryCount: summaryStats.closed,
      openGradebookSections,
      notStartedGradebookSections,
    });
  });

  return buildSemesterFinalizeReadiness({
    semesterId: semester.id,
    semesterName: semester.name,
    semesterCode: semester.code,
    homerooms,
  });
}

function buildAssessmentsBySectionMap(
  assessments: SemesterFinalizeReadinessAssessment[],
): Map<string, { open: number; total: number }> {
  const map = new Map<string, { open: number; total: number }>();

  for (const row of assessments) {
    const current = map.get(row.courseSectionId) ?? { open: 0, total: 0 };
    current.total += 1;
    if (row.status === AssessmentStatus.OPEN) {
      current.open += 1;
    }
    map.set(row.courseSectionId, current);
  }

  return map;
}

function buildSectionsByHomeroomMap(
  courseSections: SemesterFinalizeReadinessCourseSection[],
): Map<string, SemesterFinalizeReadinessCourseSection[]> {
  const map = new Map<string, SemesterFinalizeReadinessCourseSection[]>();

  for (const section of courseSections) {
    if (!section.homeroomClassId) {
      continue;
    }

    const list = map.get(section.homeroomClassId) ?? [];
    list.push(section);
    map.set(section.homeroomClassId, list);
  }

  return map;
}

function buildSummaryCountMap(
  summaryCounts: SemesterFinalizeReadinessContext['summaryCounts'],
): Map<string, { total: number; draft: number; closed: number }> {
  const map = new Map<
    string,
    { total: number; draft: number; closed: number }
  >();

  for (const row of summaryCounts) {
    const current = map.get(row.homeroomClassId) ?? {
      total: 0,
      draft: 0,
      closed: 0,
    };
    current.total += row.count;
    if (row.status === SummaryStatus.DRAFT) {
      current.draft += row.count;
    } else {
      current.closed += row.count;
    }
    map.set(row.homeroomClassId, current);
  }

  return map;
}
