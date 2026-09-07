import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';
import { preview } from 'vite';

const docsRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workerCount = 4;

const getServerUrl = server => {
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Docs runtime server did not expose a TCP address');
  return `http://127.0.0.1:${address.port.toString()}${server.config.base.replace(/\/$/, '')}`;
};

const getRouteChecks = manifest =>
  manifest.flatMap(entry =>
    ['zh', 'en'].map(lang => ({
      language: lang,
      path: entry.path,
      expectsFallback: entry.content[lang] === undefined,
    })),
  );

const getPageFailure = async ({ page, pageErrors, check }) => {
  const errorBoundary = await page.getByText('页面渲染异常', { exact: true }).count();
  if (errorBoundary > 0) return 'global ErrorBoundary rendered';

  if (pageErrors.length > 0) return `unhandled page error: ${pageErrors.join(' | ')}`;

  let content;
  try {
    content = await page.locator('[data-doc-content-state]:visible').last().innerText({ timeout: 1_000 });
  } catch {
    return 'document content unmounted after becoming ready';
  }
  if (/页面内容暂未提供|Content is not available yet/.test(content)) return 'document content was unavailable';
  if (check.expectsFallback && !/尚未翻译|not translated yet/i.test(content)) {
    return 'English fallback was expected but not identified as fallback';
  }
  return undefined;
};

const waitForPageResult = async page => {
  const completed = page.locator('[data-doc-content-state="ready"]:visible, [data-doc-content-state="error"]:visible');
  const errorBoundary = page.getByText('页面渲染异常', { exact: true });
  await Promise.race([
    completed.first().waitFor({ state: 'visible', timeout: 10_000 }),
    errorBoundary.waitFor({ state: 'visible', timeout: 10_000 }),
  ]);
};

const checkLanguage = async ({ browser, checks, language, serverUrl }) => {
  const context = await browser.newContext({ locale: language === 'zh' ? 'zh-CN' : 'en-US' });
  const failures = [];
  try {
    await context.addInitScript(selectedLanguage => {
      if (location.protocol === 'http:' || location.protocol === 'https:') {
        localStorage.setItem('retikz-lang', selectedLanguage);
      }
    }, language);

    const languageChecks = checks.filter(candidate => candidate.language === language);
    let nextIndex = 0;
    let completed = 0;
    const checkOne = async () => {
      const index = nextIndex;
      nextIndex += 1;
      const check = languageChecks[index];
      if (check === undefined) return;
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      try {
        await page.goto(`${serverUrl}${check.path}`, { waitUntil: 'domcontentloaded' });
        await page.getByRole('heading', { level: 1 }).waitFor({ state: 'visible' });
        await waitForPageResult(page);
        const failure = await getPageFailure({ page, pageErrors, check });
        if (failure) failures.push(`${language} ${check.path}: ${failure}`);
      } catch (error) {
        failures.push(`${language} ${check.path}: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        await page.close();
        completed += 1;
        if (completed % 25 === 0 || completed === languageChecks.length) {
          console.log(`Docs runtime ${language}: ${completed}/${languageChecks.length} routes checked.`);
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(workerCount, languageChecks.length) }, async () => {
        while (nextIndex < languageChecks.length) await checkOne();
      }),
    );
  } finally {
    await context.close();
  }
  return failures;
};

const start = performance.now();
const manifestPath = resolve(docsRoot, 'dist', 'llms', 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const server = await preview({
  root: docsRoot,
  configFile: resolve(docsRoot, 'vite.config.ts'),
  base: '/retikz/',
  logLevel: 'silent',
  preview: { host: '127.0.0.1', port: 0, strictPort: true },
});
let browser;
try {
  const checks = getRouteChecks(manifest);
  const serverUrl = getServerUrl(server);
  browser = await chromium.launch({ headless: true });
  console.log(`Docs runtime check: ${checks.length} route-language checks with ${workerCount} workers.`);

  const failures = [];
  for (const language of ['zh', 'en']) {
    failures.push(...(await checkLanguage({ browser, checks, language, serverUrl })));
  }

  const elapsedSeconds = ((performance.now() - start) / 1_000).toFixed(2);
  if (failures.length > 0) {
    throw new Error(
      `Docs runtime check failed (${checks.length} route-language checks, ${elapsedSeconds}s):\n${failures.join('\n')}`,
    );
  }
  console.log(`Docs runtime check passed (${checks.length} route-language checks, ${elapsedSeconds}s).`);
} catch (error) {
  if (error instanceof Error && /Executable doesn't exist|browserType\.launch/.test(error.message)) {
    throw new Error('Chromium is not installed; run pnpm bench:install-browser', { cause: error });
  }
  throw error;
} finally {
  await browser?.close();
  await server.close();
}
