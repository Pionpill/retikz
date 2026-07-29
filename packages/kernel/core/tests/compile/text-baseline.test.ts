import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type {
  IRChild,
  IRScene,
  LayoutAlignmentGuide,
  LayoutChildResult,
  ScenePrimitive,
  TextMeasurer,
  TextPrim,
} from '../../src';
import type { LowerTex } from '../../src/compile/text';

import {
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  LayoutChildProbeKind,
  NaturalLayoutProposal,
} from '../../src';
import { ASCENT_FACTOR, DESCENT_FACTOR, toAlphabeticBaselineY } from '../../src/compile/text';

const fixedMeasurer: TextMeasurer = text => ({
  width: text.length * 10,
  height: 10,
  ascent: 8,
  descent: 2,
});

const sceneOf = (child: IRChild): IRScene => ({
  version: 1,
  type: 'scene',
  children: [child],
});

const probeGuidesOf = (child: IRChild, measureText: TextMeasurer): ReadonlyArray<LayoutAlignmentGuide> | undefined => {
  let guides: ReadonlyArray<LayoutAlignmentGuide> | undefined;
  const inspector = defineComposite({
    namespace: 'test',
    type: 'baselineInspector',
    schema: CompositeBaseSchema.extend({
      namespace: z.literal('test'),
      type: z.literal('baselineInspector'),
    }),
    compile: (_node, context) => {
      const probe = context.layoutChild(child, NaturalLayoutProposal);
      if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
      guides = probe.result.alignmentGuides;
      return { children: [] };
    },
  });

  compileToScene(sceneOf({ namespace: 'test', type: 'baselineInspector' }), {
    composites: [inspector],
    measureText,
    padding: 0,
  });
  return guides;
};

const probeEmissionOf = (child: IRChild, measureText: TextMeasurer, precision?: number, lowerTex?: LowerTex) => {
  let guides: ReadonlyArray<LayoutAlignmentGuide> | undefined;
  let allocationHeight: number | undefined;
  let visualBounds: LayoutChildResult['visualBounds'] | undefined;
  const inspector = defineComposite({
    namespace: 'test',
    type: 'baselineEmissionInspector',
    schema: CompositeBaseSchema.extend({
      namespace: z.literal('test'),
      type: z.literal('baselineEmissionInspector'),
    }),
    compile: (_node, context) => {
      const probe = context.layoutChild(child, NaturalLayoutProposal);
      if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
      guides = probe.result.alignmentGuides;
      allocationHeight = probe.result.allocationBounds.height;
      visualBounds = probe.result.visualBounds;
      return { children: [context.replay(probe.result)] };
    },
  });
  const result = compileToScene(sceneOf({ namespace: 'test', type: 'baselineEmissionInspector' }), {
    composites: [inspector],
    measureText,
    padding: 0,
    precision,
    lowerTex,
  });
  return { guides, allocationHeight, visualBounds, primitives: result.scene.primitives };
};

const emittedTextPrimitives = (primitives: ReadonlyArray<ScenePrimitive>): Array<TextPrim> => {
  const textPrimitives: Array<TextPrim> = [];
  const visit = (primitive: ScenePrimitive): void => {
    if (primitive.type === 'group') {
      primitive.children.forEach(visit);
    } else if (primitive.type === 'text') {
      textPrimitives.push(primitive);
    }
  };
  primitives.forEach(visit);
  return textPrimitives;
};

const emittedPhysicalBaselines = (primitives: ReadonlyArray<ScenePrimitive>): Array<number> => {
  const baselines: Array<number> = [];
  const visit = (primitive: ScenePrimitive): void => {
    if (primitive.type === 'group') {
      primitive.children.forEach(visit);
      return;
    }
    if (primitive.type !== 'text') return;
    if (primitive.baseline !== 'alphabetic') throw new Error('expected alphabetic Node text emission');
    primitive.lines.forEach((_line, index) => baselines.push(primitive.y + index * primitive.lineHeight));
  };
  primitives.forEach(visit);
  return baselines;
};

const emittedFirstLastBaselines = (primitives: ReadonlyArray<ScenePrimitive>): Array<number> => {
  const baselines = emittedPhysicalBaselines(primitives);
  return baselines.length === 0 ? [] : [baselines[0], baselines[baselines.length - 1]];
};

