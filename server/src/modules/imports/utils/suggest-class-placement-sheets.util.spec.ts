import { suggestClassPlacementSheets } from '@/modules/imports/utils/suggest-class-placement-sheets.util';

describe('suggestClassPlacementSheets', () => {
  it('groups RETAINED by previous class code', () => {
    const result = suggestClassPlacementSheets(
      [
        {
          studentId: 's1',
          reason: 'RETAINED',
          previousHomeroomClassCode: '10A1',
          previousGradeLevelId: 'g10',
        },
        {
          studentId: 's2',
          reason: 'RETAINED',
          previousHomeroomClassCode: '10A2',
          previousGradeLevelId: 'g10',
        },
      ],
      { entryGradeCode: '10', entryClassCodes: ['10A1', '10A2'] },
    );

    expect(result.get('10A1')).toEqual(['s1']);
    expect(result.get('10A2')).toEqual(['s2']);
  });

  it('round-robins NEW_INTAKE into entry class codes', () => {
    const result = suggestClassPlacementSheets(
      [
        {
          studentId: 'n1',
          reason: 'NEW_INTAKE',
          previousHomeroomClassCode: null,
          previousGradeLevelId: null,
        },
        {
          studentId: 'n2',
          reason: 'NEW_INTAKE',
          previousHomeroomClassCode: null,
          previousGradeLevelId: null,
        },
        {
          studentId: 'n3',
          reason: 'NEW_INTAKE',
          previousHomeroomClassCode: null,
          previousGradeLevelId: null,
        },
      ],
      { entryGradeCode: '10', entryClassCodes: ['10A1', '10A2'] },
    );

    expect(result.get('10A1')).toEqual(['n1', 'n3']);
    expect(result.get('10A2')).toEqual(['n2']);
  });

  it('falls back to {grade}A1 when no entry classes exist', () => {
    const result = suggestClassPlacementSheets(
      [
        {
          studentId: 'n1',
          reason: 'NEW_INTAKE',
          previousHomeroomClassCode: null,
          previousGradeLevelId: null,
        },
      ],
      { entryGradeCode: '10', entryClassCodes: [] },
    );

    expect(result.get('10A1')).toEqual(['n1']);
  });
});
