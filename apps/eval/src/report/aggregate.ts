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

export type Report = {
  total: number;
  overall: PassRates;
  byModel: Record<string, PassRates>;
  byDifficulty: Record<string, PassRates>;
  failuresByStage: { llm: number; extract: number; zod: number; compile: number };
  /** Full failure detail list (untruncated; display truncation is the formatter's job) */
  failures: Array<FailureDetail>;
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

/** Aggregates flat run records into a report: overall + by-model/difficulty + failure tally + failure details */
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
});