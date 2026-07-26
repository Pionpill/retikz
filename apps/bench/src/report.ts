import { compileToScene } from '@retikz/core';

import type { SampleSummary } from './stats';

import { createSimpleNodeScene } from './fixtures';
import { summarizeSamples } from './stats';

/** 单个 wall-clock 场景报告 */
export type WallClockScenarioReport = Readonly<{
  id: string;
  samples: number;
  durationMs: SampleSummary;
}>;

/** 以固定 warm-up 与 sample 次数测量一个同步场景 */
export const measureScenario = (
  id: string,
  warmupRuns: number,
  sampleRuns: number,
  task: () => void,
): WallClockScenarioReport => {
  for (let index = 0; index < warmupRuns; index += 1) task();
  const samples: Array<number> = [];
  for (let index = 0; index < sampleRuns; index += 1) {
    const startedAt = performance.now();
    task();
    samples.push(performance.now() - startedAt);
  }
  return Object.freeze({ id, samples: sampleRuns, durationMs: summarizeSamples(samples) });
};

/** 在 Node 环境生成 Core full compile 的非阻断 wall-clock 报告 */
export const runCoreWallClockReport = (
  warmupRuns: number,
  sampleRuns: number,
): ReadonlyArray<WallClockScenarioReport> => {
  const reports: Array<WallClockScenarioReport> = [];
  for (const size of [100, 1_000, 5_000]) {
    const input = createSimpleNodeScene(size);
    reports.push(
      measureScenario(`core-full-${size}`, warmupRuns, sampleRuns, () => {
        compileToScene(input);
      }),
    );
  }
  return Object.freeze(reports);
};
