import {
  buildPromotedHomeroomClassCode,
  findNextGradeLevelCode,
} from '@/modules/year-preparation/year-preparation.util';

describe('year-preparation.util', () => {
  it('finds next grade level by numeric order', () => {
    expect(findNextGradeLevelCode('10', ['10', '11', '12'])).toBe('11');
    expect(findNextGradeLevelCode('12', ['10', '11', '12'])).toBeNull();
  });

  it('builds promoted class codes', () => {
    expect(buildPromotedHomeroomClassCode('10A1', '10', '11')).toBe('11A1');
    expect(buildPromotedHomeroomClassCode('10A5', '10', '11')).toBe('11A5');
    expect(buildPromotedHomeroomClassCode('A1', '10', '11')).toBe('A1');
  });
});
