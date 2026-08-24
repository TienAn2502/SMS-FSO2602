import { PassFailResult } from '@prisma/client';

import {
  buildPassFailResultsByStudentId,
  buildYearSubjectAveragesByStudentId,
  planSubjectYearAverageUpdates,
} from '@/common/utils/subject-year-average.util';

describe('subject-year-average.util', () => {
  it('dedupes year averages to one value per course section', () => {
    const map = buildYearSubjectAveragesByStudentId([
      {
        studentId: 's1',
        courseSectionCode: 'TOAN-10A1',
        semesterCode: 'HK1',
        semesterAverage: 8,
        yearAverage: null,
      },
      {
        studentId: 's1',
        courseSectionCode: 'TOAN-10A1',
        semesterCode: 'HK2',
        semesterAverage: 5.31,
        yearAverage: null,
      },
      {
        studentId: 's1',
        courseSectionCode: 'VAN-10A1',
        semesterCode: 'HK1',
        semesterAverage: 9,
        yearAverage: null,
      },
      {
        studentId: 's1',
        courseSectionCode: 'VAN-10A1',
        semesterCode: 'HK2',
        semesterAverage: 9.17,
        yearAverage: null,
      },
    ]);

    expect(map.get('s1')).toHaveLength(2);
    expect(map.get('s1')?.every((value) => value >= 5)).toBe(true);
  });

  it('dedupes pass-fail to one result per course section', () => {
    const map = buildPassFailResultsByStudentId([
      {
        studentId: 's1',
        courseSectionCode: 'TD-10A1',
        semesterCode: 'HK1',
        passFailResult: PassFailResult.PASS,
      },
      {
        studentId: 's1',
        courseSectionCode: 'TD-10A1',
        semesterCode: 'HK2',
        passFailResult: PassFailResult.PASS,
      },
    ]);

    expect(map.get('s1')).toEqual([PassFailResult.PASS]);
  });

  it('plans year-average updates for both semester rows when missing', () => {
    const planned = planSubjectYearAverageUpdates([
      {
        id: 'r1',
        studentId: 's1',
        courseSectionCode: 'TOAN-10A1',
        semesterCode: 'HK1',
        semesterAverage: 6.92,
        yearAverage: null,
      },
      {
        id: 'r2',
        studentId: 's1',
        courseSectionCode: 'TOAN-10A1',
        semesterCode: 'HK2',
        semesterAverage: 8,
        yearAverage: null,
      },
    ]);

    expect(planned.updatedGroupCount).toBe(1);
    expect(planned.updates).toHaveLength(2);
    expect(planned.updates.every((row) => row.yearAverage === 7.64)).toBe(true);
  });

  it('skips groups that already have the correct year average', () => {
    const planned = planSubjectYearAverageUpdates([
      {
        id: 'r1',
        studentId: 's1',
        courseSectionCode: 'TOAN-10A1',
        semesterCode: 'HK1',
        semesterAverage: 6.92,
        yearAverage: 7.64,
      },
      {
        id: 'r2',
        studentId: 's1',
        courseSectionCode: 'TOAN-10A1',
        semesterCode: 'HK2',
        semesterAverage: 8,
        yearAverage: 7.64,
      },
    ]);

    expect(planned.updatedGroupCount).toBe(0);
    expect(planned.updates).toHaveLength(0);
  });
});
