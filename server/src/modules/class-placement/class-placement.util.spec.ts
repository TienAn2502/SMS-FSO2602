import {
  isRetainedGradeCompatible,
  planEvenClassPlacement,
} from '@/modules/class-placement/class-placement.util';

describe('planEvenClassPlacement', () => {
  it('distributes evenly across classes', () => {
    const plan = planEvenClassPlacement(
      [
        { studentId: 's1' },
        { studentId: 's2' },
        { studentId: 's3' },
        { studentId: 's4' },
      ],
      [
        { id: 'c1', currentCount: 0, capacity: null },
        { id: 'c2', currentCount: 0, capacity: null },
      ],
    );

    expect(plan.assignments).toHaveLength(4);
    expect(plan.unplacedStudentIds).toHaveLength(0);

    const byClass = plan.assignments.reduce<Record<string, number>>(
      (acc, row) => {
        acc[row.homeroomClassId] = (acc[row.homeroomClassId] ?? 0) + 1;
        return acc;
      },
      {},
    );
    expect(byClass.c1).toBe(2);
    expect(byClass.c2).toBe(2);
  });

  it('respects capacity and reports unplaced', () => {
    const plan = planEvenClassPlacement(
      [{ studentId: 's1' }, { studentId: 's2' }, { studentId: 's3' }],
      [
        { id: 'c1', currentCount: 1, capacity: 2 },
        { id: 'c2', currentCount: 2, capacity: 2 },
      ],
    );

    expect(plan.assignments).toEqual([
      { studentId: 's1', homeroomClassId: 'c1' },
    ]);
    expect(plan.unplacedStudentIds).toEqual(['s2', 's3']);
  });

  it('returns all unplaced when no classes', () => {
    const plan = planEvenClassPlacement([{ studentId: 's1' }], []);
    expect(plan.assignments).toHaveLength(0);
    expect(plan.unplacedStudentIds).toEqual(['s1']);
  });
});

describe('isRetainedGradeCompatible', () => {
  it('allows new intake without previous grade', () => {
    expect(isRetainedGradeCompatible(null, 'grade-10')).toBe(true);
    expect(isRetainedGradeCompatible(undefined, 'grade-10')).toBe(true);
  });

  it('requires retained students to match previous grade', () => {
    expect(isRetainedGradeCompatible('grade-12', 'grade-12')).toBe(true);
    expect(isRetainedGradeCompatible('grade-12', 'grade-10')).toBe(false);
    expect(isRetainedGradeCompatible('grade-12', 'grade-11')).toBe(false);
  });
});
