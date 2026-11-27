import { CompositeBaseSchema, defineComposite, naturalLayoutProposal } from '@retikz/core';
import type { IRCoordinate, IRNode, IRPath, IRScene } from '@retikz/core';
import type { CompileOptions } from '@retikz/reconciler';
import { expect } from 'vitest';
import { boolean, literal, number } from 'zod';

import { benchmarkCompileOptions, createBenchmarkNode } from '../reconcile/_execution';
import { compileBenchmarkSnapshot } from '../reconcile/_snapshot';
import { createUpdateWorkload, updateChild } from '../reconcile/_update-workload';

type Slot = { x: number; width: number; fill: string; node: IRNode; path: IRPath };
type CollectionMemo = { slots: ReadonlyArray<Slot> };
// 一格包含正文节点与背景线；每格独立 Scope，末格发布坐标供外部 Path 引用
const collection = defineComposite({
  namespace: 'benchmark',
  type: 'collection',
  schema: CompositeBaseSchema.extend({
    namespace: literal('benchmark'),
    type: literal('collection'),
    count: number(),
    paint: boolean(),
    wide: boolean(),
  }),
  compile: (input, ctx, memo?: CollectionMemo) => {
    let x = 0;
    const slots: Array<Slot> = [];
    const children = Array.from({ length: input.count }, (_, i) => {
      const middle = i === Math.floor(input.count / 2);
      const width = middle && input.wide ? 120 : 80;
      const fill = middle && input.paint ? 'red' : 'blue';
      let slot = memo?.slots[i];
      if (!slot || slot.width !== width || slot.fill !== fill || slot.x !== x) {
        const node: IRNode = { ...createBenchmarkNode(i), position: [x, 0], layout: { width }, style: { fill } };
        const path: IRPath = {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [x, 0] },
            { type: 'step', kind: 'line', to: [x + width, 0] },
          ],
        };
        slot = { x, width, fill, node, path };
      }
      slots.push(slot);
      x += width;
      const endpoint: IRCoordinate = { type: 'coordinate', id: 'end', position: [x, 0] };
      return ctx.createScope({}, i === input.count - 1 ? [slot.node, slot.path, endpoint] : [slot.node, slot.path]);
    });
    return { children, memo: { slots } };
  },
});

// N 个独立试算结果各自重放；只有中间节点读取外部 anchor
const layout = defineComposite({
  namespace: 'benchmark',
  type: 'layout',
  schema: CompositeBaseSchema.extend({
    namespace: literal('benchmark'),
    type: literal('layout'),
    count: number(),
    paint: boolean(),
  }),
  compile: (input, ctx) => ({
    children: Array.from({ length: input.count }, (_, i) => {
      const middle = i === Math.floor(input.count / 2);
      const node: IRNode = {
        ...createBenchmarkNode(i),
        ...(middle
          ? { position: { of: 'anchor', direction: 'right' as const }, style: { fill: input.paint ? 'red' : 'blue' } }
          : {}),
      };
      const measured = ctx.layoutChild(node, naturalLayoutProposal);
      if (measured.kind === 'failed') return ctx.raise(measured.failure);
      return ctx.replay(measured.result);
    }),
  }),
});

/** 混合输出与布局试算共用的编译配置 */
export const generatedOptions: CompileOptions = { ...benchmarkCompileOptions, composites: [collection, layout] };
type CollectionChange = 'equal' | 'paint' | 'width';
type LayoutChange = 'paint' | 'position';
/** 同一作者位置交替替换完整声明或支撑坐标，不在计时内构造输入 */
export const createGeneratedUpdate = (
  count: number,
  kind: 'collection' | 'layout',
  change: CollectionChange | LayoutChange,
) => {
  const make = (on: boolean) => {
    const anchor: IRCoordinate = {
      type: 'coordinate',
      id: 'anchor',
      position: [on && change === 'position' ? 10 : 0, 0],
    };
    const declaration =
      kind === 'collection'
        ? {
            namespace: 'benchmark',
            type: 'collection',
            count,
            paint: on && change === 'paint',
            wide: on && change === 'width',
          }
        : { namespace: 'benchmark', type: 'layout', count, paint: on && change === 'paint' };
    const endpoint: IRPath = {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: { id: 'end' } },
      ],
    };
    const scene: IRScene = {
      type: 'scene',
      version: 1,
      children: kind === 'collection' ? [anchor, declaration, endpoint] : [anchor, declaration],
    };
    return { scene, input: change === 'position' ? anchor : declaration };
  };
  const a = make(false),
    b = make(true);
  const index = change === 'position' ? 0 : 1;
  return createUpdateWorkload(
    [a.scene, b.scene],
    root => [[updateChild(root, index, b.input)], [updateChild(root, index, a.input)]],
    1,
    change === 'equal' ? 'equal' : 'real',
  );
};

/** 用独立非增量输出比对完整结果；混合树还须发布末格坐标 */
export const createGeneratedMount = (count: number, kind: 'collection' | 'layout') => {
  const ir = createGeneratedUpdate(count, kind, 'paint').states[0];
  const expected = compileBenchmarkSnapshot(ir, generatedOptions).result;
  if (kind === 'collection') {
    const path = expected.scene.primitives.at(-1);
    expect(path?.type === 'path' && path.commands.at(-1)).toMatchObject({ to: [count * 80, 0] });
  }
  return { ir, verify: (result: typeof expected) => expect(result).toEqual(expected) };
};
