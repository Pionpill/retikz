import type { AnyCompositeDefinition, IRNode, IRScene } from '@retikz/core';
import { CompositeBaseSchema, LayoutChildProbeKind, defineComposite, naturalLayoutProposal } from '@retikz/core';
import type { CompileOptions } from '@retikz/reconciler';
import { expect } from 'vitest';
import { boolean, literal, number, strictObject } from 'zod';

import { benchmarkCompileOptions, createBenchmarkNode } from '../reconcile/_execution';
import { compileBenchmarkSnapshot } from '../reconcile/_snapshot';
import { createUpdateWorkload, updateChild } from '../reconcile/_update-workload';

/** 用同一注册契约比较直接展开与试算后重放，不引入领域算法 */
const benchmarkComposite: AnyCompositeDefinition = defineComposite({
  namespace: 'benchmark',
  type: 'cell',
  schema: CompositeBaseSchema.extend({
    namespace: literal('benchmark'),
    type: literal('cell'),
    replay: boolean(),
    slot: number(),
  }),
  artifactSchema: strictObject({ slot: number() }),
  compile: (node, context) => {
    const child: IRNode = {
      ...createBenchmarkNode(node.slot),
      text: 'cell',
      position: { of: 'anchor', direction: 'right', distance: node.slot * 100 },
    };
    if (!node.replay) return { children: [child], artifact: { slot: node.slot } };
    const probe = context.layoutChild(child, naturalLayoutProposal);
    if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
    return { children: [context.replay(probe.result)], artifact: { slot: node.slot } };
  },
});

/** 固定注册定义与文字测量，实例扩容只改变作者与输出数量 */
export const compositeCompileOptions: CompileOptions = { ...benchmarkCompileOptions, composites: [benchmarkComposite] };

/** 首次编译与更新复用同一复合场景 */
export const createCompositeScene = (count: number, replay: boolean): IRScene => ({
  type: 'scene',
  version: 1,
  children: [
    { ...createBenchmarkNode(0), id: 'anchor' },
    ...Array.from({ length: count }, (_, slot) => ({ namespace: 'benchmark', type: 'cell', slot, replay })),
  ],
});

/** 独立非增量输出校验所有实例和显式产物 */
export const createCompositeWorkload = (count: number, replay: boolean) => {
  const ir = createCompositeScene(count, replay);
  const expected = compileBenchmarkSnapshot(ir, compositeCompileOptions);
  const before = JSON.stringify(ir);
  return {
    ir,
    verify: (result: typeof expected.result) => {
      expect(result).toEqual(expected.result);
      expect(result.artifacts).toHaveLength(count);
      expect(JSON.stringify(ir)).toBe(before);
    },
  };
};

/** 分别更新中间实例或外部生产者，检查独立实例、复用和失效 */
export const createCompositeUpdate = (count: number, replay: boolean, change: 'paint' | 'position' | 'instance') => {
  const first = createCompositeScene(count, replay);
  if (change === 'instance') {
    const index = 1 + Math.floor(count / 2);
    const item = { namespace: 'benchmark', type: 'cell', replay, slot: index - 1 };
    const nextItem = { ...item, slot: count };
    return createUpdateWorkload(
      [first, { ...first, children: first.children.map((child, i) => (i === index ? nextItem : child)) }],
      root => [[updateChild(root, index, nextItem)], [updateChild(root, index, item)]],
      1,
    );
  }
  const original: IRNode = { ...createBenchmarkNode(0), id: 'anchor' };
  const next: IRNode =
    change === 'paint'
      ? { ...original, style: { ...original.style, fill: '#ef4444' } }
      : { ...original, position: [10, 20] };
  return createUpdateWorkload(
    [first, { ...first, children: [next, ...first.children.slice(1)] }],
    root => [[updateChild(root, 0, next)], [updateChild(root, 0, original)]],
    1,
  );
};
