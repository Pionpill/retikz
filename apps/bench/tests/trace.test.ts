import type { PerformanceTraceRecord } from '@retikz/runtime';

import { createRuntimeTraceReporter } from '@retikz/runtime';
import { describe, expect, it } from 'vitest';

import { assertFullTrace, assertSingleTraceRecord } from '../src/trace';

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

describe('single trace assertion', () => {
  const incremental: PerformanceTraceRecord = Object.freeze({
    owner: '@retikz/render:svg',
    phase: 'update',
    unit: 'scene-change',
    outcome: 'incremental',
    visited: 1,
    reused: 0,
    changed: 1,
  });

  it('允许其它unit记录，但拒绝同unit额外outcome或工作量漂移', () => {
    const unrelated: PerformanceTraceRecord = Object.freeze({
      ...incremental,
      unit: 'ir-child',
      visited: 5_000,
      reused: 4_999,
    });
    expect(assertSingleTraceRecord('svg-update', [unrelated, incremental], incremental)).toBe(incremental);
    expect(() =>
      assertSingleTraceRecord('svg-update', [incremental, { ...incremental, outcome: 'fallback' }], incremental),
    ).toThrow(/2.*records/i);
    expect(() => assertSingleTraceRecord('svg-update', [{ ...incremental, changed: 2 }], incremental)).toThrow(
      /exact expected work/i,
    );
  });
});
