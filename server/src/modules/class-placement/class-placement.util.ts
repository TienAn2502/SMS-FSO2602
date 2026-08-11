export type ClassSeat = {
  id: string;
  /** Số HS đã có trong lớp (trước khi xếp thêm). */
  currentCount: number;
  /** null = không giới hạn. */
  capacity: number | null;
};

export type StudentToPlace = {
  studentId: string;
};

export type PlacementAssignment = {
  studentId: string;
  homeroomClassId: string;
};

/**
 * HS ở lại chỉ được xếp vào lớp cùng khối với năm trước.
 * NEW_INTAKE / không có previousGradeLevelId → cho phép.
 */
export function isRetainedGradeCompatible(
  previousGradeLevelId: string | null | undefined,
  targetGradeLevelId: string,
): boolean {
  if (!previousGradeLevelId) {
    return true;
  }

  return previousGradeLevelId === targetGradeLevelId;
}

/**
 * Chia đều HS vào các lớp: luôn gán vào lớp còn chỗ có sĩ số hiện tại thấp nhất.
 * Bỏ qua lớp đã đầy (capacity). Trả về chưa xếp nếu hết chỗ.
 */
export function planEvenClassPlacement(
  students: readonly StudentToPlace[],
  classes: readonly ClassSeat[],
): {
  assignments: PlacementAssignment[];
  unplacedStudentIds: string[];
} {
  if (classes.length === 0) {
    return {
      assignments: [],
      unplacedStudentIds: students.map((row) => row.studentId),
    };
  }

  const seats = classes.map((row) => ({
    id: row.id,
    currentCount: row.currentCount,
    capacity: row.capacity,
  }));

  const assignments: PlacementAssignment[] = [];
  const unplacedStudentIds: string[] = [];

  for (const student of students) {
    const eligible = seats
      .filter(
        (seat) => seat.capacity == null || seat.currentCount < seat.capacity,
      )
      .sort((a, b) => {
        if (a.currentCount !== b.currentCount) {
          return a.currentCount - b.currentCount;
        }
        return a.id.localeCompare(b.id);
      });

    const target = eligible[0];
    if (!target) {
      unplacedStudentIds.push(student.studentId);
      continue;
    }

    assignments.push({
      studentId: student.studentId,
      homeroomClassId: target.id,
    });
    target.currentCount += 1;
  }

  return { assignments, unplacedStudentIds };
}
