import { describe, expect, it, vi } from 'vitest';
import { literal } from 'zod';

import type {
  IRChild,
  IRScene,
  LayoutAlignmentGuide,
  LayoutChildResult,
  ScenePrimitive,
  TextMeasurer,
  TextPrimitive,
} from '../../src';
import {
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  LayoutChildProbeKind,
  naturalLayoutProposal,
} from '../../src';
import type { TexLowerer } from '../../src/compile/text';
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
      namespace: literal('test'),
      type: literal('baselineInspector'),
    }),
    compile: (_node, context) => {
      const probe = context.layoutChild(child, naturalLayoutProposal);
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

const probeEmissionOf = (child: IRChild, measureText: TextMeasurer, precision?: number, lowerTex?: TexLowerer) => {
  let guides: ReadonlyArray<LayoutAlignmentGuide> | undefined;
  let allocationHeight: number | undefined;
  let visualBounds: LayoutChildResult['visualBounds'] | undefined;
  const inspector = defineComposite({
    namespace: 'test',
    type: 'baselineEmissionInspector',
    schema: CompositeBaseSchema.extend({
      namespace: literal('test'),
      type: literal('baselineEmissionInspector'),
    }),
    compile: (_node, context) => {
      const probe = context.layoutChild(child, naturalLayoutProposal);
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

const emittedTextPrimitives = (primitives: ReadonlyArray<ScenePrimitive>): Array<TextPrimitive> => {
  const textPrimitives: Array<TextPrimitive> = [];

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

describe('Node 布局对齐基线', () => {
  it('对相同的第一个和最后一个基线使用相同的单个物理线路度量', () => {
    const measureText = vi.fn<TextMeasurer>(fixedMeasurer);

    expect(
      probeGuidesOf(
        {
          type: 'node',
          position: [4, 10],
          text: 'A',
          layout: { lineHeight: 20, padding: 0, margin: 0 },
        },
        measureText,
      ),
    ).toEqual([
      { name: 'first-baseline', dimension: 'y', position: 13 },
      { name: 'last-baseline', dimension: 'y', position: 13 },
    ]);
    expect(measureText).toHaveBeenCalledTimes(1);
  });

  it('使用编写的第一个物理线路指标和固定的 lineHeight 槽位作为多线路基线', () => {
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
          layout: { lineHeight: 20, padding: 0, margin: 0 },
        },
        measureText,
      ),
    ).toEqual([
      { name: 'first-baseline', dimension: 'y', position: 3 },
      { name: 'last-baseline', dimension: 'y', position: 23 },
    ]);
    expect(measureText).toHaveBeenCalledTimes(2);
  });

  it('不会为没有正文的儿童发明基线辅助线', () => {
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
    expect(
      probeGuidesOf(
        {
          type: 'node',
          position: [0, 0],
          layout: { padding: 0, margin: 0 },
        },
        fixedMeasurer,
      ),
    ).toBeUndefined();
  });

  it('对引导和发射的单条物理线使用相同的权威基线', () => {
    const output = probeEmissionOf(
      {
        type: 'node',
        position: [4, 10],
        text: 'A',
        layout: { lineHeight: 20, padding: 0, margin: 0 },
      },
      fixedMeasurer,
    );

    expect(emittedFirstLastBaselines(output.primitives)).toEqual(output.guides?.map(guide => guide.position));
  });

  it('保留编写的 textHeight，同时将超大的多行指标与发出的物理基线进行匹配', () => {
    const output = probeEmissionOf(
      {
        type: 'node',
        position: [4, 10],
        text: ['A', 'B'],
        layout: { lineHeight: 20, padding: 0, margin: 0 },
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

  it('当编写的线指标不同时，保留一组多线 TextPrimitive 和固定的视觉边界', () => {
    const output = probeEmissionOf(
      {
        type: 'node',
        position: [4, 10],
        text: ['A', 'B'],
        style: { opacity: { fill: 0, stroke: 0 } },
        layout: { lineHeight: 20, padding: 0, margin: 0 },
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
    expect(output.visualBounds).toEqual({ x: -1, y: -17, width: 10, height: 40 });
  });

  it('以与分组 TextPrimitive 物理基线相同的精度倒圆导轨', () => {
    const output = probeEmissionOf(
      {
        type: 'node',
        position: [4, 10],
        text: ['A', 'B'],
        style: { opacity: { fill: 0, stroke: 0 } },
        layout: { lineHeight: 20.26, padding: 0, margin: 0 },
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
    expect(output.visualBounds).toEqual({ x: -1, y: -17.3, width: 10, height: 40.5 });
  });

  it('使用每个混合/TeX 线真正的圆形基线，而不是分组的普通 lineHeight 间距', () => {
    const lowerTex: TexLowerer = () => ({ paths: [], width: 1, height: 1, depth: 0 });
    const output = probeEmissionOf(
      {
        type: 'node',
        position: [4, 7.04],
        text: [{ segments: [{ text: 'A' }, { tex: 'x' }] }, { segments: [{ text: 'B' }, { tex: 'x' }] }],
        layout: { lineHeight: 20, padding: 0, margin: 0 },
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
