import type {
  BenchmarkBudget,
  BenchmarkEnvironment,
  BenchmarkReport,
  BenchmarkScenario,
  BudgetAssessment,
} from './types';

/** 环境按字段含义比较，不依赖 JSON 字段书写顺序 */
const environmentsMatch = (left: BenchmarkEnvironment, right: BenchmarkEnvironment): boolean => {
  const { cpuModels: leftModels, sampling: leftSampling, ...leftFields } = left;
  const { cpuModels: rightModels, sampling: rightSampling, ...rightFields } = right;
  const sortedRightModels = [...rightModels].sort();
  return (
    Object.entries(leftFields).every(([key, value]) => value === Reflect.get(rightFields, key)) &&
    leftModels.length === rightModels.length &&
    [...leftModels].sort().every((model, index) => model === sortedRightModels[index]) &&
    Object.entries(leftSampling).every(([key, value]) => value === Reflect.get(rightSampling, key))
  );
};

/** 仅在执行成功、数据完整且环境可比时判断预算 */
export const evaluateBudget = (
  scenario: BenchmarkScenario,
  environment: BenchmarkEnvironment,
  budget?: BenchmarkBudget,
  baseline?: BenchmarkReport,
): BudgetAssessment => {
  if (scenario.execution === 'failed' || scenario.errors.length > 0) {
    return { status: 'execution-failed', reason: scenario.errors.join('; ') || 'Scenario failed' };
  }
  if (scenario.execution !== 'passed' || !scenario.statistics) {
    return {
      status: 'not-comparable',
      reason: 'Scenario did not produce a complete measurement',
      severity: budget?.severity,
    };
  }
  if (!budget) return { status: 'report-only' };
  const unavailable = (reason: string): BudgetAssessment => ({
    status: 'not-comparable',
    severity: budget.severity,
    reason,
  });
  let limitMs: number;
  if (budget.kind === 'absolute') {
    if (!environmentsMatch(environment, budget.environment)) return unavailable('Environment mismatch');
    limitMs = budget.maxMs;
  } else {
    if (!baseline) return unavailable('Baseline unavailable');
    if (baseline.errors.length > 0) return unavailable('Baseline run failed');
    if (!environmentsMatch(environment, baseline.environment)) return unavailable('Baseline environment mismatch');
    const reference = baseline.scenarios.find(item => item.id === scenario.id);
    if (!reference?.statistics || reference.execution !== 'passed' || reference.errors.length > 0) {
      return unavailable('Baseline scenario unavailable or failed');
    }
    if (!Number.isFinite(budget.maxRatio) || budget.maxRatio <= 0) return unavailable('Invalid relative budget');
    const referenceMs = reference.statistics[budget.metric];
    if (referenceMs <= 0) return unavailable('Baseline duration is zero');
    limitMs = referenceMs * budget.maxRatio;
  }
  if (!Number.isFinite(limitMs) || limitMs <= 0) return unavailable('Invalid duration limit');
  const actualMs = scenario.statistics[budget.metric];
  return {
    status: actualMs <= limitMs ? 'passed' : 'exceeded',
    severity: budget.severity,
    metric: budget.metric,
    actualMs,
    limitMs,
  };
};

/** 阻断预算缺乏有效证据时同样不能以成功退出 */
export const shouldFailReport = (report: BenchmarkReport): boolean =>
  report.errors.length > 0 ||
  report.scenarios.some(
    ({ assessment }) =>
      assessment.status === 'execution-failed' ||
      (assessment.severity === 'error' && (assessment.status === 'exceeded' || assessment.status === 'not-comparable')),
  );
