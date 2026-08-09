import { Global, Module } from '@nestjs/common';

import { PdfRendererService } from '@/common/pdf/pdf-renderer.service';
import { PdfTemplateService } from '@/common/pdf/pdf-template.service';

@Global()
@Module({
  providers: [PdfRendererService, PdfTemplateService],
  exports: [PdfRendererService, PdfTemplateService],
})
export class PdfModule {}
