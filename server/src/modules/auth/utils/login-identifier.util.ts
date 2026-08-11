/**
 * Chuẩn hoá số điện thoại về dạng so sánh (chỉ còn chữ số, 84… → 0…).
 */
export function normalizePhoneDigits(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('84') && digits.length >= 11) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

export function buildPhoneLookupVariants(raw: string): string[] {
  const digits = normalizePhoneDigits(raw);
  if (!digits) {
    return [];
  }

  const variants = new Set<string>([digits, raw.trim()]);

  if (digits.startsWith('0') && digits.length >= 10) {
    variants.add(digits.slice(1));
    variants.add(`84${digits.slice(1)}`);
    variants.add(`+84${digits.slice(1)}`);
  } else if (digits.length >= 9 && digits.length <= 10) {
    variants.add(`0${digits}`);
    variants.add(`84${digits}`);
  }

  return [...variants].filter(Boolean);
}

export function looksLikeEmail(value: string): boolean {
  return value.includes('@');
}

export function looksLikePersonCode(value: string): boolean {
  return /^(HS|GV|PH)-/i.test(value.trim());
}

export function looksLikePhone(value: string): boolean {
  const digits = normalizePhoneDigits(value);
  return /^0?\d{9,11}$/.test(digits) && !looksLikePersonCode(value);
}
