import type { WallClockScenarioReport } from './report';

import { stableHash } from './hash';

/** 单个已审查 timing baseline 场景 */
export type TimingBaselineScenario = Readonly<{
  id: string;
  durationMs: WallClockScenarioReport['durationMs'];
}>;

/** 与完整环境 fingerprint 绑定的 timing baseline */
export type TimingBaseline = Readonly<{
  fingerprint: string;
  scenarios: ReadonlyArray<TimingBaselineScenario>;
}>;

/** 与绝对 wall-clock baseline 绑定的机器与 runner identity */
export type TimingRunnerEnvironment = Readonly<{
  /** 显式 runner id；未配置时使用 hostname */
  runnerId: string;
  /** Node 报告的操作系统平台 */
  platform: string;
  /** Node 报告的处理器架构 */
  architecture: string;
  /** 当前机器全部唯一 CPU model */
  cpuModels: ReadonlyArray<string>;
  /** Node 可见的逻辑处理器数量 */
  logicalCpuCount: number;
  /** Node 可见的物理内存总字节数 */
  totalMemoryBytes: number;
}>;

/** 一次 timing gate 对比结果 */
export type TimingGateComparison = Readonly<{
  status: 'passed' | 'failed' | 'unstable' | 'skipped';
  errors: ReadonlyArray<string>;
}>;

/** 一次完整 wall-clock 采样及其环境 fingerprint */
export type TimingGateAttempt = Readonly<{
  fingerprint: string;
  reports: ReadonlyArray<WallClockScenarioReport>;
}>;

/** 最多两次 wall-clock 采样的 gate 编排结果 */
export type TimingGateAttemptsResult = Readonly<{
  attempts: ReadonlyArray<
    Readonly<{
      attempt: TimingGateAttempt;
      comparison: TimingGateComparison;
    }>
  >;
  finalComparison: TimingGateComparison;
}>;

/** ADR-05 tracked update 与同口径 initial full 的 p95 比例上界 */
const relativeGuards = Object.freeze([
  ['core-single-entity-update-5000', 'core-retained-full-5000', 0.5],
  ['svg-single-entity-update-5000', 'svg-retained-full-5000', 0.25],
  ['canvas-single-entity-update-5000', 'canvas-retained-full-5000', 1.5],
  ['svg-group-update-5000', 'svg-retained-full-5000', 0.5],
  ['canvas-group-update-5000', 'canvas-retained-full-5000', 1.25],
  ['svg-replace-fallback-5000', 'svg-none-retained-full-5000', 2],
  ['canvas-replace-fallback-5000', 'canvas-none-retained-full-5000', 2.5],
] as const);

/** 从相对护栏派生的唯一 tracked 5000 场景集合 */
const trackedTimingScenarioIds = Object.freeze(
  [...new Set(relativeGuards.flatMap(([updateId, fullId]) => [updateId, fullId]))].sort((left, right) =>
    left.localeCompare(right, 'en'),
  ),
);
const trackedTimingScenarioIdSet = new Set<string>(trackedTimingScenarioIds);

/** 收集数组中重复的场景 id */
const duplicateScenarioIds = (ids: ReadonlyArray<string>): ReadonlyArray<string> => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return Object.freeze([...duplicates].sort((left, right) => left.localeCompare(right, 'en')));
};

/** 用完整 expected/actual 环境生成 timing baseline fingerprint */
export const createTimingEnvironmentFingerprint = (
  expected: unknown,
  actualNode: string,
  browser: unknown,
  runner: TimingRunnerEnvironment,
): string => stableHash({ expected, actualNode, browser, runner });

/** 生成只供人工审查的 timing baseline 候选 */
export const createTimingBaselineCandidate = (
  fingerprint: string,
  reports: ReadonlyArray<WallClockScenarioReport>,
): TimingBaseline => {
  const trackedReports = reports.filter(report => trackedTimingScenarioIdSet.has(report.id));
  const duplicates = duplicateScenarioIds(trackedReports.map(report => report.id));
  if (duplicates.length > 0) throw new Error(`duplicate tracked timing reports: ${duplicates.join(', ')}`);
  return Object.freeze({
    fingerprint,
    scenarios: Object.freeze(
      trackedReports
        .sort((left, right) => left.id.localeCompare(right.id, 'en'))
        .map(report => Object.freeze({ id: report.id, durationMs: report.durationMs })),
    ),
  });
};

