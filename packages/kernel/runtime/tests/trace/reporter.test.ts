import { describe, expect, it, vi } from 'vitest';

import type { PerformanceTraceRecord, RuntimeTracePhaseDefinition, RuntimeTraceReporter } from '../../src';

import { createRuntimeTraceReporter } from '../../src';

const createCompileReporter = (sink: (record: PerformanceTraceRecord) => void): RuntimeTraceReporter =>
  createRuntimeTraceReporter({
    owner: '@retikz/core',
    phases: [
      {
        phase: 'compile',
        unit: 'ir-child',
        outcomes: ['full', 'incremental', 'bailout', 'fallback'],
      },
    ],
    sink,
  });

describe('createRuntimeTraceReporter', () => {
  it('注入固定 owner，并向 sink 发送冻结的 record', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const reporter = createCompileReporter(record => records.push(record));
    const input = {
      phase: 'compile' as const,
      unit: 'ir-child' as const,
      outcome: 'full' as const,
      visited: 3,
      reused: 0,
      changed: 3,
    };

    reporter.report(input);
    input.visited = 99;

    expect(records).toEqual([
      {
        owner: '@retikz/core',
        phase: 'compile',
        unit: 'ir-child',
        outcome: 'full',
        visited: 3,
        reused: 0,
        changed: 3,
      },
    ]);
    expect(Object.isFrozen(records[0])).toBe(true);
    expect(reporter.diagnostics()).toEqual([]);
  });

  it('创建时快照 owner 与 sink，不受配置对象后续变异影响', () => {
    const originalSink = vi.fn();
    const replacementSink = vi.fn();
    const input = {
      owner: '@retikz/core',
      phases: [
        {
          phase: 'compile' as const,
          unit: 'ir-child' as const,
          outcomes: ['full' as const],
        },
      ],
      sink: originalSink,
    };
    const reporter = createRuntimeTraceReporter(input);

    input.owner = '@retikz/other';
    input.sink = replacementSink;
    reporter.report({
      phase: 'compile',
      unit: 'ir-child',
      outcome: 'full',
      visited: 1,
      reused: 0,
      changed: 1,
    });

    expect(reporter.owner).toBe('@retikz/core');
    expect(originalSink).toHaveBeenCalledWith(expect.objectContaining({ owner: '@retikz/core' }));
    expect(replacementSink).not.toHaveBeenCalled();
  });

  it.each([
    ['phase', { phase: 'unknown', unit: 'ir-child', outcomes: ['full'] }],
    ['unit', { phase: 'compile', unit: 'unknown', outcomes: ['full'] }],
    ['outcome', { phase: 'compile', unit: 'ir-child', outcomes: ['unknown'] }],
  ])('拒绝含非法封闭值的 phase definition：%s', (_name, definition) => {
    expect(() =>
      createRuntimeTraceReporter({
        owner: '@retikz/core',
        phases: [definition as unknown as RuntimeTracePhaseDefinition],
        sink: vi.fn(),
      }),
    ).toThrow(/createRuntimeTraceReporter/);
  });

  it('允许空 phase 列表，并把未声明报告作为非致命诊断', () => {
    const sink = vi.fn();
    const reporter = createRuntimeTraceReporter({ owner: '@retikz/program', phases: [], sink });

    reporter.report({
      phase: 'update',
      unit: 'program',
      outcome: 'full',
      visited: 1,
      reused: 0,
      changed: 1,
    });

    expect(sink).not.toHaveBeenCalled();
    expect(reporter.diagnostics()).toEqual([{ code: 'invalid-record', owner: '@retikz/program', phase: 'update' }]);
  });

  it('允许同一 phase 声明不同 unit，并分别校验 outcome', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const reporter = createRuntimeTraceReporter({
      owner: '@retikz/program',
      phases: [
        { phase: 'update', unit: 'program', outcomes: ['incremental'] },
        { phase: 'update', unit: 'scene-change', outcomes: ['commit'] },
      ],
      sink: record => records.push(record),
    });

    reporter.report({
      phase: 'update',
      unit: 'program',
      outcome: 'incremental',
      visited: 2,
      reused: 1,
      changed: 1,
    });
    reporter.report({
      phase: 'update',
      unit: 'scene-change',
      outcome: 'commit',
      visited: 1,
      reused: 0,
      changed: 1,
    });
    reporter.report({
      phase: 'update',
      unit: 'program',
      outcome: 'commit',
      visited: 1,
      reused: 0,
      changed: 1,
    });
    reporter.report({
      phase: 'update',
      unit: 'scene-change',
      outcome: 'incremental',
      visited: 1,
      reused: 0,
      changed: 1,
    });

    expect(records.map(record => [record.unit, record.outcome])).toEqual([
      ['program', 'incremental'],
      ['scene-change', 'commit'],
    ]);
    expect(reporter.diagnostics()).toEqual([
      { code: 'invalid-record', owner: '@retikz/program', phase: 'update' },
      { code: 'invalid-record', owner: '@retikz/program', phase: 'update' },
    ]);
  });

  it('非法 record phase 不会泄漏到封闭 diagnostic', () => {
    const reporter = createCompileReporter(vi.fn());
    const invalidRecord = {
      phase: 'unknown',
      unit: 'ir-child',
      outcome: 'full',
      visited: 1,
      reused: 0,
      changed: 1,
    } as unknown as Parameters<RuntimeTraceReporter['report']>[0];

    reporter.report(invalidRecord);

    expect(reporter.diagnostics()).toEqual([{ code: 'invalid-record', owner: '@retikz/core', phase: 'compile' }]);
  });

  it.each([
    ['negative count', { visited: -1, reused: 0, changed: 0 }],
    ['non-safe count', { visited: Number.MAX_SAFE_INTEGER + 1, reused: 0, changed: 0 }],
    ['reused overflow', { visited: 1, reused: 2, changed: 0 }],
    ['changed overflow', { visited: 1, reused: 0, changed: 2 }],
    ['bailout changed', { visited: 1, reused: 1, changed: 1, outcome: 'bailout' as const }],
  ])('拒绝无效关系：%s', (_name, counts) => {
    const sink = vi.fn();
    const reporter = createCompileReporter(sink);

    reporter.report({
      phase: 'compile',
      unit: 'ir-child',
      outcome: 'outcome' in counts ? counts.outcome : 'full',
      visited: counts.visited,
      reused: counts.reused,
      changed: counts.changed,
    });

    expect(sink).not.toHaveBeenCalled();
    expect(reporter.diagnostics()).toEqual([{ code: 'invalid-record', owner: '@retikz/core', phase: 'compile' }]);
  });

  it('拒绝未声明的 unit 和 outcome', () => {
    const sink = vi.fn();
    const reporter = createCompileReporter(sink);

    reporter.report({
      phase: 'compile',
      unit: 'scene-primitive',
      outcome: 'commit',
      visited: 1,
      reused: 0,
      changed: 1,
    });

    expect(sink).not.toHaveBeenCalled();
    expect(reporter.diagnostics()).toHaveLength(1);
  });

  it('隔离 sink throw，并在读取后清空 diagnostics', () => {
    const reporter = createCompileReporter(() => {
      throw new Error('sink failed');
    });

    expect(() =>
      reporter.report({
        phase: 'compile',
        unit: 'ir-child',
        outcome: 'full',
        visited: 0,
        reused: 0,
        changed: 0,
      }),
    ).not.toThrow();

    const diagnostics = reporter.diagnostics();
    expect(diagnostics).toEqual([{ code: 'sink-threw', owner: '@retikz/core', phase: 'compile' }]);
    expect(Object.isFrozen(diagnostics)).toBe(true);
    expect(Object.isFrozen(diagnostics[0])).toBe(true);
    expect(reporter.diagnostics()).toEqual([]);
  });

  it('拒绝同一 reporter 的同步重入但保留外层发射', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const reporter = createCompileReporter(record => {
      records.push(record);
      reporter.report({
        ...record,
        phase: 'unknown',
        visited: 0,
        changed: 0,
      } as unknown as Parameters<RuntimeTraceReporter['report']>[0]);
    });

    reporter.report({
      phase: 'compile',
      unit: 'ir-child',
      outcome: 'full',
      visited: 1,
      reused: 0,
      changed: 1,
    });

    expect(records).toHaveLength(1);
    expect(reporter.diagnostics()).toEqual([{ code: 'reentrant-report', owner: '@retikz/core', phase: 'compile' }]);
  });
});
