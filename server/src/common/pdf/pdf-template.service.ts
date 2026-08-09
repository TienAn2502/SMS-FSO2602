import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Injectable } from '@nestjs/common';

import type { PdfBaseLayoutParams } from '@/common/pdf/pdf.types';

@Injectable()
export class PdfTemplateService {
  private baseLayoutTemplate: string | null = null;

  renderBaseLayout(params: PdfBaseLayoutParams): string {
    const template = this.loadBaseLayoutTemplate();

    return template
      .replaceAll('{{TITLE}}', this.escapeHtml(params.title))
      .replaceAll(
        '{{SCHOOL_NAME_BLOCK}}',
        params.schoolName
          ? `<div class="school-name">${this.escapeHtml(params.schoolName)}</div>`
          : '',
      )
      .replaceAll(
        '{{SUBTITLE_BLOCK}}',
        params.subtitle
          ? `<div class="report-subtitle">${this.escapeHtml(params.subtitle)}</div>`
          : '',
      )
      .replaceAll(
        '{{ACADEMIC_YEAR_BLOCK}}',
        params.academicYearLabel
          ? `<div class="report-meta">${this.escapeHtml(params.academicYearLabel)}</div>`
          : '',
      )
      .replaceAll('{{BODY_HTML}}', params.bodyHtml)
      .replaceAll(
        '{{GENERATED_AT_BLOCK}}',
        params.generatedAtLabel
          ? `<footer class="report-footer">${this.escapeHtml(params.generatedAtLabel)}</footer>`
          : '',
      );
  }

  private loadBaseLayoutTemplate(): string {
    if (this.baseLayoutTemplate) {
      return this.baseLayoutTemplate;
    }

    const templatePath = join(__dirname, '..', '..', 'templates', 'pdf', 'base-layout.html');
    this.baseLayoutTemplate = readFileSync(templatePath, 'utf8');
    return this.baseLayoutTemplate;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
