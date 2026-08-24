import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import type {
  CompileOptions,
  IRChild,
  IRScene,
  LayoutChildResult,
  LayoutProposal,
  ScenePrimitive,
  TextMeasurer,
  TextPrim,
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

const plainNode = (text: string): IRChild => ({
  type: 'node',
  position: [0, 0],
  text,
  font: { size: 10 },
  lineHeight: 10,
  padding: 0,
  margin: 0,
  fill: 'transparent',
  stroke: 'transparent',
});

const probeChild = (
  child: IRChild,
  proposal: LayoutProposal,
  options: Pick<CompileOptions, 'lowerTex' | 'shapes'> = {},
): {
  result: LayoutChildResult;
  textPrimitives: Array<TextPrim>;
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
      (primitive): primitive is TextPrim => primitive.type === 'text',
    ),
  };
};

describe('plain Node proposal consumption', () => {
  it('uses authored hard lines for natural width and the widest breakable unit for minimum width', () => {
    const child = plainNode('aa bbbb\ncc d');
    const natural = probeChild(child, { x: naturalAxis, y: naturalAxis });
    const minimum = probeChild(child, { x: minimumAxis, y: naturalAxis });

    expect(natural.result.slotSize).toEqual({ width: 70, height: 20 });
    expect(natural.textPrimitives[0].lines.map(line => line.text)).toEqual(['aa bbbb', 'cc d']);
    expect(minimum.result.slotSize).toEqual({ width: 40, height: 30 });
    expect(minimum.result.allocationBounds).toMatchObject({ width: 40, height: 30 });
    expect(minimum.textPrimitives[0].lines.map(line => line.text)).toEqual(['aa', 'bbbb', 'cc d']);
  });

  it('reflows at an exact allocation width and reports the resulting natural y contribution', () => {
    const probed = probeChild(plainNode('aa bb cc'), {
      x: { kind: LayoutAxisProposalKind.Exact, value: 40 },
      y: naturalAxis,
    });

    expect(probed.result.slotSize).toEqual({ width: 40, height: 30 });
    expect(probed.result.allocationBounds).toMatchObject({ width: 20, height: 30 });
    expect(probed.textPrimitives[0].lines.map(line => line.text)).toEqual(['aa', 'bb', 'cc']);
  });

  it('resolves y minimum from the actual height after applying the x proposal', () => {
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

  it('keeps real text height when the y proposal is exact', () => {
    const probed = probeChild(plainNode('aa'), {
      x: naturalAxis,
      y: { kind: LayoutAxisProposalKind.Exact, value: 2 },
    });

    expect(probed.result.slotSize).toEqual({ width: 20, height: 2 });
    expect(probed.result.allocationBounds).toMatchObject({ width: 20, height: 10 });
    expect(probed.textPrimitives[0].measuredHeight).toBe(10);
  });

  it('keeps natural layout inside a range and reflows only at its finite upper budget', () => {
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

  it('subtracts allocation margin and padding while preserving a stricter authored maxTextWidth', () => {
    const boxed = probeChild(
      {
        ...plainNode('aa bb'),
        padding: 5,
        margin: 5,
      },
      {
        x: { kind: LayoutAxisProposalKind.Exact, value: 60 },
        y: naturalAxis,
      },
    );
    const authored = probeChild(
      {
        ...plainNode('aa bb'),
        maxTextWidth: 30,
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

  it('uses the actual allocation box of builtin and custom non-rectangular shapes as the finite width budget', () => {
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
      ...BUILTIN_SHAPES.rectangle,
      name: 'double-width',
      circumscribe: (halfWidth: number, halfHeight: number) => ({
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

  it('preserves the best real allocation across non-monotonic custom shape feedback', () => {
    const nonMonotonicShape = {
      ...BUILTIN_SHAPES.rectangle,
      name: 'non-monotonic',
      circumscribe: (_halfWidth: number, halfHeight: number) => ({
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

  it('keeps the authored natural candidate when rotation makes its real allocation fit', () => {
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

describe('atomic Node content proposal refusal', () => {
  const mixedNode: IRChild = {
    type: 'node',
    position: [0, 0],
    text: [{ runs: [{ text: 'aa bb' }] }, { runs: [{ text: 'cccc' }] }],
    font: { size: 10 },
    lineHeight: 10,
    padding: 0,
    margin: 0,
  };

  it('keeps mixed authored lines atomic for minimum and exact x proposals', () => {
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

  it('keeps a lowered TeX authored line atomic for minimum, range, and exact x proposals', () => {
    const texNode: IRChild = {
      type: 'node',
      position: [0, 0],
      text: [{ runs: [{ tex: 'x' }] }],
      font: { size: 10 },
      lineHeight: 10,
      padding: 0,
      margin: 0,
      fill: 'transparent',
      stroke: 'transparent',
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

describe('fixed built-in geometry proposal refusal', () => {
  const path: IRChild = {
    type: 'path',
    children: [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [100, 0] },
    ],
  };

  it('keeps a Path real allocation under exact and range proposals', () => {
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

  it('keeps an ordinary Scope real allocation instead of forwarding its proposal to descendants', () => {
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

  it('returns finite zero-compatible Coordinate and empty Scope results without negative zero', () => {
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

  it('normalizes negative zero in non-empty primitive visual bounds', () => {
    const negativeZeroVisualShape = {
      ...BUILTIN_SHAPES.rectangle,
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
        padding: 0,
        margin: 0,
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
