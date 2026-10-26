import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import type {
  CompileOptions,
  IRChild,
  IRNode,
  IRScene,
  LayoutChildResult,
  LayoutProposal,
  ScenePrimitive,
  TextMeasurer,
  TextPrimitive,
} from '../../src';
import {
  BUILTIN_SHAPES,
  ChildSchema,
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
  LayoutIntrinsicMode,
} from '../../src';
import { flattenPrims } from '../helpers/flatten';

const fixedMeasurer: TextMeasurer = text => ({
  width: [...text].length * 10,
  height: 10,
  ascent: 8,
  descent: 2,
});

const naturalAxis = {
  kind: LayoutAxisProposalKind.Intrinsic,
  mode: LayoutIntrinsicMode.Natural,
} as const;

const minimumAxis = {
  kind: LayoutAxisProposalKind.Intrinsic,
  mode: LayoutIntrinsicMode.Minimum,
} as const;

const plainNode = (text: string): IRNode => ({
  type: 'node',
  position: [0, 0],
  text,
  style: { font: { size: 10 }, fill: 'transparent', stroke: 'transparent' },
  layout: { lineHeight: 10, padding: 0, margin: 0 },
});

const probeChild = (
  child: IRChild,
  proposal: LayoutProposal,
  options: Pick<CompileOptions, 'lowerTex' | 'shapes'> = {},
): {
  result: LayoutChildResult;
  textPrimitives: Array<TextPrimitive>;
} => {
  let observed: LayoutChildResult | undefined;
  const definition = defineComposite({
    namespace: 'test',
    type: 'builtinProbe',
    schema: CompositeBaseSchema.extend({
      namespace: literal('test'),
      type: literal('builtinProbe'),
      child: ChildSchema,
    }),
    compile: (node, context) => {
      const probe = context.layoutChild(node.child, proposal);
      if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);

      observed = probe.result;

      return { children: [context.replay(probe.result)] };
    },
  });
  const scene: IRScene = {
    version: 1,
    type: 'scene',
    children: [{ namespace: 'test', type: 'builtinProbe', child }],
  };
  const compiled = compileToScene(scene, {
    composites: [definition],
    measureText: fixedMeasurer,
    padding: 0,
    ...options,
  });
  if (observed === undefined) throw new Error('expected a resolved built-in child probe');

  return {
    result: observed,
    textPrimitives: flattenPrims(compiled.scene.primitives).filter(
      (primitive): primitive is TextPrimitive => primitive.type === 'text',
    ),
  };
};

