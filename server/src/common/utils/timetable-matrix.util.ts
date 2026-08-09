import type { SpreadsheetColumnDef } from '@/common/files/file-format.types';

export const TIMETABLE_MATRIX_DAYS = [1, 2, 3, 4, 5] as const;

export const TIMETABLE_MATRIX_DAY_LABELS: Record<number, string> = {
  1: 'Thứ 2',
  2: 'Thứ 3',
  3: 'Thứ 4',
  4: 'Thứ 5',
  5: 'Thứ 6',
};

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
  courseSectionCode: string,
  teacherEmail: string,
  room?: string | null,
): string {
  const lines = [courseSectionCode.trim(), teacherEmail.trim()];

  if (room?.trim()) {
    lines.push(room.trim());
  }

  return lines.join('\n');
}

export interface ParsedTimetableImportCell {
  courseSectionCode: string;
  teacherIdentifier: string;
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

  if (lines.length < 2) {
    throw new Error('TIMETABLE_IMPORT_CELL_INCOMPLETE');
  }

  return {
    courseSectionCode: lines[0],
    teacherIdentifier: lines[1],
    room: lines[2] ?? null,
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
  const periodSet = new Set(entries.map((entry) => entry.periodNumber));
  const periods =
    periodSet.size > 0
      ? [...periodSet].sort((left, right) => left - right)
      : [1, 2, 3, 4, 5];

  const cellMap = new Map<string, TimetableMatrixEntry>();
  for (const entry of entries) {
    cellMap.set(`${entry.dayOfWeek}-${entry.periodNumber}`, entry);
  }

  const columns: SpreadsheetColumnDef[] = [
    { header: 'Tiết', key: 'tiet', width: 8 },
    ...TIMETABLE_MATRIX_DAYS.map((day) => ({
      header: TIMETABLE_MATRIX_DAY_LABELS[day],
      key: `thu_${day}`,
      width: 28,
    })),
  ];

  const rows = periods.map((period) => {
    const row: Record<string, string> = {
      tiet: String(period),
    };

    for (const day of TIMETABLE_MATRIX_DAYS) {
      const entry = cellMap.get(`${day}-${period}`);
      row[`thu_${day}`] = entry ? formatCell(entry) : '';
    }

    return row;
  });

  return { columns, rows, periods };
}
