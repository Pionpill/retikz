/** 单个确定性 benchmark 的观测结果 */
export type DeterministicBenchmarkResult = Readonly<{
  id: string;
  oracle: string;
  visited: number;
  reused: number;
  changed: number;
  /** dispose后仍可观察的listener、handler或resource handle数量 */
  liveHandles?: number;
}>;

/** 单个确定性 benchmark 的已审查预算 */
export type DeterministicBenchmarkBudget = Readonly<{
  id: string;
  oracle: string;
  visited: number;
  reused: number;
  changed: number;
  /** 已审查的dispose后live handle精确预算 */
  liveHandles?: number;
}>;

/** 对比实际确定性指标与已审查预算，返回全部阻断错误 */
export const compareDeterministicResults = (
  results: ReadonlyArray<DeterministicBenchmarkResult>,
  budgets: ReadonlyArray<DeterministicBenchmarkBudget>,
): ReadonlyArray<string> => {
  const errors: Array<string> = [];
  const resultById = new Map(results.map(result => [result.id, result]));
  const budgetIds = new Set(budgets.map(budget => budget.id));

  for (const budget of budgets) {
    const result = resultById.get(budget.id);
    if (result === undefined) {
      errors.push(`${budget.id}: missing benchmark result`);
      continue;
    }
    if (result.oracle !== budget.oracle) errors.push(`${budget.id}: oracle mismatch`);
    if (result.visited !== budget.visited) {
      errors.push(`${budget.id}: visited ${result.visited} differs from ${budget.visited}`);
    }
    if (result.reused !== budget.reused) {
      errors.push(`${budget.id}: reused ${result.reused} differs from ${budget.reused}`);
    }
    if (result.changed !== budget.changed) {
      errors.push(`${budget.id}: changed ${result.changed} differs from ${budget.changed}`);
    }
    if (result.liveHandles !== budget.liveHandles) {
      errors.push(`${budget.id}: liveHandles ${String(result.liveHandles)} differs from ${String(budget.liveHandles)}`);
    }
  }

  for (const result of results) {
    if (!budgetIds.has(result.id)) errors.push(`${result.id}: missing reviewed budget`);
  }
  return Object.freeze(errors);
};

/** 把本次结果转换成需要人工审查的 baseline 候选 */
export const createBaselineCandidate = (
  results: ReadonlyArray<DeterministicBenchmarkResult>,
): ReadonlyArray<DeterministicBenchmarkBudget> =>
  Object.freeze(
    [...results]
      .sort((left, right) => left.id.localeCompare(right.id, 'en'))
      .map(result =>
        Object.freeze({
          id: result.id,
          oracle: result.oracle,
          visited: result.visited,
          reused: result.reused,
          changed: result.changed,
          ...(result.liveHandles === undefined ? {} : { liveHandles: result.liveHandles }),
        }),
      ),
  );
