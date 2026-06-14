import { type RunRecord } from '../run';

/** Two-layer pass rates and sample count for a group of records */
export type PassRates = {
  count: number;
  zodPassRate: number;
  compilePassRate: number;
};

/** Detail entry for a single failed run — used to locate which prompt/model/K failed and why */
export type FailureDetail = {
  promptId: string;
  model: string;
  kIndex: number;
  stage: 'llm' | 'extract' | 'zod' | 'compile';
  reason: string;
};

/** L2 assertion-layer summary across all records that reached L2 */
export type L2Summary = {
  /** candidates that reached L2 (l2 != null) */
  reached: number;
  /** candidates that did not reach L2 (L1 failed or prompt has no assertions) */
  skipped: number;
  /** fraction of reached candidates whose every assertion passed */
  candidatePassRate: number;
  /** fraction of all assertions that passed */
  assertionPassRate: number;
  assertionsTotal: number;
  assertionsPassed: number;
  /** per assertion kind: passed / total */
  byKind: Record<string, { passed: number; total: number }>;
};

/** Detail entry for a single failed assertion — locates which prompt/model/K and the measured value */
export type AssertionFailure = {
  promptId: string;
  model: string;
  kIndex: number;
  kind: string;
  description?: string;
  actual: string;
};

export type Report = {
  total: number;
  overall: PassRates;
  byModel: Record<string, PassRates>;
  byDifficulty: Record<string, PassRates>;
  failuresByStage: { llm: number; extract: number; zod: number; compile: number };
  /** Full failure detail list (untruncated; display truncation is the formatter's job) */
  failures: Array<FailureDetail>;
  l2: L2Summary;
  /** Full assertion-failure list (untruncated; display truncation is the formatter's job) */
  assertionFailures: Array<AssertionFailure>;
};

const ratesOf = (records: Array<RunRecord>): PassRates => {
  const count = records.length;
  const zod = records.filter((r) => r.zodOk).length;
  const compile = records.filter((r) => r.compileOk).length;
  return {
    count,
    zodPassRate: count === 0 ? 0 : zod / count,
    compilePassRate: count === 0 ? 0 : compile / count,
  };
};

const groupBy = (
  records: Array<RunRecord>,
  key: (r: RunRecord) => string,
): Record<string, PassRates> => {
  const buckets = new Map<string, Array<RunRecord>>();
  for (const r of records) {
    const k = key(r);
    const list = buckets.get(k) ?? [];
    list.push(r);
    buckets.set(k, list);
  }
  return Object.fromEntries([...buckets].map(([k, list]) => [k, ratesOf(list)]));
};

/** Summarizes the L2 assertion layer across records that reached it, plus per-assertion failure details */
const summarizeL2 = (
  records: Array<RunRecord>,
): { l2: L2Summary; assertionFailures: Array<AssertionFailure> } => {
  const reachedRecs = records.filter((r) => r.l2 !== null);
  const reached = reachedRecs.length;
  const skipped = records.length - reached;
  let assertionsTotal = 0;
  let assertionsPassed = 0;
  let candidatePass = 0;
  const byKind: Record<string, { passed: number; total: number }> = {};
  const assertionFailures: Array<AssertionFailure> = [];
  for (const r of reachedRecs) {
    const l2 = r.l2;
    if (l2 === null) continue;
    assertionsTotal += l2.total;
    assertionsPassed += l2.passed;
    if (l2.passed === l2.total) candidatePass += 1;
    for (const a of l2.results) {
      const bucket = byKind[a.kind] ?? { passed: 0, total: 0 };
      bucket.total += 1;
      if (a.pass) bucket.passed += 1;
      byKind[a.kind] = bucket;
      if (!a.pass) {
        assertionFailures.push({
          promptId: r.promptId,
          model: r.model,
          kIndex: r.kIndex,
          kind: a.kind,
          description: a.description,
          actual: a.actual,
        });
      }
    }
  }
  return {
    l2: {
      reached,
      skipped,
      candidatePassRate: reached === 0 ? 0 : candidatePass / reached,
      assertionPassRate: assertionsTotal === 0 ? 0 : assertionsPassed / assertionsTotal,
      assertionsTotal,
      assertionsPassed,
      byKind,
    },
    assertionFailures,
  };
};

/** Aggregates flat run records into a report: overall + by-model/difficulty + failure tally + L2 summary */
export const aggregate = (records: Array<RunRecord>): Report => ({
  total: records.length,
  overall: ratesOf(records),
  byModel: groupBy(records, (r) => r.model),
  byDifficulty: groupBy(records, (r) => r.difficulty),
  failuresByStage: {
    llm: records.filter((r) => r.failure?.stage === 'llm').length,
    extract: records.filter((r) => r.failure?.stage === 'extract').length,
    zod: records.filter((r) => r.failure?.stage === 'zod').length,
    compile: records.filter((r) => r.failure?.stage === 'compile').length,
  },
  failures: records
    .filter((r): r is RunRecord & { failure: NonNullable<RunRecord['failure']> } => Boolean(r.failure))
    .map((r) => ({
      promptId: r.promptId,
      model: r.model,
      kIndex: r.kIndex,
      stage: r.failure.stage,
      reason: r.failure.reason,
    })),
  ...summarizeL2(records),
});