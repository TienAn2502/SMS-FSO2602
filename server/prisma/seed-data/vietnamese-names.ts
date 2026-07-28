import { Gender } from '@prisma/client';

const HO = [
  'Nguyễn',
  'Trần',
  'Lê',
  'Phạm',
  'Hoàng',
  'Huỳnh',
  'Phan',
  'Vũ',
  'Võ',
  'Đặng',
  'Bùi',
  'Đỗ',
  'Hồ',
  'Ngô',
  'Dương',
  'Lý',
  'Đinh',
  'Cao',
  'Lưu',
  'Trương',
];

const TEN_DEM_NAM = [
  'Văn',
  'Hữu',
  'Minh',
  'Quốc',
  'Gia',
  'Thanh',
  'Xuân',
  'Bảo',
  'Đức',
  'Thành',
  'Công',
  'Tuấn',
  'Hoài',
  'Ngọc',
  'Trung',
];

const TEN_DEM_NU = [
  'Thị',
  'Ngọc',
  'Kim',
  'Thu',
  'Mai',
  'Lan',
  'Hồng',
  'Phương',
  'Thảo',
  'Hà',
  'Linh',
  'Trang',
  'Yến',
  'Huệ',
  'Như',
];

const TEN = [
  'An',
  'Bình',
  'Chi',
  'Dung',
  'Em',
  'Giang',
  'Hà',
  'Hùng',
  'Khanh',
  'Linh',
  'Long',
  'Mai',
  'Nam',
  'Oanh',
  'Phúc',
  'Quân',
  'Sơn',
  'Tâm',
  'Uyên',
  'Việt',
  'Yến',
  'Khôi',
  'Đạt',
  'Huy',
  'Loan',
  'Nhật',
  'Phong',
  'Quỳnh',
  'Thắng',
  'Vân',
];

export function generateStudentProfile(
  globalIndex: number,
  birthYear: number,
): { fullName: string; gender: Gender; dateOfBirth: Date } {
  const gender = globalIndex % 2 === 0 ? Gender.MALE : Gender.FEMALE;
  const ho = HO[globalIndex % HO.length]!;
  const tenDem =
    gender === Gender.MALE
      ? TEN_DEM_NAM[globalIndex % TEN_DEM_NAM.length]!
      : TEN_DEM_NU[globalIndex % TEN_DEM_NU.length]!;
  const ten = TEN[Math.floor(globalIndex / TEN.length) % TEN.length]!;
  const fullName = `${ho} ${tenDem} ${ten}`;

  const month = (globalIndex % 12) + 1;
  const day = (globalIndex % 27) + 1;
  const dateOfBirth = new Date(
    `${birthYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00.000Z`,
  );

  return { fullName, gender, dateOfBirth };
}

export function generateTeacherName(index: number): string {
  const gender = index % 2 === 0 ? Gender.MALE : Gender.FEMALE;
  const ho = HO[index % HO.length]!;
  const tenDem =
    gender === Gender.MALE
      ? TEN_DEM_NAM[index % TEN_DEM_NAM.length]!
      : TEN_DEM_NU[index % TEN_DEM_NU.length]!;
  const ten = TEN[(index + 3) % TEN.length]!;
  return `${ho} ${tenDem} ${ten}`;
}
