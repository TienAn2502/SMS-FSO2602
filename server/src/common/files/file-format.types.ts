export type ImportFileFormat = 'xlsx' | 'csv';

export interface ParsedSpreadsheetRow {
  /** Số dòng trong file (1-based; dòng 1 = header) */
  rowNumber: number;
  data: Record<string, string>;
}

// Kết quả phân tích file
export interface ParsedSpreadsheet {
  format: ImportFileFormat;
  headers: string[];
  rows: ParsedSpreadsheetRow[];
}

export interface ParseUploadedFileOptions {
  maxBytes: number;
  maxRows: number;
  /** Tên sheet (chỉ XLSX). Mặc định sheet đầu tiên. */
  sheetName?: string;
  /** Tìm dòng header chứa cột này (vd. ma_hs) thay vì luôn dùng dòng 1. */
  headerMarker?: string;
}

export interface SpreadsheetColumnDef {
  header: string;
  key: string;
  width?: number;
}

export interface SpreadsheetMetadataLine {
  label: string;
  value: string;
}

export interface SpreadsheetSheetMetadata {
  title: string;
  lines: SpreadsheetMetadataLine[];
}
