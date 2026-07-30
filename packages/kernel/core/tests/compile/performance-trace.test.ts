import type { PerformanceTraceRecord } from '@retikz/runtime';

import { createRuntimeTraceReporter } from '@retikz/runtime';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { IRScene } from '../../src';

import {
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  LayoutChildProbeKind,
  NaturalLayoutProposal,
} from '../../src';

const scene = (children: IRScene['children']): IRScene => ({ version: 1, type: 'scene', children });

describe('compileToScene performance trace', () => {
  it('每次成功 full compile 只报告一条精确 IRChild dispatch 计数', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const trace = createRuntimeTraceReporter({
      owner: '@retikz/core',
      phases: [{ phase: 'compile', unit: 'ir-child', outcomes: ['full'] }],
      sink: record => records.push(record),
    });

    compileToScene(
      scene([
        { type: 'node', id: 'outside', position: [0, 0] },
        {
          type: 'scope',
          children: [{ type: 'node', id: 'inside', position: [20, 0] }],
        },
      ]),
      { trace },
    );

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
  });

  it('空 Scene 仍报告一次零计数，未注入 trace 时输出保持等价', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const trace = createRuntimeTraceReporter({
      owner: '@retikz/core',
      phases: [{ phase: 'compile', unit: 'ir-child', outcomes: ['full'] }],
      sink: record => records.push(record),
    });
    const input = scene([]);

    const traced = compileToScene(input, { trace });
    const plain = compileToScene(input);

    expect(traced).toEqual(plain);
    expect(records).toEqual([
      {
        owner: '@retikz/core',
        phase: 'compile',
        unit: 'ir-child',
        outcome: 'full',
        visited: 0,
        reused: 0,
        changed: 0,
      },
    ]);
  });

  it('layoutChild sandbox dispatch 计数，replay 不重复计数', () => {
    const records: Array<PerformanceTraceRecord> = [];
    const trace = createRuntimeTraceReporter({
      owner: '@retikz/core',
      phases: [{ phase: 'compile', unit: 'ir-child', outcomes: ['full'] }],
      sink: record => records.push(record),
    });
    const composite = defineComposite({
      namespace: 'trace',
      type: 'replay',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('trace'),
        type: z.literal('replay'),
      }),
      compile: (_node, context) => {
        const child = context.layoutChild({ type: 'node', id: 'replayed', position: [0, 0] }, NaturalLayoutProposal);
        if (child.kind === LayoutChildProbeKind.Failed) return context.raise(child.failure);
        return { children: [context.replay(child.result)] };
      },
    });

    compileToScene(scene([{ namespace: 'trace', type: 'replay' }]), {
      composites: [composite],
      trace,
    });

    expect(records[0]).toMatchObject({ visited: 2, reused: 0, changed: 2 });
  });
});
