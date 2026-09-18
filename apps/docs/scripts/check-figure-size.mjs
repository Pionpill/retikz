import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

import { chromium } from 'playwright';

import { recommendPreviewLayout } from './figure-size-utils.mjs';

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
    for (const width of [1440]) {
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
          const openControlPanel = frame.getByRole('button', { name: 'Open controls panel' });
          if (await openControlPanel.isVisible().catch(() => false)) await openControlPanel.click();
          // 只测 SVG 图；Canvas、动画和 controls 的其它状态需要单独取样
          const svg = frame
            .locator('svg')
            .filter({ has: page.locator('text, path, rect, g') })
            .first();
          await svg.waitFor();
          await page.evaluate(
            () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))),
          );
          const measurement = await frame.evaluate(async (element, sizeOptions) => {
            const waitForLayout = () =>
              new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            const scene = [...element.querySelectorAll('svg')].find(
              svg => svg.hasAttribute('viewBox') && !svg.classList.contains('lucide'),
            );
            if (!scene || element.querySelector('canvas')) throw new Error('Size measurement requires an SVG preview');
            if (scene.getBoundingClientRect().width <= 0 || scene.getBoundingClientRect().height <= 0) {
              throw new Error('SVG has no measurable size');
            }
            const workspace = element.querySelector('[data-slot="preview-workspace"]');
            const previewPanel = [...element.querySelectorAll('div')].find(node =>
              node.classList.contains('group/preview'),
            );
            if (!workspace || !previewPanel) throw new Error('Preview workspace or panel not found');

            const sizeClasses = sizeOptions.flatMap(size => size.classes.split(' '));
            const originalClasses = [...workspace.classList];
            const controlColumns = element.querySelector('[data-slot="preview-control-columns"]');
            const controlPanel = controlColumns?.closest('[data-slot="resizable-panel"]');
            const controlFieldCount = element.querySelectorAll('[data-slot="preview-control-field"]').length;
            const measurements = [];
            for (const size of sizeOptions) {
              workspace.classList.remove(...sizeClasses);
              workspace.classList.add(...size.classes.split(' '));
              await waitForLayout();
              const figureBounds = scene.getBoundingClientRect();
              const panelBounds = previewPanel.getBoundingClientRect();
              const controlPanelOverflows =
                controlColumns !== null && controlColumns.scrollHeight > controlColumns.clientHeight + 1;
              const originalPanelStyle = controlPanel?.getAttribute('style') ?? null;
              if (controlPanel) {
                controlPanel.style.setProperty('flex', '0 0 50%', 'important');
                await waitForLayout();
              }
              const expandedPanelHasTwoColumns = controlColumns?.dataset.columnCount === '2';
              const expandedPanelOverflows =
                controlColumns !== null && controlColumns.scrollHeight > controlColumns.clientHeight + 1;
              if (controlPanel) {
                if (originalPanelStyle === null) controlPanel.removeAttribute('style');
                else controlPanel.setAttribute('style', originalPanelStyle);
                await waitForLayout();
              }
              measurements.push({
                size: size.name,
                workspaceHeight: workspace.getBoundingClientRect().height,
                figureHeight: figureBounds.height,
                panelHeight: panelBounds.height,
                controlPanelOverflows,
                expandedPanelHasTwoColumns,
                expandedPanelOverflows,
                topOverflow: Math.max(panelBounds.top - figureBounds.top, 0),
                bottomOverflow: Math.max(figureBounds.bottom - panelBounds.bottom, 0),
                fitsVertically: figureBounds.top >= panelBounds.top && figureBounds.bottom <= panelBounds.bottom,
              });
            }
            workspace.className = originalClasses.join(' ');

            const bounds = scene.getBoundingClientRect();
            const panelBounds = previewPanel.getBoundingClientRect();
            return {
              figureHeight: bounds.height,
              figureWidth: bounds.width,
              workspaceWidth: workspace.getBoundingClientRect().width,
              controlFieldCount,
              recommended: measurements.find(measurement => measurement.fitsVertically)?.size ?? null,
              measurements,
              horizontalOverflow: bounds.left < panelBounds.left || bounds.right > panelBounds.right,
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
  if (cases.length !== 2) throw new Error(`${name}: expected two language samples, got ${cases.length}`);
  const measuredSize =
    sizes.find(candidate =>
      cases.every(
        sample => sample.measurements.find(measurement => measurement.size === candidate.name)?.fitsVertically,
      ),
    )?.name ?? null;
  const layouts = cases.map(sample => {
    const raisedSize = recommendPreviewLayout({
      measuredSize,
      controlFieldCount: sample.controlFieldCount,
      controlPanelOverflows: false,
      expandedPanelHasTwoColumns: false,
      expandedPanelOverflows: false,
      figureWidth: sample.figureWidth,
      workspaceWidth: sample.workspaceWidth,
    }).size;
    const raisedMeasurement = sample.measurements.find(measurement => measurement.size === raisedSize);

    return recommendPreviewLayout({
      measuredSize,
      controlFieldCount: sample.controlFieldCount,
      controlPanelOverflows: raisedMeasurement?.controlPanelOverflows ?? false,
      expandedPanelHasTwoColumns: raisedMeasurement?.expandedPanelHasTwoColumns ?? false,
      expandedPanelOverflows: raisedMeasurement?.expandedPanelOverflows ?? false,
      figureWidth: sample.figureWidth,
      workspaceWidth: sample.workspaceWidth,
    });
  });
  const size =
    sizes
      .slice()
      .reverse()
      .find(candidate => layouts.some(layout => layout.size === candidate.name))?.name ?? null;
  const controlPanelDefaultSize = layouts.every(layout => layout.controlPanelDefaultSize === 50) ? 50 : null;

  return { name, size, controlPanelDefaultSize, samples: cases };
});
console.log(JSON.stringify(recommendations, null, 2));
if (recommendations.some(result => result.size === null)) process.exitCode = 1;
