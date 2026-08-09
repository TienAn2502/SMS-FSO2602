import {
  HttpStatus,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer, { type Browser } from 'puppeteer';

import type { EnvConfig } from '@/common/config/env.schema';
import { AppException } from '@/common/exceptions/app.exception';
import {
  PUPPETEER_BROWSER_INSTALL_HINT,
  resolvePuppeteerExecutablePath,
} from '@/common/pdf/resolve-puppeteer-executable.util';
import {
  DEFAULT_PDF_RENDER_OPTIONS,
  type PdfRenderOptions,
} from '@/common/pdf/pdf.types';

@Injectable()
export class PdfRendererService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PdfRendererService.name);
  private browser: Browser | null = null;
  private launching: Promise<Browser> | null = null;

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {}

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    try {
      await this.getBrowser();
      this.logger.log('Puppeteer browser ready');
    } catch (error: unknown) {
      this.logger.warn(
        `Puppeteer chưa sẵn sàng lúc khởi động: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async renderHtmlToPdf(
    html: string,
    options: PdfRenderOptions = {},
  ): Promise<Buffer> {
    let browser: Browser;

    try {
      browser = await this.getBrowser();
    } catch (error: unknown) {
      throw new AppException(
        'PDF_BROWSER_UNAVAILABLE',
        error instanceof Error
          ? `${error.message}\n${PUPPETEER_BROWSER_INSTALL_HINT}`
          : PUPPETEER_BROWSER_INSTALL_HINT,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const page = await browser.newPage();

    try {
      const merged = { ...DEFAULT_PDF_RENDER_OPTIONS, ...options };
      await page.setContent(html, { waitUntil: merged.waitUntil ?? 'load' });
      await page.evaluate(() => document.fonts.ready);

      const pdf = await page.pdf({
        format: merged.format,
        landscape: merged.landscape,
        margin: merged.margin,
        printBackground: true,
        displayHeaderFooter: merged.displayHeaderFooter,
      });

      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser?.connected) {
      return this.browser;
    }

    if (this.launching) {
      return this.launching;
    }

    this.launching = this.launchBrowser();
    this.browser = await this.launching;
    this.launching = null;
    return this.browser;
  }

  private async launchBrowser(): Promise<Browser> {
    const configuredPath = this.configService.get('PUPPETEER_EXECUTABLE_PATH', {
      infer: true,
    });
    const executablePath = await resolvePuppeteerExecutablePath(configuredPath);

    if (!executablePath) {
      throw new Error(
        `Không tìm thấy trình duyệt Chrome/Chromium. ${PUPPETEER_BROWSER_INSTALL_HINT}`,
      );
    }

    this.logger.log(`Puppeteer dùng Chrome tại: ${executablePath}`);

    return puppeteer.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
}
