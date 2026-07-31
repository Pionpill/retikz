import { compileToScene, CoreOwnerDefinition, createCoreProgram } from '@retikz/core';
import {
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeOwnerUpdate,
  createRuntimeProgramRegistry,
  createRuntimeSession,
} from '@retikz/runtime';

import type { SampleSummary } from './stats';

import { createSimpleNodeScene, updateSimpleNodeFill } from './fixtures';
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
  const first = createSimpleNodeScene(5_000);
  const second = updateSimpleNodeFill(first, 2_500, '#22c55e');
  const coreProgram = createCoreProgram({ onWarn: () => undefined });
  const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
  const programs = createRuntimeProgramRegistry({ owners, builtins: [coreProgram] });
  reports.push(
    measureScenario('core-retained-full-5000', warmupRuns, sampleRuns, () => {
      const initial = createRuntimeSession({
        owners,
        programs,
        initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, first)],
      });
      initial.dispose();
    }),
  );
  const session = createRuntimeSession({
    owners,
    programs,
    initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, first)],
  });
  let next = second;
  try {
    reports.push(
      measureScenario('core-single-entity-update-5000', warmupRuns, sampleRuns, () => {
        session.update({
          baseRevision: session.revision(),
          owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, next)],
        });
        next = next === first ? second : first;
      }),
    );
  } finally {
    session.dispose();
  }
  return Object.freeze(reports);
};
