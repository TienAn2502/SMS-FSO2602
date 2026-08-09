export function parseImportBoolean(raw: string | undefined): boolean | undefined {
  if (!raw?.trim()) {
    return undefined;
  }

  const normalized = raw.trim().toLowerCase();

  if (['1', 'true', 'yes', 'co', 'có', 'x'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'khong', 'không'].includes(normalized)) {
    return false;
  }

  return undefined;
}
