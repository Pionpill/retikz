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
  const severity = budget?.kind === 'workload' ? undefined : budget?.severity;
  const blocking = budget?.blocking ?? (budget?.kind !== 'workload' && severity === 'error');
  if (scenario.execution === 'failed' || scenario.errors.length > 0) {
    return { status: 'execution-failed', reason: scenario.errors.join('; ') || 'Scenario failed' };
  }
  if (scenario.execution !== 'passed' || !scenario.statistics) {
    return {
      status: 'not-comparable',
      reason: 'Scenario did not produce a complete measurement',
      severity,
      blocking,
    };
  }
  if (!budget) return { status: 'report-only' };
  const unavailable = (reason: string): BudgetAssessment => ({
    status: 'not-comparable',
    severity,
    blocking,
    reason,
  });
  if (budget.kind === 'workload') {
    const { warningMs, errorMs, rationale } = budget;
    if (scenario.measurement?.mode === 'reference') {
      return { status: 'report-only', reason: '参考档仅观察，不按三个样本作稳定分位数验收', rationale };
    }
    if (!Number.isFinite(warningMs) || !Number.isFinite(errorMs) || warningMs <= 0 || errorMs <= warningMs) {
      return { ...unavailable('Invalid duration limit'), severity: 'error', blocking: true };
    }
    const actualMs = scenario.statistics[budget.metric];
    const level = actualMs > errorMs ? 'error' : actualMs > warningMs ? 'warn' : undefined;
    return {
      status: level ? 'exceeded' : 'passed',
      severity: level,
      metric: budget.metric,
      actualMs,
      warningMs,
      errorMs,
      rationale,
      blocking,
    };
  }
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
    blocking,
  };
};

/** 阻断预算缺乏有效证据时同样不能以成功退出 */
export const shouldFailReport = (report: BenchmarkReport): boolean =>
  report.errors.length > 0 ||
  report.scenarios.some(
    ({ assessment }) =>
      assessment.status === 'execution-failed' ||
      (assessment.blocking === true &&
        (assessment.status === 'not-comparable' ||
          (assessment.status === 'exceeded' && assessment.severity === 'error'))),
  );
