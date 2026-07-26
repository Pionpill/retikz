import type { PerformanceTraceRecord } from '@retikz/runtime';

import { compileToScene } from '@retikz/core';
import { drawScene } from '@retikz/render/canvas';
import { buildSvgDocument } from '@retikz/render/svg';
import { createRuntimeTraceReporter } from '@retikz/runtime';

import type { BrowserBenchmarkOptions, BrowserBenchmarkResult, RetikzBenchWindow } from './browser-contract';
import type { DeterministicBenchmarkResult } from './budget';
import type { WallClockScenarioReport } from './report';

import { createSimpleNodeScene } from './fixtures';
import { stableHash } from './hash';
import { measureScenario } from './report';
import { fullBaselineSizes, toResult } from './run';
import { assertFullTrace } from './trace';

/** 创建固定尺寸的真实 browser Canvas */
const createCanvas = (): Readonly<{
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
}> => {
  const canvas = document.createElement('canvas');
  canvas.width = 1440;
  canvas.height = 900;
  const context = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
  if (context === null) throw new Error('browser benchmark: CanvasRenderingContext2D is unavailable');
  return Object.freeze({ canvas, context });
};

/** 对真实 Canvas 像素生成 FNV-1a 32-bit 功能摘要 */
export const hashCanvasPixels = (context: CanvasRenderingContext2D): string => {
  const { width, height } = context.canvas;
  const pixels = context.getImageData(0, 0, width, height).data;
  let hash = 0x811c9dc5;
  const mix = (value: number): void => {
    hash ^= value;
    hash = Math.imul(hash, 0x01000193);
  };
  for (const value of [width, height]) {
    mix(value & 0xff);
    mix((value >>> 8) & 0xff);
    mix((value >>> 16) & 0xff);
    mix((value >>> 24) & 0xff);
  }
  for (const value of pixels) mix(value);
  return (hash >>> 0).toString(16).padStart(8, '0');
};

/** 运行 SVG 与 Canvas 的确定性 full-path benchmark */
const runDeterministicBrowserBenchmarks = (): ReadonlyArray<DeterministicBenchmarkResult> => {
  const results: Array<DeterministicBenchmarkResult> = [];
  for (const size of fullBaselineSizes) {
    const scene = compileToScene(createSimpleNodeScene(size)).scene;

    const svgRecords: Array<PerformanceTraceRecord> = [];
    const svgReporter = createRuntimeTraceReporter({
      owner: '@retikz/render:svg',
      phases: [{ phase: 'commit', unit: 'scene-primitive', outcomes: ['full'] }],
      sink: record => svgRecords.push(record),
    });
    const svg = buildSvgDocument(scene, {
      idPrefix: `bench-${size}`,
      animate: false,
      trace: svgReporter,
    });
    const svgRecord = assertFullTrace(`svg-full-${size}`, svgReporter, svgRecords, {
      phase: 'commit',
      unit: 'scene-primitive',
      visited: size,
    });
    results.push(toResult(`svg-full-${size}`, stableHash(svg), svgRecord));

    const { context } = createCanvas();
    const canvasRecords: Array<PerformanceTraceRecord> = [];
    const canvasReporter = createRuntimeTraceReporter({
      owner: '@retikz/render:canvas',
      phases: [{ phase: 'commit', unit: 'scene-primitive', outcomes: ['full'] }],
      sink: record => canvasRecords.push(record),
    });
    drawScene(context, scene, { trace: canvasReporter });
    const canvasRecord = assertFullTrace(`canvas-full-${size}`, canvasReporter, canvasRecords, {
      phase: 'commit',
      unit: 'scene-primitive',
      visited: size,
    });
    results.push(toResult(`canvas-full-${size}`, hashCanvasPixels(context), canvasRecord));
  }
  return Object.freeze(results);
};

/** 在真实 browser backend 中生成 renderer wall-clock 报告 */
const runBrowserWallClockReport = (warmupRuns: number, sampleRuns: number): ReadonlyArray<WallClockScenarioReport> => {
  const reports: Array<WallClockScenarioReport> = [];
  for (const size of fullBaselineSizes) {
    const scene = compileToScene(createSimpleNodeScene(size)).scene;
    const { context } = createCanvas();
    reports.push(
      measureScenario(`svg-full-${size}`, warmupRuns, sampleRuns, () => {
        buildSvgDocument(scene, { idPrefix: `report-${size}`, animate: false });
      }),
      measureScenario(`canvas-full-${size}`, warmupRuns, sampleRuns, () => {
        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        drawScene(context, scene);
      }),
    );
  }
  return Object.freeze(reports);
};

/** 采集影响 renderer 输出和时间可比性的 browser 环境字段 */
const readEnvironment = (browserVersion: string): BrowserBenchmarkResult['environment'] => {
  const fontProbe = document.createElement('canvas').getContext('2d');
  if (fontProbe === null) throw new Error('browser benchmark: font probe context is unavailable');
  fontProbe.font = '16px Arial';
  return Object.freeze({
    browserVersion,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    viewport: Object.freeze({ width: window.innerWidth, height: window.innerHeight }),
    devicePixelRatio: window.devicePixelRatio,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    fontAvailable: document.fonts.check('16px Arial'),
    fontMetric: fontProbe.measureText('retikz benchmark 0123456789').width,
  });
};

/** Playwright runner 调用的 browser benchmark 唯一入口 */
const runBrowserBenchmarks = async (options: BrowserBenchmarkOptions): Promise<BrowserBenchmarkResult> => {
  await document.fonts.ready;
  return Object.freeze({
    environment: readEnvironment(options.browserVersion),
    deterministic: runDeterministicBrowserBenchmarks(),
    wallClock: options.includeWallClock
      ? runBrowserWallClockReport(options.warmupRuns, options.sampleRuns)
      : Object.freeze([]),
  });
};

Object.assign(window as RetikzBenchWindow, { retikzBench: Object.freeze({ run: runBrowserBenchmarks }) });