/** 执行同 fingerprint baseline、1.20 倍绝对护栏、相对 p95 与 max unstable 对比 */
export const compareTimingReports = (
  fingerprint: string,
  reports: ReadonlyArray<WallClockScenarioReport>,
  baseline: TimingBaseline | undefined,
): TimingGateComparison => {
  if (baseline === undefined) {
    return Object.freeze({ status: 'skipped', errors: Object.freeze(['timing baseline is unavailable']) });
  }
  if (baseline.fingerprint !== fingerprint) {
    return Object.freeze({ status: 'skipped', errors: Object.freeze(['timing baseline fingerprint mismatch']) });
  }
  const errors: Array<string> = [];
  for (const id of duplicateScenarioIds(reports.map(report => report.id))) {
    errors.push(`${id}: duplicate timing report`);
  }
  for (const id of duplicateScenarioIds(baseline.scenarios.map(scenario => scenario.id))) {
    errors.push(`${id}: duplicate tracked timing baseline`);
  }
  const reportById = new Map(reports.map(report => [report.id, report]));
  const baselineById = new Map(baseline.scenarios.map(scenario => [scenario.id, scenario]));
  let unstable = false;
  for (const id of trackedTimingScenarioIds) {
    const report = reportById.get(id);
    const scenario = baselineById.get(id);
    if (report === undefined) {
      errors.push(`${id}: missing timing report`);
      continue;
    }
    if (scenario === undefined) {
      errors.push(`${id}: missing tracked timing baseline`);
      continue;
    }
    if (report.durationMs.median > scenario.durationMs.median * 1.2) {
      errors.push(`${id}: median exceeds tracked baseline 1.20x`);
    }
    if (report.durationMs.p95 > scenario.durationMs.p95 * 1.2) {
      errors.push(`${id}: p95 exceeds tracked baseline 1.20x`);
    }
    if (report.durationMs.max > scenario.durationMs.max * 2) {
      unstable = true;
      errors.push(`${id}: max exceeds tracked baseline 2.00x`);
    }
  }
  for (const scenario of baseline.scenarios) {
    if (!trackedTimingScenarioIdSet.has(scenario.id)) {
      errors.push(`${scenario.id}: untracked timing baseline scenario`);
    }
  }
  for (const [updateId, fullId, ratio] of relativeGuards) {
    const update = reportById.get(updateId);
    const full = reportById.get(fullId);
    if (update === undefined || full === undefined) {
      errors.push(`${updateId}: relative timing pair is incomplete`);
      continue;
    }
    if (update.durationMs.p95 > full.durationMs.p95 * ratio) {
      errors.push(`${updateId}: p95 exceeds ${fullId} ${ratio.toFixed(2)}x`);
    }
  }
  return Object.freeze({
    status: unstable ? 'unstable' : errors.length > 0 ? 'failed' : 'passed',
    errors: Object.freeze(errors),
  });
};

/** 执行 timing gate，并仅在首次 unstable 时以同 fingerprint 完整重跑一次 */
export const runTimingGateAttempts = async (
  first: TimingGateAttempt,
  baseline: TimingBaseline | undefined,
  rerun: () => Promise<TimingGateAttempt>,
): Promise<TimingGateAttemptsResult> => {
  const firstComparison = compareTimingReports(first.fingerprint, first.reports, baseline);
  const attempts: Array<TimingGateAttemptsResult['attempts'][number]> = [
    Object.freeze({ attempt: first, comparison: firstComparison }),
  ];
  if (firstComparison.status !== 'unstable') {
    return Object.freeze({ attempts: Object.freeze(attempts), finalComparison: firstComparison });
  }

  const second = await rerun();
  const secondComparison =
    second.fingerprint === first.fingerprint
      ? compareTimingReports(second.fingerprint, second.reports, baseline)
      : Object.freeze<TimingGateComparison>({
          status: 'skipped',
          errors: Object.freeze(['timing rerun fingerprint mismatch']),
        });
  attempts.push(Object.freeze({ attempt: second, comparison: secondComparison }));
  return Object.freeze({ attempts: Object.freeze(attempts), finalComparison: secondComparison });
};

/** 要求 compare 模式形成明确 PASS；skipped同样以失败退出供release gate机器判别 */
export const assertTimingGatePassed = (comparison: TimingGateComparison): void => {
  if (comparison.status === 'passed') return;
  throw new Error(`timing benchmark ${comparison.status}:\n${comparison.errors.join('\n')}`);
};
