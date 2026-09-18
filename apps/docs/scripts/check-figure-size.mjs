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
            const CONTROL_PANEL_SIZES = [25, 50];
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
            const controlFieldCount =
              controlColumns?.querySelectorAll('[data-slot="preview-control-field"]').length ?? 0;
            const controlGroupCount = controlColumns?.querySelectorAll('section').length ?? 0;
            const originalControlPanelStyle = controlPanel?.getAttribute('style') ?? null;
            const measurements = [];
            for (const size of sizeOptions) {
              workspace.classList.remove(...sizeClasses);
              workspace.classList.add(...size.classes.split(' '));
              const controls = [];
              for (const panelSize of CONTROL_PANEL_SIZES) {
                if (controlPanel) {
                  controlPanel.style.setProperty('flex', `0 0 ${panelSize}%`, 'important');
                }
                await waitForLayout();
                if (!controlColumns || !controlPanel) continue;
                const columnsStyle = getComputedStyle(controlColumns);
                const firstSection = controlColumns.querySelector('section');
                const sectionStyle = firstSection ? getComputedStyle(firstSection) : null;
                const itemGap =
                  [...controlColumns.querySelectorAll('[data-slot="preview-control-field"]')]
                    .slice(1)
                    .map(field => getComputedStyle(field).marginTop)
                    .find(marginTop => marginTop !== '0px') ?? '0px';
                const viewportHeight = controlColumns.clientHeight;
                const scrollHeight = controlColumns.scrollHeight;
                const remainingOverflow = Math.max(scrollHeight - viewportHeight, 0);
                controls.push({
                  panelSize,
                  panelWidth: controlPanel.getBoundingClientRect().width,
                  columnCount: Number(controlColumns.dataset.columnCount ?? '1'),
                  fieldCount: controlFieldCount,
                  groupCount: controlGroupCount,
                  columnGap: columnsStyle.columnGap,
                  rowGap: columnsStyle.rowGap,
                  sectionGap: sectionStyle?.marginBottom ?? null,
                  itemGap,
                  viewportHeight,
                  scrollHeight,
                  remainingOverflow,
                  requiredWorkspaceHeight: workspace.getBoundingClientRect().height + remainingOverflow,
                });
              }
              if (controlPanel) {
                controlPanel.style.setProperty('flex', '0 0 25%', 'important');
                await waitForLayout();
              }
              await waitForLayout();
              const figureBounds = scene.getBoundingClientRect();
              const panelBounds = previewPanel.getBoundingClientRect();
              measurements.push({
                size: size.name,
                workspaceHeight: workspace.getBoundingClientRect().height,
                workspaceWidth: workspace.getBoundingClientRect().width,
                figureHeight: figureBounds.height,
                figureWidth: figureBounds.width,
                panelHeight: panelBounds.height,
                controls,
                topOverflow: Math.max(panelBounds.top - figureBounds.top, 0),
                bottomOverflow: Math.max(figureBounds.bottom - panelBounds.bottom, 0),
                fitsVertically: figureBounds.top >= panelBounds.top && figureBounds.bottom <= panelBounds.bottom,
              });
            }
            workspace.className = originalClasses.join(' ');
            if (controlPanel) {
              if (originalControlPanelStyle === null) controlPanel.removeAttribute('style');
              else controlPanel.setAttribute('style', originalControlPanelStyle);
              await waitForLayout();
            }

            const bounds = scene.getBoundingClientRect();
            const panelBounds = previewPanel.getBoundingClientRect();
            return {
              figureHeight: bounds.height,
              figureWidth: bounds.width,
              workspaceWidth: workspace.getBoundingClientRect().width,
              controlFieldCount,
              controlGroupCount,
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
  const layouts = cases.map(sample => recommendPreviewLayout({ measuredSize, measurements: sample.measurements }));
  const size =
    sizes
      .slice()
      .reverse()
      .find(candidate => layouts.some(layout => layout.size === candidate.name))?.name ?? null;
  const controlPanelDefaultSize = layouts.every(layout => layout.controlPanelDefaultSize === 50) ? 50 : null;

  return { name, measuredSize, size, controlPanelDefaultSize, layouts, samples: cases };
});
console.log(JSON.stringify(recommendations, null, 2));
if (recommendations.some(result => result.size === null)) process.exitCode = 1;
