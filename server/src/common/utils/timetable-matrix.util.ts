import type { SpreadsheetColumnDef } from '@/common/files/file-format.types';

export const TIMETABLE_MATRIX_DAYS = [1, 2, 3, 4, 5] as const;

/** Tiết 1–5 sáng, 6–10 chiều. */
export const TIMETABLE_MATRIX_PERIODS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
] as const;

export const TIMETABLE_MATRIX_DAY_LABELS: Record<number, string> = {
  1: 'Thứ 2',
  2: 'Thứ 3',
  3: 'Thứ 4',
  4: 'Thứ 5',
  5: 'Thứ 6',
};

export function formatTimetablePeriodLabel(period: number): string {
  if (period >= 1 && period <= 5) {
    return `${period} (Sáng)`;
  }
  if (period >= 6 && period <= 10) {
    return `${period} (Chiều)`;
  }
  return String(period);
}

export const TIMETABLE_UNASSIGNED_HOMEROOM_KEY = '__unassigned__';

export interface TimetableMatrixEntry {
  dayOfWeek: number;
  periodNumber: number;
  courseSectionCode: string;
  courseSectionName: string;
  teacherFullName: string;
  room: string | null;
}

export interface TimetableHomeroomClassGroup<
  TEntry extends { homeroomClassId: string | null },
> {
  homeroomClassId: string | null;
  homeroomClassCode: string;
  homeroomClassName: string;
  entries: TEntry[];
}

export interface TimetableMatrixBuildResult {
  columns: SpreadsheetColumnDef[];
  rows: Record<string, string>[];
  periods: number[];
}

const INVALID_EXCEL_SHEET_CHARS = /[\\/*?:[\]]/g;

function formatMatrixCell(entry: TimetableMatrixEntry): string {
  const lines = [entry.courseSectionName, entry.teacherFullName];

  if (entry.room) {
    lines.push(entry.room);
  }

  return lines.join('\n');
}

export function formatTimetableImportCell(
  subjectOrSectionKey: string,
  room?: string | null,
): string {
  const lines = [subjectOrSectionKey.trim()];

  if (room?.trim()) {
    lines.push(room.trim());
  }

  return lines.join('\n');
}

export interface ParsedTimetableImportCell {
  /** Mã môn (TOAN), tên môn, hoặc mã lớp môn (TOAN-10A1). */
  subjectOrSectionKey: string;
  room: string | null;
}

export function parseTimetableImportCell(
  rawValue: string,
): ParsedTimetableImportCell | null {
  const lines = rawValue
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return null;
  }

  const subjectOrSectionKey = lines[0] ?? '';
  if (!subjectOrSectionKey) {
    return null;
  }

  // Format mới: dòng 1 = môn; dòng 2 (tuỳ chọn) = phòng.
  // Format cũ (tương thích): dòng 2 = email/họ tên GV → bỏ qua; dòng 3 = phòng.
  let room: string | null = null;
  if (lines.length >= 2) {
    const second = lines[1] ?? '';
    if (second.includes('@')) {
      room = lines[2] ?? null;
    } else {
      room = second;
    }
  }

  return {
    subjectOrSectionKey,
    room,
  };
}

export function extractHomeroomClassCodeFromLabel(label: string): string {
  return label.split(/\s*[—–-]\s*/)[0]?.trim() ?? label.trim();
}

export function formatHomeroomClassLabel(
  code: string,
  name: string,
): string {
  return name.trim() === code.trim() ? code : `${code} — ${name}`;
}

export function groupTimetableEntriesByHomeroomClass<
  TEntry extends { homeroomClassId: string | null },
>(
  entries: TEntry[],
  homeroomClassById: Map<string, { code: string; name: string }>,
): TimetableHomeroomClassGroup<TEntry>[] {
  const groupedEntries = new Map<string, TEntry[]>();

  for (const entry of entries) {
    const groupKey = entry.homeroomClassId ?? TIMETABLE_UNASSIGNED_HOMEROOM_KEY;
    const group = groupedEntries.get(groupKey) ?? [];
    group.push(entry);
    groupedEntries.set(groupKey, group);
  }

  return [...groupedEntries.entries()]
    .map(([groupKey, groupEntries]) => {
      if (groupKey === TIMETABLE_UNASSIGNED_HOMEROOM_KEY) {
        return {
          homeroomClassId: null,
          homeroomClassCode: 'Khac',
          homeroomClassName: 'Chưa gán lớp HC',
          entries: groupEntries,
        };
      }

      const homeroomClass = homeroomClassById.get(groupKey);

      return {
        homeroomClassId: groupKey,
        homeroomClassCode: homeroomClass?.code ?? groupKey.slice(0, 8),
        homeroomClassName: homeroomClass?.name ?? '—',
        entries: groupEntries,
      };
    })
    .sort((left, right) =>
      left.homeroomClassCode.localeCompare(right.homeroomClassCode, 'vi'),
    );
}

export function allocateExcelSheetName(
  baseName: string,
  usedNames: Set<string>,
): string {
  const sanitizedBase =
    baseName.replace(INVALID_EXCEL_SHEET_CHARS, '_').trim() || 'Sheet';
  const truncatedBase =
    sanitizedBase.length > 31 ? sanitizedBase.slice(0, 31) : sanitizedBase;

  let candidate = truncatedBase;
  let duplicateIndex = 2;

  while (usedNames.has(candidate.toLowerCase())) {
    const suffix = ` (${duplicateIndex})`;
    candidate =
      truncatedBase.slice(0, Math.max(1, 31 - suffix.length)) + suffix;
    duplicateIndex += 1;
  }

  usedNames.add(candidate.toLowerCase());
  return candidate;
}

export function buildTimetableMatrix(
  entries: TimetableMatrixEntry[],
  formatCell: (entry: TimetableMatrixEntry) => string = formatMatrixCell,
): TimetableMatrixBuildResult {
  const periodSet = new Set<number>(TIMETABLE_MATRIX_PERIODS);
  for (const entry of entries) {
    if (Number.isInteger(entry.periodNumber) && entry.periodNumber >= 1) {
      periodSet.add(entry.periodNumber);
    }
  }
  const periods = [...periodSet].sort((left, right) => left - right);

  const cellMap = new Map<string, TimetableMatrixEntry>();
  for (const entry of entries) {
    cellMap.set(`${entry.dayOfWeek}-${entry.periodNumber}`, entry);
  }

  const columns: SpreadsheetColumnDef[] = [
    { header: 'Tiết', key: 'tiet', width: 12 },
    ...TIMETABLE_MATRIX_DAYS.map((day) => ({
      header: TIMETABLE_MATRIX_DAY_LABELS[day],
      key: `thu_${day}`,
      width: 28,
    })),
  ];

  const rows = periods.map((period) => {
    const row: Record<string, string> = {
      tiet: formatTimetablePeriodLabel(period),
    };

    for (const day of TIMETABLE_MATRIX_DAYS) {
      const entry = cellMap.get(`${day}-${period}`);
      row[`thu_${day}`] = entry ? formatCell(entry) : '';
    }

    return row;
  });

  return { columns, rows, periods };
}
