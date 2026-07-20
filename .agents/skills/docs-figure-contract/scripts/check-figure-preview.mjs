import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';

import { chromium } from 'playwright';

const DEFAULT_VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'narrow', width: 500, height: 900 },
];

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

const findBrowserExecutable = async () => {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // 继续检查下一个常见安装位置
    }
  }

  throw new Error('Cannot find a local Chrome or Edge executable');
};

const collectPreviewMetrics = preview => {
  const isInside = (inner, outer, tolerance = 1) =>
    inner.left >= outer.left - tolerance &&
    inner.top >= outer.top - tolerance &&
    inner.right <= outer.right + tolerance &&
    inner.bottom <= outer.bottom + tolerance;

  const toRect = element => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    };
  };

  const svg = preview.querySelector('svg');
  if (!svg) throw new Error('Preview does not contain an SVG');

  const renderPane = svg.parentElement;
  const card = toRect(preview);
  const svgRect = toRect(svg);
  const pane = toRect(renderPane);
  const nodes = Array.from(svg.querySelectorAll('[data-retikz-id]')).map(element => ({
    id: element.getAttribute('data-retikz-id'),
    rect: toRect(element),
  }));
  const overlaps = [];

  for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
      const left = nodes[leftIndex];
      const right = nodes[rightIndex];
      const width = Math.min(left.rect.right, right.rect.right) - Math.max(left.rect.left, right.rect.left);
      const height = Math.min(left.rect.bottom, right.rect.bottom) - Math.max(left.rect.top, right.rect.top);

      if (width <= 1 || height <= 1) continue;
      if (isInside(left.rect, right.rect) || isInside(right.rect, left.rect)) continue;

      overlaps.push({ left: left.id, right: right.id, width, height });
    }
  }

  return {
    card,
    pane,
    svg: svgRect,
    horizontalOverflow: preview.scrollWidth !== preview.clientWidth,
    svgOutsideCard: !isInside(svgRect, card),
    overlaps,
  };
};

/**
 * 在真实文档页中检查同一叙述图的中英文与桌面 / 窄屏布局
 *
 * 通过 Codex Node REPL 导入本模块；该运行时提供 Playwright
 */
export const checkFigurePreview = async options => {
  const {
    url,
    headingByLanguage,
    outputDir = path.resolve('notes/reports/figure-preview'),
    viewports = DEFAULT_VIEWPORTS,
  } = options;

  if (!url) throw new Error('url is required');
  if (!headingByLanguage?.zh || !headingByLanguage?.en) {
    throw new Error('headingByLanguage.zh and headingByLanguage.en are required');
  }

  const executablePath = await findBrowserExecutable();
  await mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ executablePath, headless: true });
  const results = [];

  try {
    for (const language of ['zh', 'en']) {
      for (const viewport of viewports) {
        const context = await browser.newContext({ viewport });
        const page = await context.newPage();
        const pageErrors = [];

        page.on('pageerror', error => pageErrors.push(error.message));
        await page.addInitScript(value => localStorage.setItem('retikz-lang', value), language);
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        const heading = page.getByRole('heading', {
          name: headingByLanguage[language],
          exact: true,
        });
        await heading.waitFor({ state: 'visible' });

        const preview = heading.locator('xpath=following-sibling::div[1]');
        await preview.waitFor({ state: 'visible' });
        const metrics = await preview.evaluate(collectPreviewMetrics);
        const screenshotPath = path.join(outputDir, `${language}-${viewport.name}.png`);
        await preview.screenshot({ path: screenshotPath });

        results.push({
          language,
          viewport,
          screenshotPath,
          pageErrors,
          ...metrics,
          ok:
            pageErrors.length === 0 &&
            !metrics.horizontalOverflow &&
            !metrics.svgOutsideCard &&
            metrics.overlaps.length === 0,
        });

        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  return results;
};
