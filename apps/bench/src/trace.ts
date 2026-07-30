import type {
  PerformanceTracePhase,
  PerformanceTraceRecord,
  PerformanceTraceUnit,
  RuntimeTraceReporter,
} from '@retikz/runtime';

/** 校验一次 full-path trace 的发射基数、诊断与精确工作量 */
export const assertFullTrace = (
  id: string,
  reporter: RuntimeTraceReporter,
  records: ReadonlyArray<PerformanceTraceRecord>,
  expected: Readonly<{
    phase: PerformanceTracePhase;
    unit: PerformanceTraceUnit;
    visited: number;
  }>,
): PerformanceTraceRecord => {
  const diagnostics = reporter.diagnostics();
  if (diagnostics.length !== 0) {
    throw new Error(`${id}: reporter emitted ${diagnostics.length} diagnostics`);
  }
  if (records.length !== 1) throw new Error(`${id}: emitted ${records.length} records instead of 1`);
  const record = records[0];
  if (
    record.owner !== reporter.owner ||
    record.phase !== expected.phase ||
    record.unit !== expected.unit ||
    record.outcome !== 'full'
  ) {
    throw new Error(`${id}: full trace identity mismatch`);
  }
  if (record.visited !== expected.visited) {
    throw new Error(`${id}: visited ${record.visited} differs from exact fixture count ${expected.visited}`);
  }
  if (record.reused !== 0 || record.changed !== record.visited) {
    throw new Error(`${id}: full path must report reused=0 and changed=visited`);
  }
  return record;
};

/** 从混合trace中要求指定owner/phase/unit恰好一条且全部字段精确匹配 */
export const assertSingleTraceRecord = (
  id: string,
  records: ReadonlyArray<PerformanceTraceRecord>,
  expected: PerformanceTraceRecord,
): PerformanceTraceRecord => {
  const unitRecords = records.filter(
    record => record.owner === expected.owner && record.phase === expected.phase && record.unit === expected.unit,
  );
  if (unitRecords.length !== 1) {
    throw new Error(
      `${id}: emitted ${unitRecords.length} ${expected.owner}/${expected.phase}/${expected.unit} records`,
    );
  }
  const record = unitRecords[0];
  if (
    record.outcome !== expected.outcome ||
    record.visited !== expected.visited ||
    record.reused !== expected.reused ||
    record.changed !== expected.changed
  ) {
    throw new Error(`${id}: trace record differs from the exact expected work`);
  }
  return record;
};
