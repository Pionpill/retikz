import { describe, expect, it, vi } from 'vitest';

import type { PerformanceTraceRecord, RuntimeTraceReporter } from '../../src';

import {
  createRuntimeTraceReporter,
  PerformanceTraceOutcome,
  PerformanceTracePhase,
  PerformanceTraceUnit,
} from '../../src';

const createCompileReporter = (sink: (record: PerformanceTraceRecord) => void): RuntimeTraceReporter =>
  createRuntimeTraceReporter({
    owner: '@retikz/core',
    phases: [
      {
        phase: PerformanceTracePhase.Compile,
        unit: PerformanceTraceUnit.IrChild,
        outcomes: [
          PerformanceTraceOutcome.Full,
          PerformanceTraceOutcome.Incremental,
          PerformanceTraceOutcome.Bailout,
          PerformanceTraceOutcome.Fallback,
        ],
      },
    ],
    sink,
  });

describe('createRuntimeTraceReporter', () => {
  it('注入固定 owner，并向 sink 发送冻结的 record', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const reporter = createCompileReporter(record => records.push(record));
    const input = {
      phase: PerformanceTracePhase.Compile,
      unit: PerformanceTraceUnit.IrChild,
      outcome: PerformanceTraceOutcome.Full,
      visited: 3,
      reused: 0,
      changed: 3,
    };

    reporter.report(input);
    input.visited = 99;

    expect(records).toEqual([
      {
        owner: '@retikz/core',
        phase: PerformanceTracePhase.Compile,
        unit: PerformanceTraceUnit.IrChild,
        outcome: PerformanceTraceOutcome.Full,
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
          phase: PerformanceTracePhase.Compile,
          unit: PerformanceTraceUnit.IrChild,
          outcomes: [PerformanceTraceOutcome.Full],
        },
      ],
      sink: originalSink,
    };
    const reporter = createRuntimeTraceReporter(input);

    input.owner = '@retikz/other';
    input.sink = replacementSink;
    reporter.report({
      phase: PerformanceTracePhase.Compile,
      unit: PerformanceTraceUnit.IrChild,
      outcome: PerformanceTraceOutcome.Full,
      visited: 1,
      reused: 0,
      changed: 1,
    });

    expect(reporter.owner).toBe('@retikz/core');
    expect(originalSink).toHaveBeenCalledWith(expect.objectContaining({ owner: '@retikz/core' }));
    expect(replacementSink).not.toHaveBeenCalled();
  });

  it('拒绝空 outcomes 与重复 phase/unit definition', () => {
    expect(() =>
      createRuntimeTraceReporter({
        owner: '@retikz/core',
        phases: [{ phase: PerformanceTracePhase.Compile, unit: PerformanceTraceUnit.IrChild, outcomes: [] }],
        sink: vi.fn(),
      }),
    ).toThrow(/createRuntimeTraceReporter/);
    const definition = {
      phase: PerformanceTracePhase.Compile,
      unit: PerformanceTraceUnit.IrChild,
      outcomes: [PerformanceTraceOutcome.Full],
    } as const;
    expect(() =>
      createRuntimeTraceReporter({ owner: '@retikz/core', phases: [definition, definition], sink: vi.fn() }),
    ).toThrow(/duplicate/i);
  });

  it('允许空 phase 列表，并把未声明报告作为非致命诊断', () => {
    const sink = vi.fn();
    const reporter = createRuntimeTraceReporter({ owner: '@retikz/program', phases: [], sink });

    reporter.report({
      phase: PerformanceTracePhase.Update,
      unit: PerformanceTraceUnit.Program,
      outcome: PerformanceTraceOutcome.Full,
      visited: 1,
      reused: 0,
      changed: 1,
    });

    expect(sink).not.toHaveBeenCalled();
    expect(reporter.diagnostics()).toEqual([
      { code: 'invalid-record', owner: '@retikz/program', phase: PerformanceTracePhase.Update },
    ]);
  });

  it('允许同一 phase 声明不同 unit，并分别校验 outcome', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const reporter = createRuntimeTraceReporter({
      owner: '@retikz/program',
      phases: [
        {
          phase: PerformanceTracePhase.Update,
          unit: PerformanceTraceUnit.Program,
          outcomes: [PerformanceTraceOutcome.Incremental],
        },
        {
          phase: PerformanceTracePhase.Update,
          unit: PerformanceTraceUnit.SceneChange,
          outcomes: [PerformanceTraceOutcome.Commit],
        },
      ],
      sink: record => records.push(record),
    });

    reporter.report({
      phase: PerformanceTracePhase.Update,
      unit: PerformanceTraceUnit.Program,
      outcome: PerformanceTraceOutcome.Incremental,
      visited: 2,
      reused: 1,
      changed: 1,
    });
    reporter.report({
      phase: PerformanceTracePhase.Update,
      unit: PerformanceTraceUnit.SceneChange,
      outcome: PerformanceTraceOutcome.Commit,
      visited: 1,
      reused: 0,
      changed: 1,
    });
    reporter.report({
      phase: PerformanceTracePhase.Update,
      unit: PerformanceTraceUnit.Program,
      outcome: PerformanceTraceOutcome.Commit,
      visited: 1,
      reused: 0,
      changed: 1,
    });
    reporter.report({
      phase: PerformanceTracePhase.Update,
      unit: PerformanceTraceUnit.SceneChange,
      outcome: PerformanceTraceOutcome.Incremental,
      visited: 1,
      reused: 0,
      changed: 1,
    });

    expect(records.map(record => [record.unit, record.outcome])).toEqual([
      [PerformanceTraceUnit.Program, PerformanceTraceOutcome.Incremental],
      [PerformanceTraceUnit.SceneChange, PerformanceTraceOutcome.Commit],
    ]);
    expect(reporter.diagnostics()).toEqual([
      { code: 'invalid-record', owner: '@retikz/program', phase: PerformanceTracePhase.Update },
      { code: 'invalid-record', owner: '@retikz/program', phase: PerformanceTracePhase.Update },
    ]);
  });

  it.each([
    ['negative count', { visited: -1, reused: 0, changed: 0 }],
    ['non-safe count', { visited: Number.MAX_SAFE_INTEGER + 1, reused: 0, changed: 0 }],
    ['reused overflow', { visited: 1, reused: 2, changed: 0 }],
    ['changed overflow', { visited: 1, reused: 0, changed: 2 }],
    ['bailout changed', { visited: 1, reused: 1, changed: 1, outcome: PerformanceTraceOutcome.Bailout }],
  ])('拒绝无效关系：%s', (_name, counts) => {
    const sink = vi.fn();
    const reporter = createCompileReporter(sink);

    reporter.report({
      phase: PerformanceTracePhase.Compile,
      unit: PerformanceTraceUnit.IrChild,
      outcome: 'outcome' in counts ? counts.outcome : PerformanceTraceOutcome.Full,
      visited: counts.visited,
      reused: counts.reused,
      changed: counts.changed,
    });

    expect(sink).not.toHaveBeenCalled();
    expect(reporter.diagnostics()).toEqual([
      { code: 'invalid-record', owner: '@retikz/core', phase: PerformanceTracePhase.Compile },
    ]);
  });

  it('拒绝未声明的 unit 和 outcome', () => {
    const sink = vi.fn();
    const reporter = createCompileReporter(sink);

    reporter.report({
      phase: PerformanceTracePhase.Compile,
      unit: PerformanceTraceUnit.ScenePrimitive,
      outcome: PerformanceTraceOutcome.Commit,
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
        phase: PerformanceTracePhase.Compile,
        unit: PerformanceTraceUnit.IrChild,
        outcome: PerformanceTraceOutcome.Full,
        visited: 0,
        reused: 0,
        changed: 0,
      }),
    ).not.toThrow();

    const diagnostics = reporter.diagnostics();
    expect(diagnostics).toEqual([{ code: 'sink-threw', owner: '@retikz/core', phase: PerformanceTracePhase.Compile }]);
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
        visited: 0,
        changed: 0,
      });
    });

    reporter.report({
      phase: PerformanceTracePhase.Compile,
      unit: PerformanceTraceUnit.IrChild,
      outcome: PerformanceTraceOutcome.Full,
      visited: 1,
      reused: 0,
      changed: 1,
    });

    expect(records).toHaveLength(1);
    expect(reporter.diagnostics()).toEqual([
      { code: 'reentrant-report', owner: '@retikz/core', phase: PerformanceTracePhase.Compile },
    ]);
  });
});
