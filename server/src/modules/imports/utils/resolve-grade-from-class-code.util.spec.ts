import { resolveGradeLevelCodeFromClassCode } from '@/modules/imports/utils/resolve-grade-from-class-code.util';

describe('resolveGradeLevelCodeFromClassCode', () => {
  const codes = ['10', '11', '12'];

  it('resolves grade from class code prefix', () => {
    expect(resolveGradeLevelCodeFromClassCode('10A1', codes)).toBe('10');
    expect(resolveGradeLevelCodeFromClassCode('11A5', codes)).toBe('11');
    expect(resolveGradeLevelCodeFromClassCode('12', codes)).toBe('12');
  });

  it('does not match shorter numeric prefix incorrectly', () => {
    expect(
      resolveGradeLevelCodeFromClassCode('10A1', ['1', '10', '11']),
    ).toBe('10');
    expect(resolveGradeLevelCodeFromClassCode('10A1', ['1'])).toBeNull();
  });

  it('returns null when no match', () => {
    expect(resolveGradeLevelCodeFromClassCode('A1', codes)).toBeNull();
    expect(resolveGradeLevelCodeFromClassCode('9A1', codes)).toBeNull();
  });
});
