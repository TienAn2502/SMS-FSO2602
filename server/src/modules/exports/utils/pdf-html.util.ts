import type { SpreadsheetColumnDef } from '@/common/files/file-format.types';

export interface PdfTableColumn {
  header: string;
  key: string;
  align?: 'left' | 'center' | 'right';
}

export function escapePdfHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatPdfGeneratedAtLabel(): string {
  return `Ngày xuất: ${new Date().toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
  })}`;
}

export function buildMetadataBlockHtml(
  lines: Array<{ label: string; value: string }>,
): string {
  if (lines.length === 0) {
    return '';
  }

  const items = lines
    .map(
      (line) =>
        `<div><strong>${escapePdfHtml(line.label)}:</strong> ${escapePdfHtml(line.value)}</div>`,
    )
    .join('');

  return `<div class="info-block">${items}</div>`;
}

export function buildDataTableHtml(
  columns: PdfTableColumn[],
  rows: Record<string, string>[],
  options?: { compact?: boolean; stt?: boolean },
): string {
  const tableClass = options?.compact
    ? 'data-table compact'
    : 'data-table';

  const headerCells = options?.stt
    ? `<th class="num">STT</th>${columns
        .map(
          (column) =>
            `<th style="text-align:${column.align ?? 'left'}">${escapePdfHtml(column.header)}</th>`,
        )
        .join('')}`
    : columns
        .map(
          (column) =>
            `<th style="text-align:${column.align ?? 'left'}">${escapePdfHtml(column.header)}</th>`,
        )
        .join('');

  const bodyRows = rows
    .map((row, index) => {
      const cells = options?.stt
        ? `<td class="num">${index + 1}</td>${columns
            .map((column) => formatTableCell(row[column.key] ?? '', column.align))
            .join('')}`
        : columns
            .map((column) =>
              formatTableCell(row[column.key] ?? '', column.align),
            )
            .join('');

      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `<table class="${tableClass}"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
}

export function buildTimetableMatrixHtml(
  columns: SpreadsheetColumnDef[],
  rows: Record<string, string>[],
): string {
  const headerCells = columns
    .map((column, index) => {
      const className =
        index === 0 ? 'period-col' : 'matrix-col';
      return `<th class="${className}">${escapePdfHtml(column.header)}</th>`;
    })
    .join('');

  const bodyRows = rows
    .map((row) => {
      const cells = columns
        .map((column, index) => {
          const value = row[column.key] ?? '';
          const className =
            index === 0
              ? 'period-col'
              : 'matrix-cell';
          return `<td class="${className}">${escapePdfHtml(value)}</td>`;
        })
        .join('');

      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `<table class="data-table matrix-table"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
}

export function buildPageBreakHtml(): string {
  return '<div class="page-break"></div>';
}

export function buildDraftWatermarkHtml(): string {
  return '<div class="draft-watermark">BẢN NHÁP</div>';
}

function formatTableCell(value: string, align?: 'left' | 'center' | 'right'): string {
  const className = align === 'center' ? ' class="num"' : '';
  return `<td${className}>${escapePdfHtml(value)}</td>`;
}
