import type { AnyCompositeDefinition, IRChild, LayoutChildResult, LayoutProposal } from '@retikz/core';
import { ChildSchema, CompositeBaseSchema, compileToScene, defineComposite, LayoutChildProbeKind } from '@retikz/core';
import { PathClipDefinition } from '@retikz/extension';
import { intrinsicLayoutProposal } from '@retikz/layout/compose';
import { describe, expect, it } from 'vitest';
import { literal, boolean } from 'zod';

import { ArrayDefinition, MapDefinition } from '../../../src/collection';

const cell = (id: string, width: number, height: number) => ({
  id,
  content: {
    type: 'node' as const,
    position: [0, 0] as [number, number],
    style: { fill: 'none', stroke: 'none' },
    layout: { minimumSize: { width, height }, padding: 0, margin: 0 },
  },
});

const compile = (
  child: IRChild,
  proposal: LayoutProposal = intrinsicLayoutProposal('natural'),
  extra: Array<AnyCompositeDefinition> = [],
  arrayDefinition = ArrayDefinition,
) => {
  let observed: LayoutChildResult | undefined;
  const harness = defineComposite({
    namespace: 'cell-test',
    type: 'harness',
    schema: CompositeBaseSchema.extend({
      namespace: literal('cell-test'),
      type: literal('harness'),
      child: ChildSchema,
    }),
    compile: (node, context) => {
      const probe = context.layoutChild(node.child, proposal);
      if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);

      observed = probe.result;

      return { children: [context.replay(probe.result)] };
    },
  });
  const scene = compileToScene(
    { type: 'scene', version: 1, children: [{ namespace: 'cell-test', type: 'harness', child }] },
    {
      composites: [harness, arrayDefinition, MapDefinition, ...extra],
      clips: [PathClipDefinition],
      padding: 0,
    },
  );
  if (observed === undefined) throw new Error('No layout result');

  return { scene, observed };
};

