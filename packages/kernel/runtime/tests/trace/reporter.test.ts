import { describe, expect, it, vi } from 'vitest';

import type { PerformanceTraceRecord, RuntimeTraceReporter } from '../../src';
import { createRuntimeTraceReporter, PerformanceTraceOutcome } from '../../src';

const createCompileReporter = (sink: (record: PerformanceTraceRecord) => void): RuntimeTraceReporter =>
  createRuntimeTraceReporter({
    owner: '@retikz/core',
    phases: [
      {
        phase: 'compile',
        unit: 'ir-child',
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
  it('允许 owner 声明自定义阶段和单位，精确匹配名称并隔离未声明记录', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const reporter = createRuntimeTraceReporter({
      owner: '@example/plot',
      phases: [{ phase: ' Axis-Layout ', unit: 'domain-row', outcomes: [PerformanceTraceOutcome.Full] }],
      sink: record => records.push(record),
    });
    const record = {
      phase: ' Axis-Layout ',
      unit: 'domain-row',
      outcome: PerformanceTraceOutcome.Full,
      visited: 2,
      reused: 0,
      changed: 2,
    };
    reporter.report(record);
    reporter.report({ ...record, phase: 'Axis-Layout' });
    reporter.report({ ...record, phase: ' axis-layout ' });
    reporter.report({ ...record, unit: 'Domain-row' });
    expect(records).toEqual([{ ...record, owner: '@example/plot' }]);
    expect(reporter.diagnostics()).toEqual([
      { code: 'invalid-record', owner: '@example/plot', phase: 'Axis-Layout' },
      { code: 'invalid-record', owner: '@example/plot', phase: ' axis-layout ' },
      { code: 'invalid-record', owner: '@example/plot', phase: ' Axis-Layout ' },
    ]);
  });

  it('快照自定义阶段、单位与 outcomes，后续变异不改变报告能力', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const outcomes: Array<PerformanceTraceOutcome> = [PerformanceTraceOutcome.Full];
    const definition = { phase: 'table-pipeline', unit: 'cell', outcomes };
    const phases = [definition];
    const reporter = createRuntimeTraceReporter({
      owner: '@example/table',
      phases,
      sink: record => records.push(record),
    });
    definition.phase = 'mutated';
    definition.unit = 'row';
    definition.outcomes.push(PerformanceTraceOutcome.Incremental);
    phases.length = 0;
    const record = {
      phase: 'table-pipeline',
      unit: 'cell',
      outcome: PerformanceTraceOutcome.Full,
      visited: 3,
      reused: 0,
      changed: 3,
    };
    reporter.report(record);
    reporter.report({ ...record, outcome: PerformanceTraceOutcome.Incremental });
    reporter.report({ ...record, phase: 'mutated', unit: 'row' });
    expect(records).toEqual([{ ...record, owner: '@example/table' }]);
    expect(reporter.diagnostics().map(diagnostic => diagnostic.code)).toEqual(['invalid-record', 'invalid-record']);
  });

  it('允许 reused 与 changed 的合法重叠，不将二者解释为互斥分区', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const reporter = createRuntimeTraceReporter({
      owner: '@example/table',
      phases: [{ phase: 'reconcile', unit: 'cell', outcomes: [PerformanceTraceOutcome.Incremental] }],
      sink: record => records.push(record),
    });
    reporter.report({
      phase: 'reconcile',
      unit: 'cell',
      outcome: PerformanceTraceOutcome.Incremental,
      visited: 2,
      reused: 2,
      changed: 2,
    });
    expect(records).toEqual([
      {
        owner: '@example/table',
        phase: 'reconcile',
        unit: 'cell',
        outcome: PerformanceTraceOutcome.Incremental,
        visited: 2,
        reused: 2,
        changed: 2,
      },
    ]);
    expect(reporter.diagnostics()).toEqual([]);
  });

  it('注入固定 owner，并向 sink 发送冻结的 record', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const reporter = createCompileReporter(record => records.push(record));
    const input = {
      phase: 'compile',
      unit: 'ir-child',
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
        phase: 'compile',
        unit: 'ir-child',
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
          phase: 'compile',
          unit: 'ir-child',
          outcomes: [PerformanceTraceOutcome.Full],
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
        phases: [{ phase: 'compile', unit: 'ir-child', outcomes: [] }],
        sink: vi.fn(),
      }),
    ).toThrow(/createRuntimeTraceReporter/);

    const definition = {
      phase: 'compile',
      unit: 'ir-child',
      outcomes: [PerformanceTraceOutcome.Full],
    } as const;

    expect(() =>
      createRuntimeTraceReporter({ owner: '@retikz/core', phases: [definition, definition], sink: vi.fn() }),
    ).toThrow(/duplicate/i);
  });

  it('允许空 phase 列表，并把未声明报告作为非致命诊断', () => {
    const sink = vi.fn();
    const reporter = createRuntimeTraceReporter({ owner: '@retikz/computation', phases: [], sink });

    reporter.report({
      phase: 'update',
      unit: 'computation',
      outcome: PerformanceTraceOutcome.Full,
      visited: 1,
      reused: 0,
      changed: 1,
    });

    expect(sink).not.toHaveBeenCalled();
    expect(reporter.diagnostics()).toEqual([{ code: 'invalid-record', owner: '@retikz/computation', phase: 'update' }]);
  });

  it('允许同一 phase 声明不同 unit，并分别校验 outcome', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const reporter = createRuntimeTraceReporter({
      owner: '@retikz/computation',
      phases: [
        {
          phase: 'update',
          unit: 'computation',
          outcomes: [PerformanceTraceOutcome.Incremental],
        },
        {
          phase: 'update',
          unit: 'scene-change',
          outcomes: [PerformanceTraceOutcome.Commit],
        },
      ],
      sink: record => records.push(record),
    });

    reporter.report({
      phase: 'update',
      unit: 'computation',
      outcome: PerformanceTraceOutcome.Incremental,
      visited: 2,
      reused: 1,
      changed: 1,
    });
    reporter.report({
      phase: 'update',
      unit: 'scene-change',
      outcome: PerformanceTraceOutcome.Commit,
      visited: 1,
      reused: 0,
      changed: 1,
    });
    reporter.report({
      phase: 'update',
      unit: 'computation',
      outcome: PerformanceTraceOutcome.Commit,
      visited: 1,
      reused: 0,
      changed: 1,
    });
    reporter.report({
      phase: 'update',
      unit: 'scene-change',
      outcome: PerformanceTraceOutcome.Incremental,
      visited: 1,
      reused: 0,
      changed: 1,
    });

    expect(records.map(record => [record.unit, record.outcome])).toEqual([
      ['computation', PerformanceTraceOutcome.Incremental],
      ['scene-change', PerformanceTraceOutcome.Commit],
    ]);
    expect(reporter.diagnostics()).toEqual([
      { code: 'invalid-record', owner: '@retikz/computation', phase: 'update' },
      { code: 'invalid-record', owner: '@retikz/computation', phase: 'update' },
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
      phase: 'compile',
      unit: 'ir-child',
      outcome: 'outcome' in counts ? counts.outcome : PerformanceTraceOutcome.Full,
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
        phase: 'compile',
        unit: 'ir-child',
        outcome: PerformanceTraceOutcome.Full,
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
        visited: 0,
        changed: 0,
      });
    });

    reporter.report({
      phase: 'compile',
      unit: 'ir-child',
      outcome: PerformanceTraceOutcome.Full,
      visited: 1,
      reused: 0,
      changed: 1,
    });

    expect(records).toHaveLength(1);
    expect(reporter.diagnostics()).toEqual([{ code: 'reentrant-report', owner: '@retikz/core', phase: 'compile' }]);
  });
});
