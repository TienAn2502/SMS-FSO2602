import type { PDFOptions } from 'puppeteer';

export interface PdfRenderOptions extends Pick<
  PDFOptions,
  'format' | 'landscape' | 'margin' | 'displayHeaderFooter'
> {
  waitUntil?: 'load' | 'domcontentloaded';
}

export interface PdfBaseLayoutParams {
  title: string;
  subtitle?: string;
  schoolName?: string;
  academicYearLabel?: string;
  bodyHtml: string;
  generatedAtLabel?: string;
}

export const DEFAULT_PDF_RENDER_OPTIONS: PdfRenderOptions = {
  format: 'A4',
  landscape: false,
  margin: {
    top: '16mm',
    right: '12mm',
    bottom: '16mm',
    left: '12mm',
  },
  waitUntil: 'load',
};