describe('普通 Node 对布局提议的消费', () => {
  it('使用编写的硬线作为自然宽度，使用最宽的易碎单元作为最小宽度', () => {
    const child = plainNode('aa bbbb\ncc d');
    const natural = probeChild(child, { x: naturalAxis, y: naturalAxis });
    const minimum = probeChild(child, { x: minimumAxis, y: naturalAxis });

    expect(natural.result.slotSize).toEqual({ width: 70, height: 20 });
    expect(natural.textPrimitives[0].lines.map(line => line.text)).toEqual(['aa bbbb', 'cc d']);
    expect(minimum.result.slotSize).toEqual({ width: 40, height: 30 });
    expect(minimum.result.allocationBounds).toMatchObject({ width: 40, height: 30 });
    expect(minimum.textPrimitives[0].lines.map(line => line.text)).toEqual(['aa', 'bbbb', 'cc d']);
  });

  it('以精确的分配宽度回流并报告所得的自然 y 贡献', () => {
    const probed = probeChild(plainNode('aa bb cc'), {
      x: { kind: LayoutAxisProposalKind.Exact, value: 40 },
      y: naturalAxis,
    });

    expect(probed.result.slotSize).toEqual({ width: 40, height: 30 });
    expect(probed.result.allocationBounds).toMatchObject({ width: 20, height: 30 });
    expect(probed.textPrimitives[0].lines.map(line => line.text)).toEqual(['aa', 'bb', 'cc']);
  });

  it('应用 x 建议后从实际高度解析 y 最小值', () => {
    const child = plainNode('aa bb cc');
    const minimum = probeChild(child, {
      x: { kind: LayoutAxisProposalKind.Exact, value: 40 },
      y: minimumAxis,
    });
    const natural = probeChild(child, {
      x: { kind: LayoutAxisProposalKind.Exact, value: 40 },
      y: naturalAxis,
    });

    expect(minimum.result.slotSize).toEqual({ width: 40, height: 30 });
    expect(minimum.result.allocationBounds).toMatchObject({ width: 20, height: 30 });
    expect(minimum.result.slotSize.height).toBe(natural.result.slotSize.height);
  });

  it('当 y 建议准确时保持真实文本高度', () => {
    const probed = probeChild(plainNode('aa'), {
      x: naturalAxis,
      y: { kind: LayoutAxisProposalKind.Exact, value: 2 },
    });

    expect(probed.result.slotSize).toEqual({ width: 20, height: 2 });
    expect(probed.result.allocationBounds).toMatchObject({ width: 20, height: 10 });
    expect(probed.textPrimitives[0].measuredHeight).toBe(10);
  });

  it('将自然布局保持在一定范围内，并且仅在其有限的上限预算下进行回流', () => {
    const child = plainNode('aa bb cc');
    const natural = probeChild(child, {
      x: { kind: LayoutAxisProposalKind.Range, min: 30, max: 100 },
      y: naturalAxis,
    });
    const reflowed = probeChild(child, {
      x: { kind: LayoutAxisProposalKind.Range, min: 30, max: 60 },
      y: naturalAxis,
    });

    expect(natural.result.slotSize).toEqual({ width: 80, height: 10 });
    expect(natural.textPrimitives[0].lines.map(line => line.text)).toEqual(['aa bb cc']);
    expect(reflowed.result.slotSize).toEqual({ width: 50, height: 20 });
    expect(reflowed.textPrimitives[0].lines.map(line => line.text)).toEqual(['aa bb', 'cc']);
  });

  it('减去分配边距和填充，同时保留更严格的编写的 maxTextWidth', () => {
    const boxed = probeChild(
      {
        ...plainNode('aa bb'),
        layout: { ...plainNode('aa bb').layout, padding: 5, margin: 5 },
      },
      {
        x: { kind: LayoutAxisProposalKind.Exact, value: 60 },
        y: naturalAxis,
      },
    );
    const authored = probeChild(
      {
        ...plainNode('aa bb'),
        layout: { ...plainNode('aa bb').layout, maxTextWidth: 30 },
      },
      {
        x: { kind: LayoutAxisProposalKind.Exact, value: 100 },
        y: naturalAxis,
      },
    );

    expect(boxed.result.slotSize.width).toBe(60);
    expect(boxed.result.allocationBounds).toMatchObject({ width: 40, height: 40 });
    expect(boxed.textPrimitives[0].lines.map(line => line.text)).toEqual(['aa', 'bb']);
    expect(authored.result.slotSize.width).toBe(100);
    expect(authored.result.allocationBounds.width).toBe(20);
    expect(authored.textPrimitives[0].lines.map(line => line.text)).toEqual(['aa', 'bb']);
  });

  it('使用内置和自定义非矩形形状的实际分配框作为有限宽度预算', () => {
    const ellipse = probeChild(
      {
        ...plainNode('aa bb cc'),
        shape: 'ellipse',
      },
      {
        x: { kind: LayoutAxisProposalKind.Range, min: 0, max: 60 },
        y: naturalAxis,
      },
    );
    const doubleWidthShape = {
      ...BUILTIN_SHAPES.get('rectangle')!,
      name: 'double-width',
      computeCircumscribedGeometry: (halfWidth: number, halfHeight: number) => ({
        halfWidth: halfWidth * 2,
        halfHeight,
      }),
    };
    const custom = probeChild(
      {
        ...plainNode('aa bb cc'),
        shape: 'double-width',
      },
      {
        x: { kind: LayoutAxisProposalKind.Exact, value: 60 },
        y: naturalAxis,
      },
      { shapes: [doubleWidthShape] },
    );

    expect(ellipse.result.slotSize.width).toBe(ellipse.result.allocationBounds.width);
    expect(ellipse.result.allocationBounds.width).toBeLessThanOrEqual(60);
    expect(custom.result.slotSize.width).toBe(60);
    expect(custom.result.allocationBounds.width).toBeLessThanOrEqual(60);
  });

  it('在非单调自定义形状反馈中保留最佳实际分配', () => {
    const nonMonotonicShape = {
      ...BUILTIN_SHAPES.get('rectangle')!,
      name: 'non-monotonic',
      computeCircumscribedGeometry: (_halfWidth: number, halfHeight: number) => ({
        halfWidth: halfHeight <= 5 ? 30 : halfHeight <= 10 ? 20 : 35,
        halfHeight,
      }),
    };
    const probed = probeChild(
      {
        ...plainNode('aa bb cc dd'),
        shape: 'non-monotonic',
      },
      {
        x: { kind: LayoutAxisProposalKind.Range, min: 0, max: 30 },
        y: naturalAxis,
      },
      { shapes: [nonMonotonicShape] },
    );

    expect(probed.result.slotSize.width).toBe(30);
    expect(probed.result.allocationBounds).toMatchObject({ width: 40, height: 20 });
    expect(probed.textPrimitives[0].lines.map(line => line.text)).toEqual(['aa bb', 'cc dd']);
  });

  it('当旋转使其真正的分配适合时，保留编写的自然候选者', () => {
    const rotated = probeChild(
      {
        ...plainNode('aa bb cc'),
        rotate: 90,
      },
      {
        x: { kind: LayoutAxisProposalKind.Range, min: 0, max: 15 },
        y: naturalAxis,
      },
    );

    expect(rotated.result.allocationBounds.width).toBeCloseTo(10);
    expect(rotated.result.slotSize.width).toBeCloseTo(10);
    expect(rotated.textPrimitives[0].lines.map(line => line.text)).toEqual(['aa bb cc']);
  });
});

