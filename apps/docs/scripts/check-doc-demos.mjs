import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { chromium } from 'playwright';
import { preview } from 'vite';

const docsRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { values } = parseArgs({
  options: {
    path: { type: 'string' },
    lang: { type: 'string' },
    timeout: { type: 'string', default: '15000' },
    report: { type: 'string', default: '../../notes/reports/docs-demos.json' },
    help: { type: 'boolean' },
  },
});
if (values.help) {
  console.log(
    'check:demos [--path /library/standard] [--lang zh|en] [--timeout 15000] [--report path]\nRequires check:build first. Checks default demo states serially; controls combinations are not enumerated.',
  );
  process.exit(0);
}
const timeout = Number(values.timeout);
if (!Number.isFinite(timeout) || timeout <= 0) throw new Error('--timeout must be a positive number');
if (values.lang && !['zh', 'en'].includes(values.lang)) throw new Error('--lang must be zh or en');
const manifest = JSON.parse(readFileSync(resolve(docsRoot, 'dist/llms/manifest.json'), 'utf8'));
const routes = manifest.filter(entry => !values.path || entry.path.startsWith(values.path));
if (routes.length === 0) throw new Error('No routes matched --path');
const reportPath = resolve(docsRoot, values.report);
const report = { startedAt: new Date().toISOString(), completed: false, routes: [], summary: {} };
const saveReport = () => {
  const demos = report.routes.flatMap(route => route.demos);
  report.summary = {
    routes: report.routes.length,
    demos: demos.length,
    passed: demos.filter(demo => demo.status === 'passed').length,
    failed: demos.filter(demo => demo.status === 'failed').length,
    blocked: demos.filter(demo => demo.status === 'blocked').length,
    routeFailures: report.routes.filter(route => route.errors.length > 0).length,
  };
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
};

/** 只检查实际绘图区，避免把工具栏图标误认为 demo 渲染产物 */
const readDemo = async demo =>
  demo.evaluate(element => {
    const error = element.querySelector('[data-demo-error], [role="alert"]');
    if (error) return { error: error.textContent?.trim() || 'Demo error boundary rendered' };
    const pane = element.matches('[data-demo-render]') ? element : element.querySelector('[data-demo-render]');
    if (!pane) return { ready: false };
    const graphics = [...pane.querySelectorAll('svg, canvas')].filter(node => {
      const box = node.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    });
    return { ready: graphics.length > 0, graphics: graphics.length };
  });

/** 等待可见绘图产物或明确错误；空容器和无限加载不能通过 */
const checkDemo = async demo => {
  await demo.scrollIntoViewIfNeeded();
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const state = await readDemo(demo);
    if (state.error) throw new Error(state.error);
    if (state.ready) {
      // 允许已调度的 Effect、字体测量及异步编译错误进入错误边界
      await demo.page().waitForTimeout(500);
      const settled = await readDemo(demo);
      if (settled.error) throw new Error(settled.error);
      if (settled.ready) return settled;
    }
    await demo.page().waitForTimeout(100);
  }
  throw new Error(`No visible SVG/Canvas render output within ${timeout}ms`);
};

const server = await preview({
  root: docsRoot,
  configFile: resolve(docsRoot, 'vite.config.ts'),
  base: '/retikz/',
  logLevel: 'silent',
  preview: { host: '127.0.0.1', port: 0, strictPort: true },
});
let browser;
try {
  const address = server.httpServer.address();
  const serverUrl = `http://127.0.0.1:${address.port}${server.config.base.replace(/\/$/, '')}`;
  browser = await chromium.launch({ headless: true });
  for (const language of values.lang ? [values.lang] : ['zh', 'en']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(lang => localStorage.setItem('retikz-lang', lang), language);
    try {
      for (const route of routes) {
        const page = await context.newPage();
        page.setDefaultTimeout(timeout);
        const result = { path: route.path, language, demos: [], errors: [] };
        report.routes.push(result);
        page.on('pageerror', error => result.errors.push(error.stack ?? error.message));
        page.on('console', message => {
          if (message.type() === 'error') result.errors.push(`console.error: ${message.text()}`);
        });
        try {
          await page.goto(`${serverUrl}${route.path}`, { waitUntil: 'domcontentloaded' });
          const content = page.locator('[data-doc-content-state]:visible').first();
          await page
            .locator('[data-doc-content-state="ready"]:visible, [data-doc-content-state="error"]:visible')
            .first()
            .waitFor();
          if ((await content.getAttribute('data-doc-content-state')) === 'error') {
            throw new Error(`Document failed to render: ${await content.innerText()}`);
          }
          const demos = page.locator('[data-demo-name]');
          const count = await demos.count();
          if (
            count !== (await page.locator('[data-preview-viewport], [data-slot="component-preview-thumbnail"]').count())
          ) {
            throw new Error('Build is missing demo markers; run check:build before check:demos');
          }
          result.demos = await demos.evaluateAll(elements =>
            elements.map((element, index) => ({
              index,
              name: element.getAttribute('data-demo-name'),
              status: 'blocked',
              error: 'Page failed before this demo could be checked',
            })),
          );
          for (const item of result.demos) {
            const { index } = item;
            const demo = demos.nth(index);
            if ((await demos.count()) !== count) throw new Error('Page unmounted before all demos could be checked');
            try {
              if (!(await demo.isVisible())) await page.setViewportSize({ width: 390, height: 844 });
              if (!(await demo.isVisible())) throw new Error('Demo is hidden in both desktop and mobile viewports');
              item.viewport = page.viewportSize();
              Object.assign(item, await checkDemo(demo), { status: 'passed' });
              delete item.error;
            } catch (error) {
              item.status = (await demo.count()) === 0 ? 'blocked' : 'failed';
              item.error = error instanceof Error ? error.message : String(error);
              console.error(`FAIL ${language} ${route.path} #${index} ${item.name}: ${item.error.slice(0, 250)}`);
            } finally {
              await page.setViewportSize({ width: 1440, height: 1000 });
            }
          }
          // 捕获检查其它 demo 期间才出现的异步错误
          for (const item of result.demos) {
            const state = await readDemo(demos.nth(item.index));
            if (state.error) Object.assign(item, { status: 'failed', error: state.error });
          }
          if (
            route.content[language] === undefined &&
            !/尚未翻译|not translated yet/i.test(
              await page.locator('[data-doc-content-state="ready"]:visible').first().innerText(),
            )
          ) {
            result.errors.push('Expected language fallback notice was missing');
          }
        } catch (error) {
          result.errors.push(error instanceof Error ? error.message : String(error));
        } finally {
          await page.close();
          saveReport();
          console.log(
            `${language} ${route.path}: ${result.demos.length} demos, ${result.demos.filter(demo => demo.status === 'failed').length} failed, ${result.errors.length} page errors (${report.routes.length}/${routes.length * (values.lang ? 1 : 2)} routes)`,
          );
        }
      }
    } finally {
      await context.close();
    }
  }
  report.completed = true;
  report.finishedAt = new Date().toISOString();
} finally {
  saveReport();
  await browser?.close();
  await server.close();
}
console.log(`Demo check: ${JSON.stringify(report.summary)}\nReport: ${reportPath}`);
if (report.summary.failed || report.summary.blocked || report.summary.routeFailures) process.exitCode = 1;
