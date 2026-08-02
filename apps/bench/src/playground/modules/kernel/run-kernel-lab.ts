import type { LabBackendValue, LabPolicyIdValue, LabPolicyResult, LabRunModeValue, LabRunSession } from './model';

import { getKernelLabScenario, kernelLabPolicies } from './kernel-scenarios';
import { LabRunMode } from './model';

/** Preview renderer 原子挂载输入 */
export type KernelLabPreviewInput = Readonly<{
  /** Preview 挂载容器 */
  host: HTMLElement;
  /** Preview 输出宽度 */
  width: number;
  /** Preview 输出高度 */
  height: number;
}>;

/** 单个 Kernel 策略执行器收到的稳定输入 */
export type KernelLabPolicyInput = Readonly<{
  policyId: LabPolicyIdValue;
  scenarioId: string;
  backend: LabBackendValue;
  warmupRuns: number;
  sampleRuns: number;
  /** Preview renderer 输入；Benchmark 不传 */
  preview?: KernelLabPreviewInput;
}>;

/** Performance Lab 的 browser 策略执行函数 */
export type KernelLabPolicyExecutor = (input: KernelLabPolicyInput) => Promise<LabPolicyResult>;

/** 一次 Performance Lab 运行的参数 */
export type RunKernelLabOptions = Readonly<{
  mode: LabRunModeValue;
  scenarioId: string;
  backend: LabBackendValue;
  policyId: LabPolicyIdValue;
  warmupRuns: number;
  sampleRuns: number;
  /** Preview renderer 输入；Benchmark 不传 */
  preview?: KernelLabPreviewInput;
}>;

let sessionSequence = 0;

/** 编排 Preview 与 Benchmark，采样完成前不触发 React 更新 */
export const runKernelLab = async (
  options: RunKernelLabOptions,
  execute: KernelLabPolicyExecutor,
): Promise<LabRunSession> => {
  getKernelLabScenario(options.scenarioId);
  const startedAt = performance.now();
  const policies =
    options.mode === LabRunMode.Preview ? [options.policyId] : kernelLabPolicies.map(policy => policy.id);
  const results: Array<LabPolicyResult> = [];
  for (const policyId of policies) {
    results.push(
      await execute({
        policyId,
        scenarioId: options.scenarioId,
        backend: options.backend,
        warmupRuns: options.warmupRuns,
        sampleRuns: options.sampleRuns,
        ...(options.mode === LabRunMode.Preview && options.preview !== undefined ? { preview: options.preview } : {}),
      }),
    );
  }
  sessionSequence += 1;
  return Object.freeze({
    id: `kernel-lab-${sessionSequence.toString()}`,
    mode: options.mode,
    scenarioId: options.scenarioId,
    backend: options.backend,
    startedAt,
    results: Object.freeze(results),
  });
};