describe('原子 Node 内容拒绝不支持的布局提议', () => {
  const mixedNode: IRChild = {
    type: 'node',
    position: [0, 0],
    text: [{ segments: [{ text: 'aa bb' }] }, { segments: [{ text: 'cccc' }] }],
    style: { font: { size: 10 } },
    layout: { lineHeight: 10, padding: 0, margin: 0 },
  };

  it('保持混合编写行的原子性，以实现最小和精确的 x 提案', () => {
    const minimum = probeChild(mixedNode, { x: minimumAxis, y: naturalAxis });
    const exact = probeChild(mixedNode, {
      x: { kind: LayoutAxisProposalKind.Exact, value: 20 },
      y: naturalAxis,
    });

    expect(minimum.result.slotSize).toEqual({ width: 50, height: 20 });
    expect(minimum.result.allocationBounds).toMatchObject({ width: 50, height: 20 });
    expect(exact.result.slotSize).toEqual({ width: 20, height: 20 });
    expect(exact.result.allocationBounds).toMatchObject({ width: 50, height: 20 });
  });

  it('已下沉的 TeX 显式行在最小、范围及精确 x 布局提议下保持原子性', () => {
    const texNode: IRChild = {
      type: 'node',
      position: [0, 0],
      text: [{ segments: [{ tex: 'x' }] }],
      style: { font: { size: 10 }, fill: 'transparent', stroke: 'transparent' },
      layout: { lineHeight: 10, padding: 0, margin: 0 },
    };
    const lowerTex: NonNullable<CompileOptions['lowerTex']> = () => ({
      paths: [
        {
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [50, 0] },
          ],
          fill: { kind: 'currentColor' },
          stroke: { kind: 'none' },
        },
      ],
      width: 50,
      height: 8,
      depth: 2,
    });
    const minimum = probeChild(texNode, { x: minimumAxis, y: naturalAxis }, { lowerTex });
    const ranged = probeChild(
      texNode,
      { x: { kind: LayoutAxisProposalKind.Range, min: 0, max: 30 }, y: naturalAxis },
      { lowerTex },
    );
    const exact = probeChild(
      texNode,
      { x: { kind: LayoutAxisProposalKind.Exact, value: 20 }, y: naturalAxis },
      { lowerTex },
    );

    expect(minimum.result.slotSize).toEqual({ width: 50, height: 10 });
    expect(minimum.result.allocationBounds).toMatchObject({ width: 50, height: 10 });
    expect(ranged.result.slotSize).toEqual({ width: 30, height: 10 });
    expect(ranged.result.allocationBounds).toMatchObject({ width: 50, height: 10 });
    expect(exact.result.slotSize).toEqual({ width: 20, height: 10 });
    expect(exact.result.allocationBounds).toMatchObject({ width: 50, height: 10 });
  });
});

