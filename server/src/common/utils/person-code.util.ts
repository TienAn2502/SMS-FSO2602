export type PrefixedPersonKind = 'GV' | 'PH';

/** HS-{YY}{seq} — ví dụ năm 2026 seq 1 → HS-261 */
export function formatStudentCode(entryYearYy: string, seq: number): string {
  return `HS-${entryYearYy}${seq}`;
}

/** GV-{seq} — ví dụ GV-1 */
export function formatTeacherCode(seq: number): string {
  return `GV-${seq}`;
}

/** PH-{seq} — ví dụ PH-1 */
export function formatParentCode(seq: number): string {
  return `PH-${seq}`;
}

export function entryYearYyFromDate(date: Date): string {
  return String(date.getUTCFullYear()).slice(-2);
}

export function parseStudentSeq(
  code: string,
  entryYearYy: string,
): number | null {
  const match = code.match(new RegExp(`^HS-${entryYearYy}(\\d+)$`));
  if (!match?.[1]) {
    return null;
  }
  const seq = Number(match[1]);
  return Number.isInteger(seq) && seq > 0 ? seq : null;
}

export function parsePrefixedSeq(
  code: string,
  prefix: PrefixedPersonKind,
): number | null {
  const match = code.match(new RegExp(`^${prefix}-(\\d+)$`));
  if (!match?.[1]) {
    return null;
  }
  const seq = Number(match[1]);
  return Number.isInteger(seq) && seq > 0 ? seq : null;
}

export function maxParsedSeq(
  codes: Array<string | null | undefined>,
  parse: (code: string) => number | null,
): number {
  let max = 0;
  for (const code of codes) {
    if (!code) {
      continue;
    }
    const seq = parse(code);
    if (seq !== null && seq > max) {
      max = seq;
    }
  }
  return max;
}
