import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

import type { BrowserBenchmarkOptions, BrowserBenchmarkResult, RetikzBenchWindow } from './browser-contract';

/** bench-environment.json 中与 Chromium runner 相关的冻结字段 */
export type BrowserRunnerEnvironment = Readonly<{
  browser: string;
  playwright: string;
  viewport: Readonly<{ width: number; height: number; devicePixelRatio: number }>;
  animations: boolean;
  font: string;
  locale: string;
  timezone: string;
}>;

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** 返回与交互式 Performance Lab 隔离的无头 runner 页面 */
export const getBrowserRunnerPath = (): '/runner.html' => '/runner.html';

/** 读取并校验固定 bench 服务端口 */
export const readBenchPort = (): number => {
  const port = Number(process.env.RETIKZ_BENCH_PORT ?? 5175);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('RETIKZ_BENCH_PORT must be an integer between 1 and 65535');
  }
  return port;
};

/** 读取 lockfile 安装的 Playwright 版本 */
const readPlaywrightVersion = (): string => {
  const packageJson = JSON.parse(
    readFileSync(resolve(appRoot, 'node_modules/playwright/package.json'), 'utf8'),
  ) as Readonly<{ version?: unknown }>;
  if (typeof packageJson.version !== 'string') throw new Error('playwright package version is unavailable');
  return packageJson.version;
};

/** 拒绝与冻结配置不一致的 browser 执行环境 */
const assertBrowserEnvironment = (
  expected: BrowserRunnerEnvironment,
  actual: BrowserBenchmarkResult['environment'],
): void => {
  if (expected.browser !== 'chromium') throw new Error(`unsupported bench browser: ${expected.browser}`);
  if (readPlaywrightVersion() !== expected.playwright) {
    throw new Error(`bench environment mismatch: expected Playwright ${expected.playwright}`);
  }
  if (
    actual.viewport.width !== expected.viewport.width ||
    actual.viewport.height !== expected.viewport.height ||
    actual.devicePixelRatio !== expected.viewport.devicePixelRatio
  ) {
    throw new Error('bench browser viewport or devicePixelRatio mismatch');
  }
  if (actual.language !== expected.locale || actual.timezone !== expected.timezone) {
    throw new Error('bench browser locale or timezone mismatch');
  }
  if (!Number.isSafeInteger(actual.hardwareConcurrency) || actual.hardwareConcurrency <= 0) {
    throw new Error('bench browser hardwareConcurrency is unavailable');
  }
  if (!actual.reducedMotion || expected.animations || !actual.fontAvailable || expected.font !== 'Arial') {
    throw new Error('bench browser motion or font environment mismatch');
  }
};

/** 在固定 Vite + Chromium 环境中运行 browser benchmark */
export const runBrowserBenchmark = async (
  environment: BrowserRunnerEnvironment,
  options: Omit<BrowserBenchmarkOptions, 'browserVersion'>,
): Promise<BrowserBenchmarkResult> => {
  const port = readBenchPort();
  const server = await createServer({
    root: appRoot,
    configFile: resolve(appRoot, 'vite.config.ts'),
    server: { host: '127.0.0.1', open: false, port, strictPort: true },
  });
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    await server.listen();
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: environment.viewport.width, height: environment.viewport.height },
      deviceScaleFactor: environment.viewport.devicePixelRatio,
      locale: environment.locale,
      timezoneId: environment.timezone,
      reducedMotion: 'reduce',
      colorScheme: 'light',
    });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port.toString()}${getBrowserRunnerPath()}`, {
      waitUntil: 'networkidle',
    });
    const browserVersion = browser.version();
    const result = await page.evaluate(
      browserOptions => {
        const entry = (window as RetikzBenchWindow).retikzBench;
        if (entry === undefined) throw new Error('browser benchmark entry is unavailable');
        return entry.run(browserOptions);
      },
      { ...options, browserVersion },
    );
    assertBrowserEnvironment(environment, result.environment);
    await context.close();
    return result;
  } catch (error) {
    if (error instanceof Error && /Executable doesn't exist|browserType\.launch/.test(error.message)) {
      throw new Error('Chromium is not installed; run pnpm bench:install-browser', { cause: error });
    }
    throw error;
  } finally {
    await browser?.close();
    await server.close();
  }
};