describe('固定内置几何拒绝不支持的布局提议', () => {
  const path: IRChild = {
    type: 'path',
    children: [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [100, 0] },
    ],
  };

  it('在精确和范围建议下保留 Path 实际分配', () => {
    const exact = probeChild(path, {
      x: { kind: LayoutAxisProposalKind.Exact, value: 20 },
      y: naturalAxis,
    });
    const exactZero = probeChild(path, {
      x: { kind: LayoutAxisProposalKind.Exact, value: 0 },
      y: naturalAxis,
    });
    const upperClamped = probeChild(path, {
      x: { kind: LayoutAxisProposalKind.Range, min: 0, max: 20 },
      y: naturalAxis,
    });
    const unbounded = probeChild(path, {
      x: { kind: LayoutAxisProposalKind.Range, min: 120 },
      y: naturalAxis,
    });

    expect(exact.result.slotSize.width).toBe(20);
    expect(exact.result.allocationBounds.width).toBe(100);
    expect(exactZero.result.slotSize.width).toBe(0);
    expect(exactZero.result.allocationBounds.width).toBe(100);
    expect(upperClamped.result.slotSize.width).toBe(20);
    expect(upperClamped.result.allocationBounds.width).toBe(100);
    expect(unbounded.result.slotSize.width).toBe(120);
    expect(unbounded.result.allocationBounds.width).toBe(100);
  });

  it('保留普通的 Scope 实际分配，而不是将其提案转发给后代', () => {
    const probed = probeChild(
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 10, y: 0 }],
        children: [path],
      },
      {
        x: { kind: LayoutAxisProposalKind.Exact, value: 20 },
        y: naturalAxis,
      },
    );

    expect(probed.result.slotSize.width).toBe(20);
    expect(probed.result.allocationBounds.x).toBe(10);
    expect(probed.result.allocationBounds.width).toBe(100);
  });

  it('返回有限零兼容 Coordinate 和空 Scope 结果，不带负零', () => {
    const coordinate = probeChild(
      { type: 'coordinate', id: 'origin', position: [-0, -0] },
      {
        x: { kind: LayoutAxisProposalKind.Exact, value: -0 },
        y: { kind: LayoutAxisProposalKind.Exact, value: -0 },
      },
    );
    const empty = probeChild(
      { type: 'scope', children: [] },
      {
        x: { kind: LayoutAxisProposalKind.Exact, value: 0 },
        y: { kind: LayoutAxisProposalKind.Exact, value: 0 },
      },
    );

    for (const value of [
      ...Object.values(coordinate.result.slotSize),
      ...Object.values(coordinate.result.allocationBounds),
      ...Object.values(coordinate.result.visualBounds),
      ...Object.values(empty.result.slotSize),
      ...Object.values(empty.result.allocationBounds),
      ...Object.values(empty.result.visualBounds),
    ]) {
      expect(Number.isFinite(value)).toBe(true);
      expect(Object.is(value, -0)).toBe(false);
    }

    expect(coordinate.result.slotSize).toEqual({ width: 0, height: 0 });
    expect(empty.result.slotSize).toEqual({ width: 0, height: 0 });
    expect(empty.result.allocationBounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('消除非空图元视觉边界中的负零', () => {
    const negativeZeroVisualShape = {
      ...BUILTIN_SHAPES.get('rectangle')!,
      name: 'negative-zero-visual',
      *emit(): Iterable<ScenePrimitive> {
        yield { type: 'rect', x: -0, y: -0, width: 10, height: 10, fill: '#000' };
      },
    };
    const probed = probeChild(
      {
        type: 'node',
        position: [0, 0],
        shape: 'negative-zero-visual',
        layout: { padding: 0, margin: 0 },
      },
      { x: naturalAxis, y: naturalAxis },
      { shapes: [negativeZeroVisualShape] },
    );

    expect(probed.result.visualBounds).toEqual({ x: 0, y: 0, width: 10, height: 10 });

    for (const value of Object.values(probed.result.visualBounds)) {
      expect(Object.is(value, -0)).toBe(false);
    }
  });
});
