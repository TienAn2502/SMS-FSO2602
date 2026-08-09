import {
  allocateExcelSheetName,
  groupTimetableEntriesByHomeroomClass,
  parseTimetableImportCell,
} from '@/common/utils/timetable-matrix.util';

describe('timetable matrix utils', () => {
  describe('groupTimetableEntriesByHomeroomClass', () => {
    it('groups entries by homeroom class and sorts by class code', () => {
      const groups = groupTimetableEntriesByHomeroomClass(
        [
          {
            homeroomClassId: 'class-b',
            dayOfWeek: 1,
            periodNumber: 1,
          },
          {
            homeroomClassId: 'class-a',
            dayOfWeek: 1,
            periodNumber: 2,
          },
          {
            homeroomClassId: null,
            dayOfWeek: 2,
            periodNumber: 1,
          },
        ],
        new Map([
          ['class-a', { code: '10A1', name: '10A1' }],
          ['class-b', { code: '10A2', name: '10A2' }],
        ]),
      );

      expect(groups.map((group) => group.homeroomClassCode)).toEqual([
        '10A1',
        '10A2',
        'Khac',
      ]);
      expect(groups[0]?.entries).toHaveLength(1);
      expect(groups[2]?.homeroomClassName).toBe('Chưa gán lớp HC');
    });
  });

  describe('allocateExcelSheetName', () => {
    it('sanitizes invalid characters and avoids duplicate names', () => {
      const usedNames = new Set<string>();

      expect(allocateExcelSheetName('10A1', usedNames)).toBe('10A1');
      expect(allocateExcelSheetName('10A1', usedNames)).toBe('10A1 (2)');
      expect(allocateExcelSheetName('10/A*2', usedNames)).toBe('10_A_2');
    });
  });

  describe('parseTimetableImportCell', () => {
    it('parses import cell with course code, email and room', () => {
      expect(
        parseTimetableImportCell('VAN-10A2\ngv@test.edu\nP.101'),
      ).toEqual({
        courseSectionCode: 'VAN-10A2',
        teacherIdentifier: 'gv@test.edu',
        room: 'P.101',
      });
    });

    it('returns null for empty cell', () => {
      expect(parseTimetableImportCell('')).toBeNull();
    });
  });
});
