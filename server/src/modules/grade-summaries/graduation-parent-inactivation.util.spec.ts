import { pickParentIdsToInactivate } from '@/modules/grade-summaries/graduation-parent-inactivation.util';

describe('pickParentIdsToInactivate', () => {
  it('returns parents linked only to graduated students', () => {
    expect(
      pickParentIdsToInactivate({
        graduatedStudentIds: ['s1'],
        studentParentLinks: [
          { parentId: 'p1', studentId: 's1' },
          { parentId: 'p2', studentId: 's2' },
        ],
        activeStudentIds: new Set(['s2']),
      }),
    ).toEqual(['p1']);
  });

  it('skips parents who still have an active child', () => {
    expect(
      pickParentIdsToInactivate({
        graduatedStudentIds: ['s1'],
        studentParentLinks: [
          { parentId: 'p1', studentId: 's1' },
          { parentId: 'p1', studentId: 's2' },
        ],
        activeStudentIds: new Set(['s2']),
      }),
    ).toEqual([]);
  });

  it('returns unique parent ids when linked to multiple graduates', () => {
    expect(
      pickParentIdsToInactivate({
        graduatedStudentIds: ['s1', 's2'],
        studentParentLinks: [
          { parentId: 'p1', studentId: 's1' },
          { parentId: 'p1', studentId: 's2' },
        ],
        activeStudentIds: new Set(),
      }),
    ).toEqual(['p1']);
  });

  it('returns empty array when no graduated students have parents', () => {
    expect(
      pickParentIdsToInactivate({
        graduatedStudentIds: ['s1'],
        studentParentLinks: [{ parentId: 'p1', studentId: 's2' }],
        activeStudentIds: new Set(['s2']),
      }),
    ).toEqual([]);
  });
});
