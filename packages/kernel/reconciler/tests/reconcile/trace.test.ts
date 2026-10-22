import type { IRScene } from '@retikz/core';
import {
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  LayoutChildProbeKind,
  NaturalLayoutProposal,
} from '@retikz/core';
import type { PerformanceTraceRecord } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import { ReconcilerSession, ReconcilerTracePhase, ReconcilerTraceUnit } from '../../src';

const scene = (children: IRScene['children']): IRScene => ({ version: 1, type: 'scene', children });

describe('Reconciler compilation trace', () => {
  it('基础场景报告实际 Weave 元素编译次数', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const trace = (record: PerformanceTraceRecord) => records.push(record);

    const session = new ReconcilerSession({}, { trace });
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
        owner: '@retikz/reconciler',
        phase: ReconcilerTracePhase.Update,
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

    const session = new ReconcilerSession({}, { trace });
    const mounted = session.mount(input);
    const traced = mounted.compilation.result;
    expect(session.update({ operations: [] })).toBe(mounted);
    const plain = compileToScene(input);

    expect(traced).toEqual(plain);
    expect(records).toEqual([
      {
        owner: '@retikz/reconciler',
        phase: ReconcilerTracePhase.Update,
        unit: ReconcilerTraceUnit.ElementCompile,
        outcome: 'full',
        visited: 0,
        reused: 0,
        changed: 0,
      },
    ]);
    session.dispose();
  });

  it('Composite 整场景编译始终计一次，不按展开子节点计数', () => {
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
        const child = context.layoutChild({ type: 'node', id: 'replayed', position: [0, 0] }, NaturalLayoutProposal);
        if (child.kind === LayoutChildProbeKind.Failed) return context.raise(child.failure);
        return { children: [context.replay(child.result)] };
      },
    });

    const session = new ReconcilerSession({ composites: [composite] }, { trace });
    session.mount(scene([{ namespace: 'trace', type: 'replay' }]));
    session.replace(
      scene([
        { namespace: 'trace', type: 'replay' },
        { type: 'node', position: [20, 0] },
      ]),
    );

    expect(records).toHaveLength(2);
    for (const record of records) {
      expect(record).toEqual({
        owner: '@retikz/reconciler',
        phase: ReconcilerTracePhase.Update,
        unit: ReconcilerTraceUnit.SceneCompile,
        outcome: 'full',
        visited: 1,
        reused: 0,
        changed: 1,
      });
    }
    session.dispose();
  });
});
