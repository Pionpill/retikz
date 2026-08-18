import type { IRScene } from '@retikz/core';
import type { PerformanceTraceRecord } from '@retikz/runtime';

import { CORE_OWNER_KEY, CoreOwnerDefinition } from '@retikz/core';
import {
  createRuntimeOwnerUpdate,
  createRuntimeTraceReporter,
  PerformanceTraceOutcome,
  PerformanceTracePhase,
  PerformanceTraceUnit,
  RuntimeUpdateStrategy,
} from '@retikz/runtime';
import { mountCanvas, mountSvg, VanillaViewMode } from '@retikz/vanilla/dom';

import type { LabOutcomeValue, LabPolicyIdValue, LabPolicyResult } from './model';
import type { KernelLabPolicyExecutor, KernelLabPolicyInput } from './run-kernel-lab';

import { createBackendHost, createRetainedBenchmarkSession, summarizeSamples } from '../../../shared';
import { createKernelLabScenePair } from './kernel-scenario-fixtures';
import { getKernelLabScenario } from './kernel-scenarios';
import {
  isValidLabPreviewSize,
  LabBackend,
  LabLifecycleAvailability,
  LabOutcome,
  LabPolicyId,
  LabResultSource,
} from './model';

/** 公共 trace 与 wall-clock 样本到 Lab 结果的映射输入 */
export type CreateLabPolicyResultInput = Readonly<{
  policyId: LabPolicyIdValue;
  samples: ReadonlyArray<number>;
  trace: ReadonlyArray<PerformanceTraceRecord>;
  patchKinds: ReadonlyArray<string>;
  diagnostics: ReadonlyArray<string>;
}>;

const previewCleanup = new WeakMap<HTMLElement, () => void>();
let measureSequence = 0;

/** 使用工作台配置创建 Vanilla Preview 输出选项 */
export const createPreviewOutput = (width: number, height: number) => {
  if (!isValidLabPreviewSize(width, height)) {
    throw new Error(`Kernel Lab preview size is invalid: ${width.toString()}x${height.toString()}`);
  }
  return Object.freeze({ width, height, idPrefix: 'performance-lab' });
};

/** 保留 renderer intrinsic 尺寸并把预览输出等比收进可用舞台 */
export const fitPreviewOutput = (host: HTMLElement): void => {
  const output = host.firstElementChild;
  if (!(output instanceof SVGSVGElement) && !(output instanceof HTMLCanvasElement)) {
    throw new Error('Kernel Lab preview output must be an SVG or Canvas element');
  }
  output.style.display = 'block';
  output.style.width = 'auto';
  output.style.height = 'auto';
  output.style.maxWidth = '100%';
  output.style.maxHeight = '100%';
};

/** 把 Runtime update trace 收敛为 Lab 支持的执行结果 */
const resolveLabOutcome = (record: PerformanceTraceRecord): LabOutcomeValue => {
  switch (record.outcome) {
    case LabOutcome.Full:
      return LabOutcome.Full;
    case LabOutcome.Incremental:
      return LabOutcome.Incremental;
    case LabOutcome.Fallback:
      return LabOutcome.Fallback;
    default:
      throw new Error(`Unsupported Kernel Lab update outcome: ${record.outcome}`);
  }
};

/** 把公共 trace、Patch 与 timing 样本整理为 UI 稳定结果 */
export const createLabPolicyResult = (input: CreateLabPolicyResultInput): LabPolicyResult => {
  const work =
    input.trace.find(record => record.owner === CORE_OWNER_KEY && record.phase === PerformanceTracePhase.Update) ??
    input.trace.find(record => record.owner === '@retikz/core' && record.phase === PerformanceTracePhase.Compile) ??
    input.trace.at(0);
  if (work === undefined) throw new Error(`${input.policyId}: Kernel Lab trace is unavailable`);
  const duration = summarizeSamples(input.samples);
  const outcome = input.policyId === LabPolicyId.StaticFull ? LabOutcome.Full : resolveLabOutcome(work);
  return Object.freeze({
    policyId: input.policyId,
    outcome,
    source: input.policyId === LabPolicyId.StaticFull ? LabResultSource.StaticView : LabResultSource.RuntimeTrace,
    work: Object.freeze({
      visited: work.visited,
      reused: work.reused,
      changed: work.changed,
      reuseRatio: work.visited === 0 ? 0 : work.reused / work.visited,
    }),
    timing: Object.freeze({
      samples: input.samples.length,
      medianMs: duration.median,
      p95Ms: duration.p95,
      maxMs: duration.max,
    }),
    trace: Object.freeze(input.trace.map(record => Object.freeze({ ...record }))),
    ...(input.patchKinds.length === 0
      ? {}
      : {
          patch: Object.freeze({
            operationCount: input.patchKinds.length,
            kinds: Object.freeze([...input.patchKinds]),
          }),
        }),
    diagnostics: Object.freeze([...input.diagnostics]),
    lifecycle: Object.freeze({ availability: LabLifecycleAvailability.Unavailable }),
  });
};

/** 使用 Performance Timeline 测量一次同步更新 */
const measureUpdate = (task: () => void): number => {
  measureSequence += 1;
  const prefix = `retikz-lab-${measureSequence.toString()}`;
  performance.mark(`${prefix}-start`);
  task();
  performance.mark(`${prefix}-end`);
  const measure = performance.measure(prefix, `${prefix}-start`, `${prefix}-end`);
  performance.clearMarks(`${prefix}-start`);
  performance.clearMarks(`${prefix}-end`);
  performance.clearMeasures(prefix);
  return measure.duration;
};

