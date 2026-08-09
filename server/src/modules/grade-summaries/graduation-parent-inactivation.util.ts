export function pickParentIdsToInactivate(params: {
  graduatedStudentIds: readonly string[];
  studentParentLinks: ReadonlyArray<{ parentId: string; studentId: string }>;
  activeStudentIds: ReadonlySet<string>;
}): string[] {
  const graduatedStudentIds = new Set(params.graduatedStudentIds);
  const candidateParentIds = new Set<string>();

  for (const link of params.studentParentLinks) {
    if (graduatedStudentIds.has(link.studentId)) {
      candidateParentIds.add(link.parentId);
    }
  }

  const parentIdsWithActiveChildren = new Set<string>();

  for (const link of params.studentParentLinks) {
    if (params.activeStudentIds.has(link.studentId)) {
      parentIdsWithActiveChildren.add(link.parentId);
    }
  }

  return [...candidateParentIds].filter(
    (parentId) => !parentIdsWithActiveChildren.has(parentId),
  );
}
