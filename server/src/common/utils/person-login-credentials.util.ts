/**
 * Email nội bộ (users.email vẫn UNIQUE) — đăng nhập thực tế bằng mã HS/GV/PH hoặc SĐT.
 */
export function buildPersonLoginEmail(
  schoolId: string,
  externalCode: string,
): string {
  const code = externalCode
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
  const schoolPart = schoolId.replace(/-/g, '').slice(0, 12);
  return `${code}.${schoolPart}@person.local`;
}

/** Phần ngày sinh trong mật khẩu: YYYYMMDD */
export function formatDobForPassword(dateOfBirth: Date | string): string {
  if (typeof dateOfBirth === 'string') {
    const match = dateOfBirth.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}${match[2]}${match[3]}`;
    }
    const parsed = new Date(dateOfBirth);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDobForPassword(parsed);
    }
    throw new Error('Ngày sinh không hợp lệ');
  }

  const yyyy = String(dateOfBirth.getUTCFullYear());
  const mm = String(dateOfBirth.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dateOfBirth.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/**
 * Mật khẩu mặc định:
 * - HS/GV: mã + ngày sinh (YYYYMMDD) — vd HS-26120090512
 * - PH (không có ngày sinh): mã + SĐT (chỉ số) — vd PH-10901111222
 */
export function buildDefaultPersonPassword(params: {
  externalCode: string;
  dateOfBirth?: Date | string | null;
  phone?: string | null;
}): string {
  const code = params.externalCode.trim().toUpperCase();
  if (!code) {
    throw new Error('Thiếu mã hồ sơ để tạo mật khẩu');
  }

  if (params.dateOfBirth) {
    return `${code}${formatDobForPassword(params.dateOfBirth)}`;
  }

  const phoneDigits = (params.phone ?? '').replace(/\D/g, '');
  if (phoneDigits.length >= 9) {
    return `${code}${phoneDigits}`;
  }

  throw new Error(
    'Cần ngày sinh (HS/GV) hoặc số điện thoại (PH) để tạo mật khẩu mặc định',
  );
}