/**
 * 任意 baseline 锚点 → 首行 alphabetic 基线 y 的折算
 * @description core 统一把 top/middle/bottom 折算成 alphabetic（唯一在 canvas textBaseline 与
 *   SVG dominant-baseline 两套模型里定义一致的基线），把垂直定位从两个 adapter 上移到编译期，
 *   消除「同名异义」导致的跨后端基线漂移。断言折算后文本块的视觉边界落在关键字所指位置，
 *   对 ascent/descent 近似常量的取值鲁棒
 */
describe('toAlphabeticBaselineY', () => {
  const fontSize = 16;
  const lineHeight = 20;
  const asc = fontSize * ASCENT_FACTOR;
  const desc = fontSize * DESCENT_FACTOR;
  const baselineY = (baseline: 'top' | 'middle' | 'bottom' | 'alphabetic', lineCount: number) =>
    toAlphabeticBaselineY({ y: 100, baseline, lineCount, lineHeight, fontSize });

  it('alphabetic 锚点原样返回（首行基线 = 锚点）', () => {
    expect(baselineY('alphabetic', 1)).toBe(100);
  });

  it('top 单行：块顶（ascent 线）落在锚点', () => {
    const b = baselineY('top', 1);
    expect(b - asc).toBeCloseTo(100, 10);
  });

  it('bottom 单行：块底（descent 线）落在锚点', () => {
    const b = baselineY('bottom', 1);
    expect(b + desc).toBeCloseTo(100, 10);
  });

  it('middle 单行：视觉中心落在锚点', () => {
    const b = baselineY('middle', 1);
    const top = b - asc;
    const bottom = b + desc;
    expect((top + bottom) / 2).toBeCloseTo(100, 10);
  });

  it('middle 多行：整块视觉中心落在锚点（绕锚点对称居中）', () => {
    const n = 3;
    const b = baselineY('middle', n);
    const top = b - asc;
    const bottom = b + (n - 1) * lineHeight + desc;
    expect((top + bottom) / 2).toBeCloseTo(100, 10);
  });

  it('top 多行：块顶（首行 ascent 线）落在锚点', () => {
    const n = 2;
    const b = baselineY('top', n);
    expect(b - asc).toBeCloseTo(100, 10);
  });

  it('bottom 多行：块底（末行 descent 线）落在锚点', () => {
    const n = 2;
    const b = baselineY('bottom', n);
    expect(b + (n - 1) * lineHeight + desc).toBeCloseTo(100, 10);
  });
});

