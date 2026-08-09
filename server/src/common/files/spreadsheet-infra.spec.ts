import { detectImportFileFormat } from '@/common/files/detect-file-format.util';
import { createCsvBuffer } from '@/common/files/csv-writer.util';
import { parseCsvBuffer } from '@/common/files/parse-csv.util';
import { CSV_UTF8_BOM } from '@/common/files/spreadsheet.constants';
import { WorkbookBuilder } from '@/common/files/workbook-builder.util';

describe('spreadsheet infrastructure', () => {
  describe('detectImportFileFormat', () => {
    it('detects csv by extension', () => {
      expect(
        detectImportFileFormat({
          originalname: 'students.csv',
          mimetype: 'application/octet-stream',
        } as Express.Multer.File),
      ).toBe('csv');
    });

    it('detects xlsx by mime type', () => {
      expect(
        detectImportFileFormat({
          originalname: 'upload.bin',
          mimetype:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        } as Express.Multer.File),
      ).toBe('xlsx');
    });
  });

  describe('parseCsvBuffer', () => {
    it('parses UTF-8 CSV with header row', () => {
      const buffer = Buffer.from(
        `${CSV_UTF8_BOM}ho_ten,ngay_sinh\nNguyen Van A,2010-05-12\n`,
        'utf8',
      );

      const parsed = parseCsvBuffer(buffer);

      expect(parsed.headers).toEqual(['ho_ten', 'ngay_sinh']);
      expect(parsed.rows).toHaveLength(1);
      expect(parsed.rows[0].rowNumber).toBe(2);
      expect(parsed.rows[0].data).toEqual({
        ho_ten: 'Nguyen Van A',
        ngay_sinh: '2010-05-12',
      });
    });
  });

  describe('createCsvBuffer', () => {
    it('writes CSV with UTF-8 BOM', () => {
      const buffer = createCsvBuffer({
        columns: [
          { header: 'Họ tên', key: 'fullName' },
          { header: 'Lớp', key: 'classCode' },
        ],
        rows: [{ fullName: 'Trần B', classCode: '10A1' }],
      });

      const text = buffer.toString('utf8');
      expect(text.startsWith(CSV_UTF8_BOM)).toBe(true);
      expect(text).toContain('Họ tên');
      expect(text).toContain('Trần B');
    });
  });

  describe('WorkbookBuilder', () => {
    it('builds xlsx buffer with header styling', async () => {
      const builder = new WorkbookBuilder();
      builder.addSheetFromRows(
        'Danh sach',
        [
          { header: 'Họ tên', key: 'fullName' },
          { header: 'Lớp', key: 'classCode' },
        ],
        [{ fullName: 'Le Van C', classCode: '10A2' }],
      );

      const buffer = await builder.toBuffer();
      expect(buffer.byteLength).toBeGreaterThan(0);
      expect(buffer.subarray(0, 2).toString()).toBe('PK');
    });

    it('builds xlsx buffer with metadata preamble rows', async () => {
      const builder = new WorkbookBuilder();
      builder.addSheetFromRowsWithMetadata(
        'Danh sach',
        [{ header: 'Họ tên', key: 'fullName' }],
        [{ fullName: 'Le Van C' }],
        {
          title: 'DANH SACH HOC SINH',
          lines: [{ label: 'Nam hoc', value: '2025-2026' }],
        },
      );

      const buffer = await builder.toBuffer();
      expect(buffer.byteLength).toBeGreaterThan(0);
    });
  });
});
