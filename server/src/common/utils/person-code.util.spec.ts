import {
  entryYearYyFromDate,
  formatParentCode,
  formatStudentCode,
  formatTeacherCode,
  maxParsedSeq,
  parsePrefixedSeq,
  parseStudentSeq,
} from '@/common/utils/person-code.util';

describe('person-code.util', () => {
  it('formats HS/GV/PH codes', () => {
    expect(formatStudentCode('26', 1)).toBe('HS-261');
    expect(formatStudentCode('26', 15)).toBe('HS-2615');
    expect(formatTeacherCode(1)).toBe('GV-1');
    expect(formatParentCode(12)).toBe('PH-12');
  });

  it('parses student seq for a given entry year', () => {
    expect(parseStudentSeq('HS-261', '26')).toBe(1);
    expect(parseStudentSeq('HS-2615', '26')).toBe(15);
    expect(parseStudentSeq('HS-251', '26')).toBeNull();
    expect(parseStudentSeq('2509001', '26')).toBeNull();
  });

  it('parses GV/PH seq', () => {
    expect(parsePrefixedSeq('GV-3', 'GV')).toBe(3);
    expect(parsePrefixedSeq('PH-10', 'PH')).toBe(10);
    expect(parsePrefixedSeq('GV-0', 'GV')).toBeNull();
    expect(parsePrefixedSeq('PH-x', 'PH')).toBeNull();
  });

  it('derives YY from date and finds max seq', () => {
    expect(entryYearYyFromDate(new Date('2026-09-01T00:00:00.000Z'))).toBe(
      '26',
    );
    expect(
      maxParsedSeq(['HS-261', 'HS-269', null, 'HS-251'], (code) =>
        parseStudentSeq(code, '26'),
      ),
    ).toBe(9);
  });
});
