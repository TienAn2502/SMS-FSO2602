import { PdfTemplateService } from '@/common/pdf/pdf-template.service';

describe('PdfTemplateService', () => {
  const service = new PdfTemplateService();

  it('renders base layout with escaped html', () => {
    const html = service.renderBaseLayout({
      title: 'Bảng điểm <HK1>',
      schoolName: 'Trường DEMO',
      subtitle: 'Lớp 10A1',
      academicYearLabel: 'Năm học 2025-2026',
      bodyHtml: '<table class="data-table"><tr><td>OK</td></tr></table>',
      generatedAtLabel: 'In ngày 04/08/2026',
    });

    expect(html).toContain('Bảng điểm &lt;HK1&gt;');
    expect(html).toContain('Trường DEMO');
    expect(html).toContain('Be Vietnam Pro');
    expect(html).toContain('data-table');
  });
});