describe('Array / Map 分配', () => {
  it.each(['row', 'column'] as const)('将 %s Array 单元格调整为其自己的内容和填充', direction => {
    const result = compile({
      namespace: 'standard',
      type: 'array',
      items: [cell('a', 20, 10), cell('b', 40, 10)],
      layout: { direction, gap: 2 },
      defaultCell: { layout: { width: 'content', height: 20, padding: 4 } },
    });
    const bounds = result.scene.spatialHandles.entries
      .filter(entry => entry.role === 'array-cell')
      .map(entry => entry.geometry.bounds);

    expect(bounds).toEqual(
      direction === 'row'
        ? [
            { x: 0, y: 0, width: 28, height: 20 },
            { x: 30, y: 0, width: 48, height: 20 },
          ]
        : [
            { x: 0, y: 0, width: 28, height: 20 },
            { x: 0, y: 22, width: 48, height: 20 },
          ],
    );
    expect(result.observed.allocationBounds).toEqual(
      direction === 'row' ? { x: 0, y: 0, width: 78, height: 20 } : { x: 0, y: 0, width: 48, height: 42 },
    );
  });

  it('让每个单元格的自动和固定宽度覆盖整体内容大小', () => {
    const result = compile({
      namespace: 'standard',
      type: 'array',
      items: [
        cell('a', 20, 10),
        { ...cell('b', 40, 10), layout: { width: 'auto' } },
        { ...cell('c', 60, 10), layout: { width: 10 } },
      ],
      layout: { gap: 2 },
      defaultCell: { layout: { width: 'content', height: 20, padding: 0 } },
    });

    expect(
      result.scene.spatialHandles.entries
        .filter(entry => entry.role === 'array-cell')
        .map(entry => entry.geometry.bounds),
    ).toEqual([
      { x: 0, y: 0, width: 20, height: 20 },
      { x: 22, y: 0, width: 40, height: 20 },
      { x: 64, y: 0, width: 10, height: 20 },
    ]);
  });

  it('使用索引数据单元的内容宽度，而不加宽较短的单元', () => {
    const result = compile({
      namespace: 'standard',
      type: 'array',
      id: 'values',
      cellIdMode: 'index',
      data: ['A', 'longer'],
      index: { position: 'after' },
      layout: { gap: 2 },
      defaultCell: { layout: { width: 'content', padding: 4 } },
    });
    const cells = result.scene.spatialHandles.entries
      .filter(entry => entry.role === 'array-cell')
      .map(entry => entry.geometry.bounds);

    expect(cells[0].width).toBeLessThan(cells[1].width);
    expect(cells[1].x).toBe(cells[0].width + 2);
    expect(result.observed.allocationBounds.width).toBe(cells[0].width + cells[1].width + 2);
  });

  it('让内容单元覆盖自动宽度 Array', () => {
    const result = compile({
      namespace: 'standard',
      type: 'array',
      items: [{ ...cell('a', 20, 10), layout: { width: 'content' } }, cell('b', 40, 10)],
      layout: { gap: 2 },
      defaultCell: { layout: { width: 'auto', height: 20, padding: 0 } },
    });

    expect(
      result.scene.spatialHandles.entries
        .filter(entry => entry.role === 'array-cell')
        .map(entry => entry.geometry.bounds.width),
    ).toEqual([20, 40]);
  });

  it('仅在请求时发布字符串单元格标识', () => {
    const base = { namespace: 'standard', type: 'array', items: ['A', 'A'] };
    const withoutIds = compile(base).scene.spatialHandles.entries;

    expect(withoutIds.filter(entry => entry.role === 'array-cell')).toHaveLength(0);

    const withIds = compile({ ...base, items: ['A', 'B'], cellIdMode: 'string' }).scene.spatialHandles.entries;

    expect(withIds.filter(entry => entry.role === 'array-cell').map(entry => entry.id)).toEqual(['cell:A', 'cell:B']);
  });

  it.each(['row', 'column'] as const)('将索引条放置在 %s 的两侧，而不调整单元格大小', direction => {
    const base = {
      namespace: 'standard',
      type: 'array',
      items: [cell('a', 40, 20), cell('b', 40, 20)],
      layout: { direction, gap: 6 },
      defaultCell: { layout: { width: 40, height: 20, padding: 0 } },
    };
    const before = compile({ ...base, index: { position: 'before', style: { font: { size: 24 } } } });
    const after = compile({ ...base, index: { position: 'after', style: { font: { size: 24 } } } });
    const hidden = compile({ ...base, index: false });
    const bounds = (result: ReturnType<typeof compile>) =>
      result.scene.spatialHandles.entries
        .filter(entry => entry.role === 'array-cell')
        .map(entry => entry.geometry.bounds);

    expect(before.observed.slotSize).toEqual(after.observed.slotSize);

    const axis = direction === 'row' ? 'y' : 'x';

    expect(bounds(before)[0][axis]).toBeGreaterThan(6);
    expect(bounds(after)[0][axis]).toBe(0);
    expect(bounds(after)).toEqual(bounds(hidden));
    expect(bounds(before).every(rect => rect.width === 40 && rect.height === 20)).toBe(true);

    const dimension = direction === 'row' ? 'height' : 'width';

    expect(after.observed.slotSize[dimension]).toBeGreaterThan(hidden.observed.slotSize[dimension]);

    const large = compile({ ...base, index: { style: { font: { size: 48 } } } });

    expect(large.observed.slotSize[dimension]).toBeGreaterThan(before.observed.slotSize[dimension]);
  });

  it('将空索引列表保留为空', () => {
    expect(
      compile({ namespace: 'standard', type: 'array', items: [], index: { position: 'after', start: 100 } }).observed
        .slotSize,
    ).toEqual({ width: 0, height: 0 });
  });

  it.each(['row', 'column'] as const)('在 %s Array 中应用每个单元尺寸和自动覆盖', direction => {
    const source = {
      namespace: 'standard',
      type: 'array',
      items: [
        { ...cell('a', 80, 60), layout: { width: 8, height: 10 } },
        { ...cell('b', 40, 10), layout: { width: 'auto' } },
        cell('c', 70, 80),
      ],
      layout: { direction },
      defaultCell: { layout: { width: 30, height: 20, padding: 0 } },
    };
    const before = JSON.stringify(source);
    const result = compile(source);
    const bounds = result.scene.spatialHandles.entries
      .filter(entry => entry.role === 'array-cell')
      .map(entry => entry.geometry.bounds);

    expect(bounds).toEqual(
      direction === 'row'
        ? [
            { x: 0, y: 0, width: 8, height: 10 },
            { x: 10, y: 0, width: 40, height: 20 },
            { x: 52, y: 0, width: 30, height: 20 },
          ]
        : [
            { x: 0, y: 0, width: 8, height: 10 },
            { x: 0, y: 12, width: 40, height: 20 },
            { x: 0, y: 34, width: 30, height: 20 },
          ],
    );
    expect(JSON.stringify(source)).toBe(before);
  });

  it('应用 Map 整体、角色和单元尺寸，而不拉伸更小的覆盖', () => {
    const result = compile({
      namespace: 'standard',
      type: 'map',
      entries: [
        { key: { ...cell('a', 80, 60), layout: { width: 5, height: 7 } }, value: cell('b', 80, 60) },
        { key: cell('c', 80, 60), value: { ...cell('d', 70, 60), layout: { width: 'auto', height: 9 } } },
      ],
      defaultCell: {
        layout: { width: 30, height: 20, padding: 0 },
        key: { layout: { width: 10 } },
        value: { layout: { width: 50, height: 25 } },
      },
    });

    expect(
      result.scene.spatialHandles.entries
        .filter(entry => entry.role === 'map-key' || entry.role === 'map-value')
        .map(entry => entry.geometry.bounds),
    ).toEqual([
      { x: 0, y: 0, width: 5, height: 7 },
      { x: 12, y: 0, width: 50, height: 25 },
      { x: 0, y: 27, width: 10, height: 20 },
      { x: 12, y: 27, width: 70, height: 9 },
    ]);
  });

  it('使用自然最大值分配相等的水平单元格', () => {
    const { observed } = compile({
      namespace: 'standard',
      type: 'array',
      items: [cell('a', 20, 10), cell('b', 30, 20)],
    });

    expect(observed.allocationBounds).toEqual({ x: 0, y: 0, width: 94, height: 36 });
  });

  it('在 Map 中使用单独的列最大值和每行高度', () => {
    const { observed } = compile({
      namespace: 'standard',
      type: 'map',
      entries: [
        { key: cell('a', 20, 10), value: cell('b', 30, 20) },
        { key: cell('c', 40, 10), value: cell('d', 10, 10) },
      ],
    });

    expect(observed.allocationBounds).toEqual({ x: 0, y: 0, width: 104, height: 64 });
  });

  it('支持垂直 Array 中的零填充和间隙', () => {
    const { observed } = compile({
      namespace: 'standard',
      type: 'array',
      items: [cell('a', 20, 10), cell('b', 30, 20)],
      layout: { direction: 'column', gap: 0 },
      defaultCell: { layout: { padding: 0 } },
    });

    expect(observed.allocationBounds).toEqual({ x: 0, y: 0, width: 30, height: 40 });
  });

  it('不拉伸单元以消费更大的父分配', () => {
    const { observed } = compile(
      { namespace: 'standard', type: 'array', items: [cell('a', 20, 10)] },
      { x: { kind: 'exact', value: 100 }, y: { kind: 'exact', value: 80 } },
    );

    expect(observed.allocationBounds).toEqual({ x: 0, y: 0, width: 100, height: 80 });
  });

  it('拒绝不足的父分配，同时小的固定单元格会裁剪过大的内容和填充', () => {
    expect(() =>
      compile(
        { namespace: 'standard', type: 'array', items: [cell('a', 20, 10)] },
        { x: { kind: 'exact', value: 10 }, y: { kind: 'exact', value: 80 } },
      ),
    ).toThrow();
    expect(
      compile({
        namespace: 'standard',
        type: 'array',
        items: [cell('a', 20, 10)],
        defaultCell: { layout: { width: 1, height: 0 } },
      }).observed.allocationBounds,
    ).toEqual({ x: 0, y: 0, width: 1, height: 0 });
  });

  it('空结构的自然分配为零', () => {
    for (const child of [
      { namespace: 'standard', type: 'array', items: [] },
      { namespace: 'standard', type: 'map', entries: [] },
    ])
      expect(compile(child).observed.allocationBounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });
});

const custom = defineComposite({
  namespace: 'cell-test',
  type: 'foreign',
  schema: CompositeBaseSchema.extend({
    namespace: literal('cell-test'),
    type: literal('foreign'),
    reject: boolean().default(false),
  }),
  compile: (node, context) => {
    if (node.reject) throw new Error('foreign child rejected content');

    const bounds = { x: -12, y: 6, width: 20, height: 10 };

    return {
      allocationBounds: bounds,
      children: [context.createScope({}, [], [{ id: 'content', role: 'foreign', bounds }])],
    };
  },
});
it('以负原点居中第三方内容并保留其自己的空间句柄', () => {
  const result = compile(
    {
      namespace: 'standard',
      type: 'array',
      items: [{ id: 'cell', content: { namespace: 'cell-test', type: 'foreign' } }],
      defaultCell: { layout: { width: 60, height: 50 } },
    },
    intrinsicLayoutProposal('natural'),
    [custom],
  );

  expect(result.scene.spatialHandles.entries.find(entry => entry.role === 'foreign')?.geometry.bounds).toEqual({
    x: 20,
    y: 20,
    width: 20,
    height: 10,
  });
  expect(result.scene.spatialHandles.entries.find(entry => entry.role === 'array-cell')?.geometry.bounds).toEqual({
    x: 0,
    y: 0,
    width: 60,
    height: 50,
  });
});
it('保留第三方编译失败和缺少定义错误', () => {
  const source = {
    namespace: 'standard',
    type: 'array',
    items: [{ content: { namespace: 'cell-test', type: 'foreign', reject: true } }],
  };

  expect(() => compile(source, intrinsicLayoutProposal('natural'), [custom])).toThrow(/foreign child rejected/);
  expect(() => compile(source)).toThrow();
});
it('将固定槽几何形状保持在有限范围范围内', () => {
  const source = { namespace: 'standard', type: 'array', items: [cell('a', 20, 10)] };
  const result = compile(source, { x: { kind: 'range', min: 100, max: 120 }, y: { kind: 'range', min: 60, max: 80 } });

  expect(result.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 100, height: 60 });
  expect(result.scene.spatialHandles.entries.find(entry => entry.role === 'array-cell')?.geometry.bounds).toEqual({
    x: 0,
    y: 0,
    width: 36,
    height: 26,
  });
  expect(() =>
    compile(source, { x: { kind: 'range', min: 0, max: 5 }, y: { kind: 'intrinsic', mode: 'natural' } }),
  ).toThrow();
});

