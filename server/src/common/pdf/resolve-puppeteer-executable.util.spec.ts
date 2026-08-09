import { existsSync } from 'node:fs';

import puppeteer from 'puppeteer';

import { resolvePuppeteerExecutablePath } from '@/common/pdf/resolve-puppeteer-executable.util';

jest.mock('puppeteer', () => ({
  executablePath: jest.fn(),
}));

jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
}));

describe('resolvePuppeteerExecutablePath', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ưu tiên đường dẫn cấu hình', async () => {
    await expect(
      resolvePuppeteerExecutablePath('C:\\custom\\chrome.exe'),
    ).resolves.toBe('C:\\custom\\chrome.exe');
  });

  it('dùng Chrome bundled của Puppeteer nếu đã cài', async () => {
    jest
      .mocked(puppeteer.executablePath)
      .mockResolvedValue('C:\\cache\\chrome.exe');
    jest
      .mocked(existsSync)
      .mockImplementation((path) => path === 'C:\\cache\\chrome.exe');

    await expect(resolvePuppeteerExecutablePath()).resolves.toBe(
      'C:\\cache\\chrome.exe',
    );
  });

  it('fallback sang Chrome hệ thống trên Windows', async () => {
    jest.mocked(puppeteer.executablePath).mockRejectedValue(
      new Error('not installed'),
    );
    jest
      .mocked(existsSync)
      .mockImplementation(
        (path) =>
          path ===
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      );

    await expect(resolvePuppeteerExecutablePath()).resolves.toBe(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    );
  });
});
