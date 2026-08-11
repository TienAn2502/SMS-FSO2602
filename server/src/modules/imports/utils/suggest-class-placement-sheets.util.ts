export type PlacementSheetStudent = {
  studentId: string;
  reason: 'RETAINED' | 'NEW_INTAKE';
  previousHomeroomClassCode: string | null;
  previousGradeLevelId: string | null;
};

/**
 * Gợi ý sheet (mã lớp) cho từng HS chưa xếp:
 * - RETAINED → mã lớp năm trước (cùng khối)
 * - NEW_INTAKE → chia đều vào lớp ACTIVE khối đầu cấp (hoặc `{khối}A1` nếu chưa có lớp)
 */
export function suggestClassPlacementSheets(
  students: readonly PlacementSheetStudent[],
  options: {
    entryGradeCode: string | null;
    entryClassCodes: readonly string[];
  },
): Map<string, string[]> {
  const sheetToStudentIds = new Map<string, string[]>();

  const append = (sheet: string, studentId: string) => {
    const list = sheetToStudentIds.get(sheet) ?? [];
    list.push(studentId);
    sheetToStudentIds.set(sheet, list);
  };

  const retained = students.filter((row) => row.reason === 'RETAINED');
  const newIntake = students.filter((row) => row.reason === 'NEW_INTAKE');

  for (const row of retained) {
    const code = row.previousHomeroomClassCode?.trim();
    if (code) {
      append(code, row.studentId);
    } else if (options.entryGradeCode) {
      append(`${options.entryGradeCode}A1`, row.studentId);
    } else {
      append('Lop_tam', row.studentId);
    }
  }

  const intakeTargets =
    options.entryClassCodes.length > 0
      ? [...options.entryClassCodes]
      : options.entryGradeCode
        ? [`${options.entryGradeCode}A1`]
        : ['Lop_tam'];

  newIntake.forEach((row, index) => {
    const sheet = intakeTargets[index % intakeTargets.length] ?? 'Lop_tam';
    append(sheet, row.studentId);
  });

  return sheetToStudentIds;
}
