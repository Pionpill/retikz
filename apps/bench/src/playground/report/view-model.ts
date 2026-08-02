import type { BenchLabReport } from '../../shared';
import type { LabPolicyIdValue, LabPolicyResult, LabRunSession, LabTraceEntry } from '../modules/kernel';

import { BenchReportStatus } from '../../shared';
import {
  LabBackend,
  LabLifecycleAvailability,
  LabOutcome,
  LabPolicyId,
  LabResultSource,
  LabRunMode,
} from '../modules/kernel';

/** Performance Lab 顶部摘要的纯数据模型 */
export type LabSummary = Readonly<{
  bestPolicyId?: LabPolicyIdValue;
  incrementalActive: boolean;
  speedupPercent?: number;
}>;

/** Plot 报告图使用的策略 timing 数据行 */
export type ComparisonChartRow = Readonly<{
  policy: string;
  median: number;
  p95: number;
}>;

/** 把策略结果转换为可直接交给 Plot DSL 的本地化数据行 */
export const createComparisonChartRows = (
  results: ReadonlyArray<LabPolicyResult>,
  getPolicyLabel: (policyId: LabPolicyIdValue) => string,
): ReadonlyArray<ComparisonChartRow> =>
  Object.freeze(
    results.map(result =>
      Object.freeze({
        policy: getPolicyLabel(result.policyId),
        median: Number(result.timing.medianMs.toFixed(3)),
        p95: Number(result.timing.p95Ms.toFixed(3)),
      }),
    ),
  );

/** 从一次运行结果提取最佳策略、增量命中与相对收益 */
export const createLabSummary = (results: ReadonlyArray<LabPolicyResult>): LabSummary => {
  if (results.length === 0) {
    return Object.freeze({ bestPolicyId: undefined, incrementalActive: false, speedupPercent: undefined });
  }
  const best = results.reduce((current, candidate) =>
    candidate.timing.medianMs < current.timing.medianMs ? candidate : current,
  );
  const staticResult = results.find(result => result.policyId === LabPolicyId.StaticFull);
  const autoResult = results.find(result => result.policyId === LabPolicyId.RetainedAuto);
  const speedupPercent =
    staticResult === undefined || autoResult === undefined || staticResult.timing.medianMs === 0
      ? undefined
      : Math.round((1 - autoResult.timing.medianMs / staticResult.timing.medianMs) * 1_000) / 10;
  return Object.freeze({
    bestPolicyId: best.policyId,
    incrementalActive: autoResult?.outcome === LabOutcome.Incremental && autoResult.work.reused > 0,
    speedupPercent,
  });
};

/** 判断未知值是否为记录 */
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** 判断未知值是否为有限数值 */
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** 判断未知值是否为非负整数 */
const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

/** 判断未知值是否为非负有限数值 */
const isNonNegativeNumber = (value: unknown): value is number => isFiniteNumber(value) && value >= 0;

/** 判断未知值是否为字符串数组 */
const isStringArray = (value: unknown): value is ReadonlyArray<string> =>
  Array.isArray(value) && value.every(item => typeof item === 'string');

/** 判断未知值是否属于 const object enum */
const isEnumValue = <T extends string>(values: ReadonlyArray<T>, value: unknown): value is T =>
  typeof value === 'string' && values.some(candidate => candidate === value);

/** 校验报告中的 Trace 条目，避免本地旧数据破坏详情页 */
const isLabTraceEntry = (value: unknown): value is LabTraceEntry =>
  isRecord(value) &&
  typeof value.owner === 'string' &&
  typeof value.phase === 'string' &&
  typeof value.unit === 'string' &&
  typeof value.outcome === 'string' &&
  isNonNegativeInteger(value.visited) &&
  isNonNegativeInteger(value.reused) &&
  isNonNegativeInteger(value.changed) &&
  value.reused <= value.visited &&
  value.changed <= value.visited;

/** 校验报告中的单策略结果 */
const isLabPolicyResult = (value: unknown): value is LabPolicyResult => {
  if (!isRecord(value) || !isRecord(value.work) || !isRecord(value.timing) || !isRecord(value.lifecycle)) return false;
  if (
    !isEnumValue(Object.values(LabPolicyId), value.policyId) ||
    !isEnumValue(Object.values(LabOutcome), value.outcome) ||
    !isEnumValue(Object.values(LabResultSource), value.source) ||
    !isNonNegativeInteger(value.work.visited) ||
    !isNonNegativeInteger(value.work.reused) ||
    !isNonNegativeInteger(value.work.changed) ||
    value.work.reused > value.work.visited ||
    value.work.changed > value.work.visited ||
    !isFiniteNumber(value.work.reuseRatio) ||
    value.work.reuseRatio < 0 ||
    value.work.reuseRatio > 1 ||
    !isNonNegativeInteger(value.timing.samples) ||
    !isNonNegativeNumber(value.timing.medianMs) ||
    !isNonNegativeNumber(value.timing.p95Ms) ||
    !isNonNegativeNumber(value.timing.maxMs) ||
    value.timing.medianMs > value.timing.p95Ms ||
    value.timing.p95Ms > value.timing.maxMs ||
    !Array.isArray(value.trace) ||
    !value.trace.every(isLabTraceEntry) ||
    !isStringArray(value.diagnostics) ||
    !isEnumValue(Object.values(LabLifecycleAvailability), value.lifecycle.availability)
  ) {
    return false;
  }
  return (
    value.patch === undefined ||
    (isRecord(value.patch) &&
      isNonNegativeInteger(value.patch.operationCount) &&
      isStringArray(value.patch.kinds) &&
      value.patch.operationCount === value.patch.kinds.length)
  );
};

/** 从完整报告中安全读取可交给仪表盘展示的运行会话 */
export const getLabRunSessionPayload = (report: BenchLabReport): LabRunSession | undefined => {
  const value = report.payload;
  if (!isRecord(value)) return undefined;
  if (
    typeof value.id !== 'string' ||
    !isEnumValue(Object.values(LabRunMode), value.mode) ||
    typeof value.scenarioId !== 'string' ||
    !isEnumValue(Object.values(LabBackend), value.backend) ||
    !isFiniteNumber(value.startedAt) ||
    !Array.isArray(value.results) ||
    !value.results.every(isLabPolicyResult)
  ) {
    return undefined;
  }
  const policyIds = value.results.map(result => result.policyId);
  if (new Set(policyIds).size !== policyIds.length) return undefined;
  return Object.freeze({
    id: value.id,
    mode: value.mode,
    scenarioId: value.scenarioId,
    backend: value.backend,
    startedAt: value.startedAt,
    results: Object.freeze(value.results),
  });
};

/** 从失败报告中读取可向用户展示的原始错误 */
export const getLabReportFailureMessage = (report: BenchLabReport): string | undefined => {
  if (report.status !== BenchReportStatus.Failed || !isRecord(report.payload)) return undefined;
  return typeof report.payload.error === 'string' && report.payload.error.length > 0 ? report.payload.error : undefined;
};
