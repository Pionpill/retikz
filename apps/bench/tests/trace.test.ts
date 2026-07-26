import type { PerformanceTraceRecord } from '@retikz/runtime';

import { createRuntimeTraceReporter } from '@retikz/runtime';
import { describe, expect, it } from 'vitest';

import { assertFullTrace } from '../src/trace';

const expected = Object.freeze({ phase: 'compile' as const, unit: 'ir-child' as const, visited: 1 });

describe('full trace assertion', () => {
  it('接受恰好一条无诊断且满足 full 不变量的记录', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const reporter = createRuntimeTraceReporter({
      owner: '@retikz/core',
      phases: [{ phase: 'compile', unit: 'ir-child', outcomes: ['full'] }],
      sink: record => records.push(record),
    });
    reporter.report({ phase: 'compile', unit: 'ir-child', outcome: 'full', visited: 1, reused: 0, changed: 1 });

    expect(assertFullTrace('core-full-1', reporter, records, expected)).toEqual(records[0]);
  });

  it('即使同时收到合法记录，也拒绝 reporter 中的非法记录诊断', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const reporter = createRuntimeTraceReporter({
      owner: '@retikz/core',
      phases: [{ phase: 'compile', unit: 'ir-child', outcomes: ['full'] }],
      sink: record => records.push(record),
    });
    reporter.report({ phase: 'compile', unit: 'ir-child', outcome: 'full', visited: 1, reused: 0, changed: 1 });
    reporter.report({ phase: 'compile', unit: 'ir-child', outcome: 'full', visited: -1, reused: 0, changed: 0 });

    expect(() => assertFullTrace('core-full-1', reporter, records, expected)).toThrow(/diagnostics/i);
  });
});
