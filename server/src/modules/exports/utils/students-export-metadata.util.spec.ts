import { buildStudentsExportMetadata } from '@/modules/exports/utils/students-export-metadata.util';

describe('buildStudentsExportMetadata', () => {
  it('builds metadata lines with filter labels', async () => {
    const prisma = {
      school: {
        findFirst: jest.fn().mockResolvedValue({ name: 'Trường THPT Demo' }),
      },
      academicYear: {
        findFirst: jest.fn().mockResolvedValue({ name: '2025-2026' }),
      },
      semester: {
        findFirst: jest.fn().mockResolvedValue({ name: 'Học kỳ 1' }),
      },
      homeroomClass: {
        findFirst: jest.fn().mockResolvedValue({ code: '10A1', name: '10A1' }),
      },
    } as never;

    const metadata = await buildStudentsExportMetadata(
      prisma,
      'school-id',
      {
        format: 'xlsx',
        academicYearId: 'year-id',
        semesterId: 'semester-id',
        homeroomClassId: 'class-id',
        status: 'ACTIVE',
        search: 'Nguyen',
        sortBy: 'fullName',
        sortOrder: 'asc',
      },
      28,
    );

    expect(metadata.title).toBe('DANH SÁCH HỌC SINH');
    expect(metadata.lines).toEqual(
      expect.arrayContaining([
        { label: 'Trường', value: 'Trường THPT Demo' },
        { label: 'Năm học', value: '2025-2026' },
        { label: 'Học kỳ', value: 'Học kỳ 1' },
        { label: 'Lớp hành chính', value: '10A1 (10A1)' },
        { label: 'Trạng thái học sinh', value: 'Đang học' },
        { label: 'Tìm kiếm', value: 'Nguyen' },
        { label: 'Tổng số học sinh', value: '28' },
      ]),
    );
  });
});