it('每个 Array 回调测量一次每个固定单元内容，包括更改后的默认值下的回放', () => {
  let calls = 0;
  const callsPerArray: Array<number> = [];
  const arrayDefinition: typeof ArrayDefinition = {
    ...ArrayDefinition,
    compile: (node, context) => {
      const before = calls;
      const result = ArrayDefinition.compile(node, context);
      callsPerArray.push(calls - before);
      return result;
    },
  };
  const measured = defineComposite({
    namespace: 'cell-test',
    type: 'measured',
    schema: CompositeBaseSchema.extend({ namespace: literal('cell-test'), type: literal('measured') }),
    compile: (_node, context) => {
      calls++;

      expect(context.proposal.x.kind).toBe('intrinsic');
      expect(context.proposal.y.kind).toBe('intrinsic');

      return { allocationBounds: { x: 0, y: 0, width: 80, height: 40 }, children: [] };
    },
  });
  compile(
    {
      namespace: 'standard',
      type: 'array',
      items: Array.from({ length: 6 }, () => ({ content: { namespace: 'cell-test', type: 'measured' } })),
      defaultCell: { layout: { width: 10, height: 10 } },
    },
    intrinsicLayoutProposal('natural'),
    [measured],
    arrayDefinition,
  );

  expect(calls).toBeGreaterThan(0);
  expect(callsPerArray.length).toBeGreaterThan(0);
  expect(callsPerArray.every(count => count === 6)).toBe(true);
});

it('将标签视觉溢出保留在父分配之外，包括索引列表', () => {
  const source = { namespace: 'standard', type: 'array', index: true, items: [cell('a', 40, 20)] };
  const before = compile(source).observed;
  const after = compile({ ...source, label: { text: 'a very long title outside allocation', distance: 30 } }).observed;

  expect(after.allocationBounds).toEqual(before.allocationBounds);
  expect(after.slotSize).toEqual(before.slotSize);
  expect(after.visualBounds.height).toBeGreaterThan(before.visualBounds.height);
});