/** 交替执行两个 Scene 并返回完成预热后的测量样本 */
const runSamples = (
  first: IRScene,
  second: IRScene,
  warmupRuns: number,
  sampleRuns: number,
  update: (next: IRScene) => void,
): ReadonlyArray<number> => {
  let next = second;
  for (let index = 0; index < warmupRuns; index += 1) {
    update(next);
    next = next === first ? second : first;
  }
  const samples: Array<number> = [];
  for (let index = 0; index < sampleRuns; index += 1) {
    samples.push(measureUpdate(() => update(next)));
    next = next === first ? second : first;
  }
  return Object.freeze(samples);
};

/** 把当前 Preview 策略渲染到持久预览容器 */
const renderPreview = (input: KernelLabPolicyInput, first: IRScene, second: IRScene): void => {
  const preview = input.preview;
  if (preview === undefined) return;
  const { host, width, height } = preview;
  previewCleanup.get(host)?.();
  host.replaceChildren();
  const output = createPreviewOutput(width, height);
  const animation = { enabled: false };
  let dispose: () => void;
  if (input.policyId === LabPolicyId.StaticFull) {
    const runtime = { mode: VanillaViewMode.Static } as const;
    if (input.backend === LabBackend.Svg) {
      const view = mountSvg(host, first, { runtime, output, animation });
      view.update(second);
      dispose = view.dispose;
    } else {
      const view = mountCanvas(host, first, { runtime, output, animation, canvas: { devicePixelRatio: 1 } });
      view.update(second);
      dispose = view.dispose;
    }
  } else {
    const runtime = {
      mode: VanillaViewMode.Retained,
      updateStrategy:
        input.policyId === LabPolicyId.RetainedFull ? RuntimeUpdateStrategy.Full : RuntimeUpdateStrategy.Auto,
    } as const;
    if (input.backend === LabBackend.Svg) {
      const view = mountSvg(host, first, { runtime, output, animation });
      view.update(second);
      dispose = view.dispose;
    } else {
      const view = mountCanvas(host, first, { runtime, output, animation, canvas: { devicePixelRatio: 1 } });
      view.update(second);
      dispose = view.dispose;
    }
  }
  fitPreviewOutput(host);
  previewCleanup.set(host, dispose);
};

/** 执行 static view 完整更新策略并整理可观察结果 */
const executeStaticPolicy = (input: KernelLabPolicyInput, first: IRScene, second: IRScene): LabPolicyResult => {
  const records: Array<PerformanceTraceRecord> = [];
  const reporter = createRuntimeTraceReporter({
    owner: '@retikz/core',
    phases: [
      {
        phase: PerformanceTracePhase.Compile,
        unit: PerformanceTraceUnit.IrChild,
        outcomes: [PerformanceTraceOutcome.Full],
      },
    ],
    sink: record => records.push(record),
  });
  const container = document.createElement('div');
  const options = {
    runtime: { mode: VanillaViewMode.Static } as const,
    compile: { trace: reporter },
    output: { idPrefix: 'performance-lab-measure' },
    animation: { enabled: false },
  };
  let update: (next: IRScene) => void;
  let dispose: () => void;
  if (input.backend === LabBackend.Svg) {
    const view = mountSvg(container, first, options);
    update = next => view.update(next);
    dispose = view.dispose;
  } else {
    const view = mountCanvas(container, first, { ...options, canvas: { devicePixelRatio: 1 } });
    update = next => view.update(next);
    dispose = view.dispose;
  }
  const samples = runSamples(first, second, input.warmupRuns, input.sampleRuns, next => {
    records.length = 0;
    update(next);
  });
  dispose();
  renderPreview(input, first, second);
  return createLabPolicyResult({
    policyId: input.policyId,
    samples,
    trace: records,
    patchKinds: [],
    diagnostics: [],
  });
};

/** 执行 retained Runtime 策略并整理 trace 与 Scene Patch */
const executeRetainedPolicy = (input: KernelLabPolicyInput, first: IRScene, second: IRScene): LabPolicyResult => {
  const records: Array<PerformanceTraceRecord> = [];
  const host = createBackendHost(input.backend);
  const value = createRetainedBenchmarkSession(
    input.backend,
    host,
    first,
    records,
    undefined,
    {},
    input.policyId === LabPolicyId.RetainedFull ? RuntimeUpdateStrategy.Full : RuntimeUpdateStrategy.Auto,
  );
  const samples = runSamples(first, second, input.warmupRuns, input.sampleRuns, next => {
    records.length = 0;
    value.session.update({
      baseRevision: value.session.revision(),
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, next)],
    });
  });
  const artifact = value.session.artifact(value.coreProgram).value;
  const patchKinds = artifact.patch?.operations.map(operation => operation.kind) ?? [];
  const diagnostics = value.session.diagnostics().map(diagnostic => `${diagnostic.code}: ${diagnostic.message}`);
  value.session.dispose();
  renderPreview(input, first, second);
  return createLabPolicyResult({
    policyId: input.policyId,
    samples,
    trace: records,
    patchKinds,
    diagnostics,
  });
};

/** 在真实 SVG 或 Canvas host 上执行单个 Kernel Lab 策略 */
export const executeBrowserKernelLabPolicy: KernelLabPolicyExecutor = input => {
  const scenario = getKernelLabScenario(input.scenarioId);
  const { first, second } = createKernelLabScenePair(scenario.id);
  return Promise.resolve(
    input.policyId === LabPolicyId.StaticFull
      ? executeStaticPolicy(input, first, second)
      : executeRetainedPolicy(input, first, second),
  );
};
