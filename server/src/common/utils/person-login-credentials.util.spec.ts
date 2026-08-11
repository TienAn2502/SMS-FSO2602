import {
  buildDefaultPersonPassword,
  buildPersonLoginEmail,
  formatDobForPassword,
} from '@/common/utils/person-login-credentials.util';

describe('person-login-credentials.util', () => {
  it('builds internal email from school + code', () => {
    expect(
      buildPersonLoginEmail(
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        'HS-261',
      ),
    ).toBe('hs-261.aaaaaaaabbbb@person.local');
  });

  it('formats DOB and default password', () => {
    expect(formatDobForPassword('2009-05-12')).toBe('20090512');
    expect(
      buildDefaultPersonPassword({
        externalCode: 'HS-261',
        dateOfBirth: '2009-05-12',
      }),
    ).toBe('HS-26120090512');
    expect(
      buildDefaultPersonPassword({
        externalCode: 'PH-1',
        phone: '0901111222',
      }),
    ).toBe('PH-10901111222');
  });
});
