import {
  buildPhoneLookupVariants,
  looksLikeEmail,
  looksLikePersonCode,
  looksLikePhone,
} from '@/modules/auth/utils/login-identifier.util';

describe('login-identifier.util', () => {
  it('normalizes VN phone variants', () => {
    expect(buildPhoneLookupVariants('0901234567')).toEqual(
      expect.arrayContaining(['0901234567', '901234567', '84901234567']),
    );
    expect(buildPhoneLookupVariants('+84901234567')).toEqual(
      expect.arrayContaining(['0901234567']),
    );
  });

  it('detects identifier kinds', () => {
    expect(looksLikeEmail('a@b.com')).toBe(true);
    expect(looksLikePersonCode('HS-261')).toBe(true);
    expect(looksLikePersonCode('gv-12')).toBe(true);
    expect(looksLikePhone('0901234567')).toBe(true);
    expect(looksLikePhone('HS-261')).toBe(false);
  });
});
