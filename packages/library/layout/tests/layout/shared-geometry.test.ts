import { LayoutAxisProposalKind, LayoutIntrinsicMode, RectClipSchema } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { LayoutAlignment, LayoutAxisSizeKind } from '../../src';
import {
  alignAllocationInSlot,
  contentRectOf,
  layoutClipOf,
  resolveLayoutSpacing,
  outsetLayoutRect,
  positionedLayoutSlotOf,
  resolveLayoutAxisSize,
} from '../../src/composites/internal';

describe('共享布局尺寸解析结果', () => {
  it('选择最小或自然的内容贡献并通过作者和父级范围进行限制', () => {
    const common = {
      axis: 'x' as const,
      policy: { kind: LayoutAxisSizeKind.Content, min: 20, max: 80 } as const,
      minimumContribution: 10,
      naturalContribution: 100,
    };

    expect(
      resolveLayoutAxisSize({
        ...common,
        proposal: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Minimum },
      }),
    ).toEqual({ allocationSize: 20 });
    expect(
      resolveLayoutAxisSize({
        ...common,
        proposal: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
      }),
    ).toEqual({ allocationSize: 80 });
    expect(
      resolveLayoutAxisSize({
        ...common,
        proposal: { kind: LayoutAxisProposalKind.Range, min: 30, max: 60 },
      }),
    ).toEqual({ allocationSize: 60, finiteAvailable: 60 });
    expect(
      resolveLayoutAxisSize({
        ...common,
        proposal: { kind: LayoutAxisProposalKind.Exact, value: 40 },
      }),
    ).toEqual({ allocationSize: 40, finiteAvailable: 40 });
  });

  it('当不存在编写的最大值时，保留编写的最小值', () => {
    expect(
      resolveLayoutAxisSize({
        axis: 'x',
        policy: { kind: LayoutAxisSizeKind.Content, min: 20 },
        proposal: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
        minimumContribution: 5,
        naturalContribution: 10,
      }),
    ).toEqual({ allocationSize: 20 });
    expect(
      resolveLayoutAxisSize({
        axis: 'y',
        policy: { kind: LayoutAxisSizeKind.Fill, min: 20 },
        proposal: { kind: LayoutAxisProposalKind.Exact, value: 10 },
        minimumContribution: 0,
        naturalContribution: 0,
      }),
    ).toEqual({ allocationSize: 20, finiteAvailable: 10 });
  });

  it('当父槽冲突时保留编写的固定分配', () => {
    expect(
      resolveLayoutAxisSize({
        axis: 'y',
        policy: { kind: LayoutAxisSizeKind.Fixed, value: 50 },
        proposal: { kind: LayoutAxisProposalKind.Exact, value: 10 },
        minimumContribution: 0,
        naturalContribution: 0,
      }),
    ).toEqual({ allocationSize: 50, finiteAvailable: 10 });
  });

  it('仅填充有限父分配，并在无界时报告确切的物理轴', () => {
    const common = {
      policy: { kind: LayoutAxisSizeKind.Fill, min: 20, max: 80 } as const,
      minimumContribution: 0,
      naturalContribution: 0,
    };

    expect(
      resolveLayoutAxisSize({
        ...common,
        axis: 'x',
        proposal: { kind: LayoutAxisProposalKind.Range, min: 0, max: 100 },
      }),
    ).toEqual({ allocationSize: 80, finiteAvailable: 100 });
    expect(() =>
      resolveLayoutAxisSize({
        ...common,
        axis: 'y',
        proposal: { kind: LayoutAxisProposalKind.Range, min: 0 },
      }),
    ).toThrow('Layout fill requires a finite parent allocation on y');
    expect(() =>
      resolveLayoutAxisSize({
        ...common,
        axis: 'x',
        proposal: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
      }),
    ).toThrow('Layout fill requires a finite parent allocation on x');
  });
});

describe('共享布局盒几何形状', () => {
  it('标准化间距，侧边轴高于默认优先级', () => {
    expect(resolveLayoutSpacing({ default: 1, x: 2, y: 3, left: 4 })).toEqual({
      top: 3,
      right: 2,
      bottom: 3,
      left: 4,
    });
    expect(resolveLayoutSpacing(0)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it('当过多的填充将内容折叠为零时，保留编写的前导填充', () => {
    expect(contentRectOf({ x: 0, y: 0, width: 10, height: 6 }, { top: 4, right: 8, bottom: 4, left: 7 })).toEqual({
      x: 7,
      y: 4,
      width: 0,
      height: 0,
    });
  });

  it('按项目边距开始非零原点子矩形', () => {
    expect(outsetLayoutRect({ x: -5, y: 3, width: 20, height: 10 }, { top: 2, right: 4, bottom: 6, left: 8 })).toEqual({
      x: -13,
      y: 1,
      width: 32,
      height: 18,
    });
  });

  it('当有限的矩形和间距输入溢出有限的几何图形时，会明确报错', () => {
    expect(() =>
      contentRectOf(
        { x: Number.MAX_VALUE, y: 0, width: 10, height: 10 },
        { top: 0, right: 0, bottom: 0, left: Number.MAX_VALUE },
      ),
    ).toThrow(/finite/i);
    expect(() =>
      outsetLayoutRect(
        { x: 0, y: 0, width: Number.MAX_VALUE, height: 10 },
        { top: 0, right: Number.MAX_VALUE, bottom: 0, left: 0 },
      ),
    ).toThrow(/finite/i);
  });

  it('对齐父槽内的实际分配边界，而不假设零原点', () => {
    const slot = { x: 100, y: 20, width: 40, height: 30 };
    const child = { x: -5, y: 3, width: 20, height: 10 };

    expect(alignAllocationInSlot(slot, child, 'x', LayoutAlignment.Start)).toBe(105);
    expect(alignAllocationInSlot(slot, child, 'x', LayoutAlignment.Center)).toBe(115);
    expect(alignAllocationInSlot(slot, child, 'x', LayoutAlignment.End)).toBe(125);
    expect(alignAllocationInSlot(slot, child, 'y', LayoutAlignment.End)).toBe(37);
  });

  it('根据内容原点、目标、锚点和偏移量解析定位槽', () => {
    expect(
      positionedLayoutSlotOf({
        content: { x: 10, y: 20, width: 100, height: 50 },
        at: { x: 50, y: 25 },
        anchor: { x: 0.5, y: 1 },
        offset: { x: 2, y: -1 },
        size: { width: 20, height: 10 },
      }),
    ).toEqual({ x: 52, y: 34, width: 20, height: 10 });
  });

  it('使用 Core 矩形裁剪进行正区域和零区域分配', () => {
    const positive = layoutClipOf({ width: 20, height: 10 });
    const zeroWidth = layoutClipOf({ width: 0, height: 10 });

    expect(positive).toEqual({ kind: 'rect', params: { x: 0, y: 0, width: 20, height: 10 } });
    expect(RectClipSchema.safeParse(positive).success).toBe(true);
    expect(zeroWidth).toEqual({ kind: 'rect', params: { x: 0, y: 0, width: 0, height: 10 } });
    expect(RectClipSchema.safeParse(zeroWidth).success).toBe(true);
  });
});
