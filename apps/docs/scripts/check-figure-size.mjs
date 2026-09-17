import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

import { chromium } from 'playwright';

// pnpm --filter @retikz/docs check:figure-size --url http://localhost:7101/kernel/components/scope/mechanism
const { values } = parseArgs({
  options: {
    url: { type: 'string' },
    figure: { type: 'string' },
    browser: { type: 'string' },
  },
});
if (!values.url) throw new Error('--url is required; point it at a running docs page');

const source = await readFile(
  new URL('../src/modules/docs/components/component-preview/constants.ts', import.meta.url),
  'utf8',
);
const sizeBlock = source.match(/export const sizeClass[^=]*=\s*\{([\s\S]*?)\};/)?.[1];
if (!sizeBlock) throw new Error('Cannot read sizeClass from the preview constants');
const sizes = [...sizeBlock.matchAll(/(\w+):\s*'([^']+)'/g)].map(([, name, classes]) => ({ name, classes }));
if (sizes.length === 0) throw new Error('No preview size classes found');

const browser = await chromium.launch({
  headless: true,
  ...(values.browser ? { executablePath: values.browser } : { channel: 'chrome' }),
});
const samples = [];
try {
  for (const language of ['zh', 'en']) {
    for (const width of [1440, 500]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } });
      try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(lang => localStorage.setItem('retikz-lang', lang), language);
        await page.goto(values.url, { waitUntil: 'networkidle' });
        await page.locator('[data-doc-content-state="ready"]').first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        const frames = page.locator('[data-slot="component-preview-frame"]');
        await frames.first().waitFor();
        for (const frame of await frames.all()) {
          const name = await frame.getAttribute('data-preview-name');
          if (values.figure && name !== values.figure) continue;
          await frame.scrollIntoViewIfNeeded();
          // 只测 SVG 图；Canvas、动画和 controls 的其它状态需要单独取样
          const svg = frame
            .locator('svg')
            .filter({ has: page.locator('text, path, rect, g') })
            .first();
          await svg.waitFor();
          await page.evaluate(
            () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))),
          );
          const measurement = await frame.evaluate((element, sizeOptions) => {
            const scene = [...element.querySelectorAll('svg')].find(
              svg => svg.hasAttribute('viewBox') && !svg.classList.contains('lucide'),
            );
            if (!scene || element.querySelector('canvas')) throw new Error('Size measurement requires an SVG preview');
            const bounds = scene.getBoundingClientRect();
            if (bounds.width <= 0 || bounds.height <= 0) throw new Error('SVG has no measurable size');
            const heights = sizeOptions.map(size => {
              const probe = document.createElement('div');
              probe.className = size.classes;
              probe.style.cssText = 'position:fixed;visibility:hidden;width:1px;pointer-events:none';
              document.body.append(probe);
              const height = probe.getBoundingClientRect().height;
              probe.remove();
              if (height <= 0) throw new Error(`Size ${size.name} has no CSS height`);
              return { size: size.name, height };
            });
            const requiredHeight = bounds.height + 40;
            const recommended = heights.find(size => size.height >= requiredHeight)?.size ?? null;
            const frameBounds = element.getBoundingClientRect();
            return {
              figureHeight: bounds.height,
              requiredHeight,
              recommended,
              heights,
              horizontalOverflow: bounds.left < frameBounds.left || bounds.right > frameBounds.right,
            };
          }, sizes);
          samples.push({ name, language, width, ...measurement });
        }
        if (errors.length) throw new Error(`${language}/${width}: ${errors.join('; ')}`);
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}
if (samples.length === 0) throw new Error('No matching figures found');

const recommendations = [...new Set(samples.map(sample => sample.name))].map(name => {
  const cases = samples.filter(sample => sample.name === name);
  if (cases.length !== 4) throw new Error(`${name}: expected four language/viewport samples, got ${cases.length}`);
  const size =
    sizes.find(candidate =>
      cases.every(
        sample =>
          !sample.horizontalOverflow &&
          sample.heights.find(entry => entry.size === candidate.name).height >= sample.requiredHeight,
      ),
    )?.name ?? null;
  return { name, size, samples: cases };
});
console.log(JSON.stringify(recommendations, null, 2));
if (recommendations.some(result => result.size === null)) process.exitCode = 1;
