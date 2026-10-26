import { ChildSchema, LayoutAxisProposalKind, LayoutIntrinsicMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { LayoutAxisSizeInput, LayoutContainerBoxInput, LayoutItemBaseInput, LayoutSizeInput } from '../../src';
import {
  LayoutAlignment,
  LayoutAlignmentSchema,
  LayoutAxisSizeKind,
  LayoutAxisSizeSchema,
  LayoutContainerBoxSchema,
  LayoutDistribution,
  LayoutEdgeAlignmentSchema,
  LayoutItemBaseSchema,
  LayoutItemKind,
  LayoutOverflow,
  LayoutSizeSchema,
} from '../../src';
import { resolveLayoutContainerBox } from '../../src/resolve/shared';

describe('共享布局 schema', () => {
  it('描述公共容器和项目对象契约', () => {
    expect(LayoutContainerBoxSchema.description).toBe('Shared Box contract for Layout containers.');
    expect(LayoutItemBaseSchema.description).toBe('Shared JSON-safe child item contract for Layouts.');
  });

  it('仅在解析或解析作者输入时才具体化 Box 默认值', () => {
    const input = {} satisfies LayoutContainerBoxInput;

    expect(LayoutContainerBoxSchema.parse(input)).toEqual({
      size: { x: { kind: 'content' }, y: { kind: 'content' } },
      padding: 0,
      overflow: 'visible',
    });
    expect(resolveLayoutContainerBox(input)).toEqual({
      size: {
        x: { kind: 'content' },
        y: { kind: 'content' },
      },
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      overflow: 'visible',
    });
  });

  it('将内容、固定和填充保持为严格的区分轴策略', () => {
    const inputs = [
      { kind: LayoutAxisSizeKind.Content, min: 10, max: 20 },
      { kind: LayoutAxisSizeKind.Fixed, value: 12 },
      { kind: LayoutAxisSizeKind.Fill, min: 4 },
    ] satisfies Array<LayoutAxisSizeInput>;

    expect(inputs.map(input => LayoutAxisSizeSchema.parse(input))).toEqual(inputs);
    expect(LayoutAxisSizeSchema.safeParse({ kind: 'fixed' }).success).toBe(false);
    expect(LayoutAxisSizeSchema.safeParse({ kind: 'fixed', value: 1, max: 2 }).success).toBe(false);
    expect(LayoutAxisSizeSchema.safeParse({ kind: 'content', min: 2, max: 1 }).success).toBe(false);
    expect(LayoutAxisSizeSchema.safeParse({ kind: 'fill', min: -1 }).success).toBe(false);
    expect(LayoutAxisSizeSchema.safeParse({ kind: 'content', max: Number.POSITIVE_INFINITY }).success).toBe(false);
  });

  it('解析部分物理尺寸和间距，而不丢失显式零', () => {
    const sizeInput = { x: { kind: 'fixed', value: 0 } } satisfies LayoutSizeInput;

    expect(LayoutSizeSchema.parse(sizeInput)).toEqual({
      x: { kind: 'fixed', value: 0 },
      y: { kind: 'content' },
    });
    expect(resolveLayoutContainerBox({ size: sizeInput }).size).toEqual({
      x: { kind: 'fixed', value: 0 },
      y: { kind: 'content' },
    });
    expect(
      LayoutContainerBoxSchema.parse({
        padding: { default: 1, x: 2, left: 0 },
        overflow: LayoutOverflow.Clip,
      }),
    ).toMatchObject({ padding: { default: 1, x: 2, left: 0 }, overflow: 'clip' });
  });

  it('接受任何 JSON 安全的 Core 子项，并严格保持容器本地项身份', () => {
    const input = {
      kind: LayoutItemKind.Flex,
      key: 'legend-label',
      margin: { right: 8 },
      child: { type: 'node', position: [0, 0], text: 'Revenue' },
    } satisfies LayoutItemBaseInput;
    const parsed = LayoutItemBaseSchema.parse(input);

    expect(parsed).toEqual(input);
    expect(ChildSchema.safeParse(input.child).success).toBe(true);
    expect(LayoutItemBaseSchema.safeParse({ ...input, key: '' }).success).toBe(false);
    expect(LayoutItemBaseSchema.safeParse({ ...input, key: '   ' }).success).toBe(false);
    expect(LayoutItemBaseSchema.safeParse({ ...input, unknown: true }).success).toBe(false);
  });

  it('使边缘对齐比基线感知对齐更窄', () => {
    expect(LayoutAlignmentSchema.options).toEqual([
      LayoutAlignment.Start,
      LayoutAlignment.Center,
      LayoutAlignment.End,
      LayoutAlignment.Stretch,
      LayoutAlignment.FirstBaseline,
      LayoutAlignment.LastBaseline,
    ]);
    expect(LayoutEdgeAlignmentSchema.safeParse(LayoutAlignment.FirstBaseline).success).toBe(false);
    expect(LayoutEdgeAlignmentSchema.safeParse(LayoutAlignment.Stretch).success).toBe(true);
    expect(Object.values(LayoutDistribution)).toEqual([
      'start',
      'center',
      'end',
      'stretch',
      'space-between',
      'space-around',
      'space-evenly',
    ]);
  });

  it('使用 Core 提案词汇，而不引入并行布局协议', () => {
    const proposals = [
      { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Minimum },
      { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
      { kind: LayoutAxisProposalKind.Range, min: 0, max: 10 },
      { kind: LayoutAxisProposalKind.Exact, value: 10 },
    ] as const;

    expect(proposals.map(proposal => proposal.kind)).toEqual(['intrinsic', 'intrinsic', 'range', 'exact']);
  });
});
