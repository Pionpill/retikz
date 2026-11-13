import type { IRScene } from '@retikz/core';
import { CompositeBaseSchema, defineComposite, LayoutChildProbeKind, naturalLayoutProposal } from '@retikz/core';
import type { PerformanceTraceRecord } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import { SceneReconciler, ReconcilerLifecyclePhase, ReconcilerTraceUnit } from '../../src';
import { compileTestResult } from '../helpers/compilation';

const scene = (children: IRScene['children']): IRScene => ({ version: 1, type: 'scene', children });

describe('协调器编译跟踪', () => {
  it('完整模式首次 replace 报告挂载，后续替换报告更新，清理仅报告一次', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const session = new SceneReconciler({}, { incremental: false, trace: record => records.push(record) });
    session.replace(scene([]));
    session.updateTarget();
    session.replace(scene([]));
    session.dispose();
    session.dispose();

    expect(records).toEqual([
      {
        owner: 'kernel/reconciler',
        phase: 'mount',
        unit: 'scene-compile',
        outcome: 'full',
        visited: 1,
        reused: 0,
        changed: 1,
      },
      {
        owner: 'kernel/reconciler',
        phase: 'update',
        unit: 'scene-compile',
        outcome: 'full',
        visited: 1,
        reused: 0,
        changed: 1,
      },
      {
        owner: 'kernel/reconciler',
        phase: 'unmount',
        unit: 'session',
        outcome: 'dispose',
        visited: 1,
        reused: 0,
        changed: 1,
      },
    ]);
  });

  it('清理失败不报告卸载，重试成功后报告一次且隔离观察异常', () => {
    const records: Array<PerformanceTraceRecord> = [];
    let failCleanup = true;
    const observerError = new Error('observer');
    const session = new SceneReconciler(
      {},
      {
        trace: record => {
          records.push(record);
          if (record.phase === 'unmount') throw observerError;
        },
        target: {
          prepare: () => ({ commit: () => undefined, rollback: () => undefined, dispose: () => undefined }),
          dispose: () => {
            if (failCleanup) throw new Error('cleanup');
          },
        },
      },
    );
    session.mount(scene([]));
    session.dispose();
    expect(records.map(record => record.phase)).toEqual(['mount']);
    expect(session.diagnostics()).toMatchObject([{ code: 'RECONCILER_CLEANUP_FAILED' }]);
    failCleanup = false;
    session.dispose();
    session.dispose();
    expect(records.map(record => record.phase)).toEqual(['mount', 'unmount']);
    expect(records[1]).toMatchObject({ unit: 'session', outcome: 'dispose', visited: 1, reused: 0, changed: 1 });
    expect(session.diagnostics()).toMatchObject([{ code: 'RECONCILER_TRACE_FAILED', cause: observerError }]);
    expect(() => session.read()).toThrow();
  });

  it('首次发布失败不报告挂载，重试成功仍报告挂载；未挂载清理不报告卸载', () => {
    const records: Array<PerformanceTraceRecord> = [];
    let failCommit = true;
    const session = new SceneReconciler(
      {},
      {
        trace: record => records.push(record),
        target: {
          prepare: () => ({
            commit: () => {
              if (failCommit) throw new Error('commit');
            },
            rollback: () => undefined,
            dispose: () => undefined,
          }),
        },
      },
    );
    expect(() => session.mount(scene([]))).toThrow();
    expect(records).toEqual([]);
    failCommit = false;
    session.replace(scene([]));
    expect(records.map(record => record.phase)).toEqual(['mount']);
    session.dispose();

    const unmountedRecords: Array<PerformanceTraceRecord> = [];
    const unmounted = new SceneReconciler({}, { trace: record => unmountedRecords.push(record) });
    unmounted.dispose();
    expect(unmountedRecords).toEqual([]);
  });

  it('基础场景报告实际 Weave 元素编译次数', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const trace = (record: PerformanceTraceRecord) => records.push(record);

    const session = new SceneReconciler({}, { trace });
    session.mount(
      scene([
        { type: 'node', id: 'outside', position: [0, 0] },
        {
          type: 'scope',
          children: [{ type: 'node', id: 'inside', position: [20, 0] }],
        },
      ]),
    );

    expect(records).toEqual([
      {
        owner: 'kernel/reconciler',
        phase: ReconcilerLifecyclePhase.Mount,
        unit: ReconcilerTraceUnit.ElementCompile,
        outcome: 'full',
        visited: 3,
        reused: 0,
        changed: 3,
      },
    ]);
    session.dispose();
  });

  it('空 Scene 仍报告一次零计数，未注入 trace 时输出保持等价', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const trace = (record: PerformanceTraceRecord) => records.push(record);
    const input = scene([]);

    const session = new SceneReconciler({}, { trace });
    const mounted = session.mount(input);
    const traced = mounted.compilation.result;
    expect(session.update({ operations: [] })).toBe(mounted);
    const plain = compileTestResult(input);

    expect(traced).toEqual(plain);
    expect(records).toEqual([
      {
        owner: 'kernel/reconciler',
        phase: ReconcilerLifecyclePhase.Mount,
        unit: ReconcilerTraceUnit.ElementCompile,
        outcome: 'full',
        visited: 0,
        reused: 0,
        changed: 0,
      },
    ]);
    session.dispose();
  });

  it('Composite 按作者声明计数，不按生成子节点计数', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const trace = (record: PerformanceTraceRecord) => records.push(record);
    const composite = defineComposite({
      namespace: 'trace',
      type: 'replay',
      schema: CompositeBaseSchema.extend({
        namespace: literal('trace'),
        type: literal('replay'),
      }),
      compile: (_node, context) => {
        const child = context.layoutChild({ type: 'node', id: 'replayed', position: [0, 0] }, naturalLayoutProposal);
        if (child.kind === LayoutChildProbeKind.Failed) return context.raise(child.failure);
        return { children: [context.replay(child.result)] };
      },
    });

    const session = new SceneReconciler({ composites: [composite] }, { trace });
    session.mount(scene([{ namespace: 'trace', type: 'replay' }]));
    session.replace(
      scene([
        { namespace: 'trace', type: 'replay' },
        { type: 'node', position: [20, 0] },
      ]),
    );

    expect(records).toHaveLength(2);
    for (const [index, record] of records.entries()) {
      expect(record).toEqual({
        owner: 'kernel/reconciler',
        phase: index === 0 ? ReconcilerLifecyclePhase.Mount : ReconcilerLifecyclePhase.Update,
        unit: ReconcilerTraceUnit.ElementCompile,
        outcome: 'full',
        visited: index + 1,
        reused: 0,
        changed: index + 1,
      });
    }
    session.dispose();
  });
});
