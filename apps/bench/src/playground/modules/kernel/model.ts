import type { ValueOf } from '@retikz/core';

/** Performance Lab 支持的 renderer backend */
export const LabBackend = {
  Svg: 'svg',
  Canvas: 'canvas',
} as const;

/** Performance Lab 支持的 renderer backend 取值 */
export type LabBackendValue = ValueOf<typeof LabBackend>;

/** Performance Lab 的运行模式 */
export const LabRunMode = {
  Preview: 'preview',
  Benchmark: 'benchmark',
} as const;

/** Performance Lab 的运行模式取值 */
export type LabRunModeValue = ValueOf<typeof LabRunMode>;

/** 可比较的 Kernel 更新策略 */
export const LabPolicyId = {
  StaticFull: 'static-full',
  RetainedFull: 'retained-full',
  RetainedAuto: 'retained-auto',
} as const;

/** 可比较的 Kernel 更新策略取值 */
export type LabPolicyIdValue = ValueOf<typeof LabPolicyId>;

/** 预览输出允许的单边上限 */
export const maximumLabPreviewDimension = 8192;

/** 预览输出允许的总像素上限，与 4K 预设一致 */
export const maximumLabPreviewPixels = 3840 * 2160;

/** 判断预览输出单边是否在安全整数范围内 */
export const isValidLabPreviewDimension = (value: number): boolean =>
  Number.isInteger(value) && value >= 1 && value <= maximumLabPreviewDimension;

/** 判断预览输出尺寸是否同时满足单边和总像素预算 */
export const isValidLabPreviewSize = (width: number, height: number): boolean =>
  isValidLabPreviewDimension(width) && isValidLabPreviewDimension(height) && width * height <= maximumLabPreviewPixels;

/** Kernel 场景中 first / second Scene 的变化形态 */
export const LabChangeKind = {
  AllStyle: 'all-style',
  SinglePosition: 'single-position',
  SingleStyle: 'single-style',
  InsertRemove: 'insert-remove',
} as const;

/** Kernel 场景中 first / second Scene 的变化形态取值 */
export type LabChangeKindValue = ValueOf<typeof LabChangeKind>;

/** Kernel 策略执行结果 */
export const LabOutcome = {
  Full: 'full',
  Incremental: 'incremental',
  Fallback: 'fallback',
} as const;

/** Kernel 策略执行结果取值 */
export type LabOutcomeValue = ValueOf<typeof LabOutcome>;

/** Lab 结果证据来源 */
export const LabResultSource = {
  StaticView: 'static-view',
  RuntimeTrace: 'runtime-trace',
} as const;

/** Lab 结果证据来源取值 */
export type LabResultSourceValue = ValueOf<typeof LabResultSource>;

/** 生命周期证据可用性 */
export const LabLifecycleAvailability = {
  Unavailable: 'unavailable',
} as const;

/** 生命周期证据可用性取值 */
export type LabLifecycleAvailabilityValue = ValueOf<typeof LabLifecycleAvailability>;

/** Performance Lab 中可执行的稳定场景 */
export type LabScenario = Readonly<{
  id: string;
  label: string;
  description: string;
  entityCount: number;
  changedEntities: number;
  changeKind: LabChangeKindValue;
}>;

/** Performance Lab 中可选择的策略说明 */
export type LabPolicy = Readonly<{
  id: LabPolicyIdValue;
  label: string;
  description: string;
}>;

/** 单次策略运行的工作量指标 */
export type LabWorkMetrics = Readonly<{
  visited: number;
  reused: number;
  changed: number;
  reuseRatio: number;
}>;

/** 单次策略运行的时间指标 */
export type LabTimingMetrics = Readonly<{
  samples: number;
  medianMs: number;
  p95Ms: number;
  maxMs: number;
}>;

/** Trace 面板展示的最小公共记录 */
export type LabTraceEntry = Readonly<{
  owner: string;
  phase: string;
  unit: string;
  outcome: string;
  visited: number;
  reused: number;
  changed: number;
}>;

/** Scene Patch 面板展示的操作摘要 */
export type LabPatchSummary = Readonly<{
  operationCount: number;
  kinds: ReadonlyArray<string>;
}>;

/** 单个策略的完整可观察结果 */
export type LabPolicyResult = Readonly<{
  policyId: LabPolicyIdValue;
  outcome: LabOutcomeValue;
  source: LabResultSourceValue;
  work: LabWorkMetrics;
  timing: LabTimingMetrics;
  trace: ReadonlyArray<LabTraceEntry>;
  patch?: LabPatchSummary;
  diagnostics: ReadonlyArray<string>;
  lifecycle: Readonly<{ availability: LabLifecycleAvailabilityValue }>;
}>;

/** 一次 Preview 或 Benchmark 的结果集合 */
export type LabRunSession = Readonly<{
  id: string;
  mode: LabRunModeValue;
  scenarioId: string;
  backend: LabBackendValue;
  startedAt: number;
  results: ReadonlyArray<LabPolicyResult>;
}>;
