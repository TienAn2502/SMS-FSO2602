import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import puppeteer from 'puppeteer';

const WINDOWS_CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  join(homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe'),
];

const MACOS_CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  join(homedir(), 'Applications', 'Google Chrome.app', 'Contents', 'MacOS', 'Google Chrome'),
];

const LINUX_CHROME_PATHS = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

function getSystemChromeCandidates(): string[] {
  switch (process.platform) {
    case 'win32':
      return WINDOWS_CHROME_PATHS;
    case 'darwin':
      return MACOS_CHROME_PATHS;
    default:
      return LINUX_CHROME_PATHS;
  }
}

function findExistingPath(candidates: string[]): string | undefined {
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

export async function resolvePuppeteerExecutablePath(
  configuredPath?: string,
): Promise<string | undefined> {
  const trimmed = configuredPath?.trim();
  if (trimmed) {
    return trimmed;
  }

  try {
    const bundledPath = await puppeteer.executablePath();
    if (bundledPath && existsSync(bundledPath)) {
      return bundledPath;
    }
  } catch {
    // Bundled browser chưa được cài — thử Chrome hệ thống.
  }

  return findExistingPath(getSystemChromeCandidates());
}

export const PUPPETEER_BROWSER_INSTALL_HINT =
  'Cài Chrome cho Puppeteer: `cd server && npx puppeteer browsers install chrome`, hoặc đặt PUPPETEER_EXECUTABLE_PATH trỏ tới chrome.exe';