describe('Node layout alignment baselines', () => {
  it('uses the same single physical-line metrics for equal first and last baselines', () => {
    const measureText = vi.fn<TextMeasurer>(fixedMeasurer);

    expect(
      probeGuidesOf(
        {
          type: 'node',
          position: [4, 10],
          text: 'A',
          lineHeight: 20,
          padding: 0,
          margin: 0,
        },
        measureText,
      ),
    ).toEqual([
      { name: 'first-baseline', dimension: 'y', position: 13 },
      { name: 'last-baseline', dimension: 'y', position: 13 },
    ]);
    expect(measureText).toHaveBeenCalledTimes(1);
  });

  it('uses the authored first physical-line metrics and fixed lineHeight slots for multiline baselines', () => {
    const measureText = vi.fn<TextMeasurer>(text => ({
      width: text.length * 10,
      height: 10,
      ascent: text === 'A' ? 8 : 6,
      descent: text === 'A' ? 2 : 4,
    }));

    expect(
      probeGuidesOf(
        {
          type: 'node',
          position: [4, 10],
          text: ['A', 'B'],
          lineHeight: 20,
          padding: 0,
          margin: 0,
        },
        measureText,
      ),
    ).toEqual([
      { name: 'first-baseline', dimension: 'y', position: 3 },
      { name: 'last-baseline', dimension: 'y', position: 23 },
    ]);
    expect(measureText).toHaveBeenCalledTimes(2);
  });

  it('does not invent baseline guides for children without body text', () => {
    expect(
      probeGuidesOf(
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
        fixedMeasurer,
      ),
    ).toBeUndefined();
    expect(probeGuidesOf({ type: 'node', position: [0, 0], padding: 0, margin: 0 }, fixedMeasurer)).toBeUndefined();
  });

  it('uses the same authoritative baseline for the guide and emitted single physical line', () => {
    const output = probeEmissionOf(
      {
        type: 'node',
        position: [4, 10],
        text: 'A',
        lineHeight: 20,
        padding: 0,
        margin: 0,
      },
      fixedMeasurer,
    );

    expect(emittedFirstLastBaselines(output.primitives)).toEqual(output.guides?.map(guide => guide.position));
  });

  it('keeps authored textHeight while matching oversized multiline metrics to emitted physical baselines', () => {
    const output = probeEmissionOf(
      {
        type: 'node',
        position: [4, 10],
        text: ['A', 'B'],
        lineHeight: 20,
        padding: 0,
        margin: 0,
      },
      text => ({ width: text.length * 10, height: 24, ascent: 16, descent: 8 }),
    );

    expect(output.allocationHeight).toBe(40);
    expect(output.guides).toEqual([
      { name: 'first-baseline', dimension: 'y', position: 4 },
      { name: 'last-baseline', dimension: 'y', position: 24 },
    ]);
    expect(emittedPhysicalBaselines(output.primitives)).toEqual([4, 24]);
  });

  it('keeps one grouped multiline TextPrim and fixed visual bounds when authored line metrics differ', () => {
    const output = probeEmissionOf(
      {
        type: 'node',
        position: [4, 10],
        text: ['A', 'B'],
        lineHeight: 20,
        padding: 0,
        margin: 0,
        fillOpacity: 0,
        strokeOpacity: 0,
      },
      text => ({
        width: text.length * 10,
        height: 10,
        ascent: text === 'A' ? 8 : 6,
        descent: text === 'A' ? 2 : 4,
      }),
    );

    expect(output.guides).toEqual([
      { name: 'first-baseline', dimension: 'y', position: 3 },
      { name: 'last-baseline', dimension: 'y', position: 23 },
    ]);
    expect(emittedPhysicalBaselines(output.primitives)).toEqual([3, 23]);
    expect(emittedTextPrimitives(output.primitives)).toHaveLength(1);
    expect(emittedTextPrimitives(output.primitives)[0].lines).toHaveLength(2);
    expect(output.visualBounds).toEqual({ x: -1, y: -37, width: 10, height: 40 });
  });

  it('rounds guides with the same precision as grouped TextPrim physical baselines', () => {
    const output = probeEmissionOf(
      {
        type: 'node',
        position: [4, 10],
        text: ['A', 'B'],
        lineHeight: 20.26,
        padding: 0,
        margin: 0,
        fillOpacity: 0,
        strokeOpacity: 0,
      },
      text => ({
        width: text.length * 10,
        height: 10,
        ascent: text === 'A' ? 8 : 6,
        descent: text === 'A' ? 2 : 4,
      }),
      1,
    );

    expect(output.guides).toEqual([
      { name: 'first-baseline', dimension: 'y', position: 2.9 },
      { name: 'last-baseline', dimension: 'y', position: 23.2 },
    ]);
    expect(emittedPhysicalBaselines(output.primitives)).toEqual([2.9, 23.2]);
    expect(emittedTextPrimitives(output.primitives)).toHaveLength(1);
    expect(output.visualBounds).toEqual({ x: -1, y: -37.6, width: 10, height: 40.5 });
  });

  it('uses each mixed/TeX line real rounded baseline instead of grouped plain lineHeight spacing', () => {
    const lowerTex: LowerTex = () => ({ paths: [], width: 1, height: 1, depth: 0 });
    const output = probeEmissionOf(
      {
        type: 'node',
        position: [4, 7.04],
        text: [{ runs: [{ text: 'A' }, { tex: 'x' }] }, { runs: [{ text: 'B' }, { tex: 'x' }] }],
        lineHeight: 20,
        padding: 0,
        margin: 0,
      },
      text =>
        text === 'A'
          ? { width: 10, height: 10, ascent: 8, descent: 2 }
          : { width: 10, height: 24, ascent: 20, descent: 4 },
      1,
      lowerTex,
    );

    expect(emittedPhysicalBaselines(output.primitives)).toEqual([-2, 25]);
    expect(output.guides?.map(guide => guide.position)).toEqual([-2, 25]);
    expect(emittedTextPrimitives(output.primitives)).toHaveLength(2);
  });
});
