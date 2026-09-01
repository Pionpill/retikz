import type { IRNode, IRScope, ScenePrimitive } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';

import { compileToScene } from '@retikz/core';
import { SectorShapeDefinition } from '@retikz/standard/shape';
import { describe, expect, it } from 'vitest';
import { literal, object } from 'zod';

import type { Cell, CoordinateFrame, PositionScale } from '../../../src/contract';
import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import type { IRPlot, IRPlotReferenceMark } from '../../../src/schemas';

import { createCoordinateFrame, defineCoordinate, densifyCellContour } from '../../../src/contract';
import { lowerPlot } from '../../../src/pipeline/expand/lower';
import { lowerMark as lowerMarkDefinition, resolveMarkRegistry } from '../../../src/providers';
import { createCartesianCoordinate, createPolarCoordinate } from '../../../src/providers';
import { resolveMarkOperation } from '../../../src/resolve/mark';
import { PlotSchema, PolarInterpolation } from '../../../src/schemas';

/** core Path 的最小形态（鸭子类型断言端点；避免引入 core 内部 IRPath 类型耦合） */
type RulePath = {
  type: 'path';
  children: Array<{
    kind: string;
    to?: [number, number];
    radius?: number;
    startAngle?: number;
    endAngle?: number;
    closed?: string;
  }>;
  pathDefault?: unknown;
};

/**
 * Rule mark 下沉契约测试：line 下沉 core Path，band 复用 projectCell。
 * 验证 line 几何（满铺 / extent 截断 / per-datum / color）、band → projectCell 区域（rect / sector / 可连接）、
 * 取向 fail-loud、extent 单设 fail-loud、band 上界不匹配 fail-loud、坐标系矩阵 fail-loud、polar 径向线 / 常半径环、rule + bar z-order
 */

type Datasets = Record<string, Array<Record<string, unknown>>>;

const markRegistry = resolveMarkRegistry();
const lowerMark = (mark: IRPlotReferenceMark, rows: Array<ExternalRow>, frame: CoordinateFrame) =>
  lowerMarkDefinition(resolveMarkOperation(mark, { registry: markRegistry }), rows, frame);

const WIDTH = 400;
const HEIGHT = 400;
const cartOpts: LowerPlotsOptions = { width: WIDTH, height: HEIGHT };

const expandOf = (spec: IRPlot, datasets: Datasets, options: LowerPlotsOptions): IRScope => {
  return lowerPlot(spec, datasets, options) as IRScope;
};

/** 连续 linear PositionScale 桩（bandwidth = 0） */
const linearStub = (domain: [number, number], range: [number, number]): PositionScale => {
  let r: [number, number] = range;
  const [d0, d1] = domain;
  return {
    coordinate: (value: unknown) =>
      typeof value === 'number' && Number.isFinite(value) ? r[0] + ((value - d0) / (d1 - d0)) * (r[1] - r[0]) : NaN,
    domain: () => [d0, d1],
    get bandwidth() {
      return 0;
    },
    ticks: () => ({ values: [], labels: [] }),
    range: () => [r[0], r[1]],
    setRange: next => {
      r = [next[0], next[1]];
    },
  };
};

/** 收集图层内所有 path（线 rule） */
const pathsOf = (layer: IRScope): Array<RulePath> => {
  const out: Array<RulePath> = [];
  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'path') out.push(node as unknown as RulePath);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };
  walk(layer.children);
  return out;
};

/** 收集图层内所有 node（band rule） */
const nodesOf = (layer: IRScope): Array<IRNode> => {
  const out: Array<IRNode> = [];
  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'node') out.push(child as IRNode);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };
  walk(layer.children);
  return out;
};

const nodeWidth = (node: IRNode): number => {
  const size = node.minimumSize;
  if (typeof size === 'number') return size;
  return size?.width ?? size?.default ?? 0;
};

const nodeHeight = (node: IRNode): number => {
  const size = node.minimumSize;
  if (typeof size === 'number') return size;
  return size?.height ?? size?.default ?? 0;
};

const flattenPrimitives = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> => {
  const out: Array<ScenePrimitive> = [];
  for (const primitive of primitives) {
    out.push(primitive);
    if (primitive.type === 'group') out.push(...flattenPrimitives(primitive.children));
  }
  return out;
};

/** 取一条 path 的 [move 点, line 点]（move + 单 line step 的两端） */
const endpointsOf = (path: RulePath): [[number, number], [number, number]] => {
  const steps = path.children;
  const hasPointTarget = (step: (typeof steps)[number]): step is (typeof steps)[number] & { to: [number, number] } =>
    step.to !== undefined;
  const move = steps.find(
    (s): s is (typeof steps)[number] & { to: [number, number] } => s.kind === 'move' && hasPointTarget(s),
  )!;
  const lines = steps.filter(
    (s): s is (typeof steps)[number] & { to: [number, number] } => s.kind === 'line' && hasPointTarget(s),
  );
  return [move.to, lines[lines.length - 1].to];
};

/** cartesian2D 帧：x 域 [0,10]→像素 [0,400]，y 域 [0,100]→像素 [400,0]（y 倒置） */
const cartFrame = () => createCartesianCoordinate(linearStub([0, 10], [0, 400]), linearStub([0, 100], [400, 0]));

// ── happy path：cartesian line ──────────────────────────────────────────────────────────
describe('rule cartesian line 几何', () => {
  it('rule-horizontal-fullspan', () => {
    // y=80 水平 rule，跨满 x 域 [0,400]；y 像素 = 400 - 80/100*400 = 80
    const mark: IRPlotReferenceMark = { type: 'reference', encoding: { y: { value: 80 } } };
    const layer = lowerMark(mark, [{}], cartFrame()) as IRScope;
    const paths = pathsOf(layer);
    expect(paths).toHaveLength(1);
    const [a, b] = endpointsOf(paths[0]);
    expect(a).toEqual([0, 80]);
    expect(b).toEqual([400, 80]);
  });

  it('rule-vertical-fullspan', () => {
    // x=5 竖直 rule，跨满 y 域 [400,0]；x 像素 = 5/10*400 = 200
    const mark: IRPlotReferenceMark = { type: 'reference', encoding: { x: { value: 5 } } };
    const layer = lowerMark(mark, [{}], cartFrame()) as IRScope;
    const [a, b] = endpointsOf(pathsOf(layer)[0]);
    expect(a).toEqual([200, 400]);
    expect(b).toEqual([200, 0]);
  });

  it('rule-per-datum-field', () => {
    // 每行一条水平 rule（y=limit field）；3 行 → 3 条 path
    const mark: IRPlotReferenceMark = { type: 'reference', encoding: { y: { field: 'limit' } } };
    const rows = [{ limit: 20 }, { limit: 50 }, { limit: 90 }];
    const layer = lowerMark(mark, rows, cartFrame()) as IRScope;
    expect(pathsOf(layer)).toHaveLength(3);
  });

  it('rule-per-datum-color-field-grouped-stroke', () => {
    // color field → 按色分子 Scope 上提 stroke
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: {
        reference: 'd',
        model: [
          { name: 'limit', type: 'continuous' },
          { name: 'cat', type: 'categorical' },
        ],
      },
      coordinate: { type: 'cartesian2D', y: '__y' },
      scales: [
        { type: 'linear', name: '__y' },
        { type: 'ordinal', name: '__color' },
      ],
      marks: [{ type: 'reference', encoding: { y: { field: 'limit' }, color: { field: 'cat', scale: '__color' } } }],
    });
    const layer = expandOf(
      spec,
      {
        d: [
          { limit: 20, cat: 'a' },
          { limit: 50, cat: 'b' },
          { limit: 90, cat: 'a' },
        ],
      },
      cartOpts,
    ).children[0] as IRScope;
    // 2 色 → 2 个分色子 Scope（各带 pathDefault.stroke）
    const colorScopes = (layer.children as Array<{ type?: string; pathDefault?: { stroke?: string } }>).filter(
      c => c.type === 'scope' && c.pathDefault?.stroke !== undefined,
    );
    expect(colorScopes).toHaveLength(2);
    expect(pathsOf(layer)).toHaveLength(3);
  });

  it('rule-single-line-color-value', () => {
    const mark: IRPlotReferenceMark = {
      type: 'reference',
      encoding: { y: { value: 80 }, color: { value: 'crimson' } },
    };
    const layer = lowerMark(mark, [{}], cartFrame()) as IRScope;
    expect((layer.pathDefault as { stroke?: string }).stroke).toBe('crimson');
  });

  it('constant-rule-with-color-field-fail-loud', () => {
    // 常量 rule（单条 full-span）+ color 字段 = 一条线配 N 色，语义矛盾 → fail-loud（不静默塌成 row0 色）
    const mark: IRPlotReferenceMark = {
      type: 'reference',
      encoding: { y: { value: 80 }, color: { field: 'cat', scale: '__color' } },
    };
    expect(() => lowerMark(mark, [{ cat: 'a' }, { cat: 'b' }], cartFrame())).toThrow(/constant rule|color field/i);
  });
});

// ── happy path：cartesian band → projectCell rect ───────────────────────────────────────
describe('rule cartesian band 几何（projectCell rect）', () => {
  it('rule-band-cartesian-rect', () => {
    // 水平 band y∈[70,90]，跨满 x 域 → rect Node。y 像素：70→120、90→40 → 高 80、中心 80；x 满铺 [0,400] → 宽 400、中心 200
    const mark: IRPlotReferenceMark = { type: 'reference', encoding: { y: { value: 70 } }, yTo: 90 };
    const layer = lowerMark(mark, [{}], cartFrame()) as IRScope;
    const nodes = nodesOf(layer);
    expect(nodes).toHaveLength(1);
    expect(nodeWidth(nodes[0])).toBe(400);
    expect(nodeHeight(nodes[0])).toBe(80);
    expect(nodes[0].position).toEqual([200, 80]);
  });

  it('rule-band-vertical-rect', () => {
    // 竖直 band x∈[2,5]，跨满 y 域 → rect。x 像素 80..200 → 宽 120、中心 140；y 满铺 [400,0] → 高 400、中心 200
    const mark: IRPlotReferenceMark = { type: 'reference', encoding: { x: { value: 2 } }, xTo: 5 };
    const nodes = nodesOf(lowerMark(mark, [{}], cartFrame()) as IRScope);
    expect(nodeWidth(nodes[0])).toBe(120);
    expect(nodeHeight(nodes[0])).toBe(400);
    expect(nodes[0].position).toEqual([140, 200]);
  });

  it('rule-band-per-datum-field', () => {
    // per-datum band y∈[lo,hi]，多行 → 每行一个 band Node
    const mark: IRPlotReferenceMark = { type: 'reference', encoding: { y: { field: 'lo' } }, yTo: 'hi' };
    const rows = [
      { lo: 10, hi: 30 },
      { lo: 60, hi: 80 },
    ];
    const nodes = nodesOf(lowerMark(mark, rows, cartFrame()) as IRScope);
    expect(nodes).toHaveLength(2);
  });

  it('rule-region-cartesian-rect', () => {
    // region x∈[2,5] 且 y∈[70,90] → rect Node。x 像素 80..200，y 像素 120..40
    const mark: IRPlotReferenceMark = {
      type: 'reference',
      kind: 'region',
      encoding: { x: { value: 2 }, y: { value: 70 } },
      xTo: 5,
      yTo: 90,
    };
    const nodes = nodesOf(lowerMark(mark, [{}], cartFrame()) as IRScope);
    expect(nodes).toHaveLength(1);
    expect(nodeWidth(nodes[0])).toBe(120);
    expect(nodeHeight(nodes[0])).toBe(80);
    expect(nodes[0].position).toEqual([140, 80]);
  });

  it('rule-region-per-datum-field', () => {
    // per-datum region 四边界均可来自字段；每行一个区域 Node
    const mark: IRPlotReferenceMark = {
      type: 'reference',
      kind: 'region',
      encoding: { x: { field: 'x0' }, y: { field: 'y0' } },
      xTo: 'x1',
      yTo: 'y1',
    };
    const rows = [
      { x0: 1, x1: 2, y0: 20, y1: 30 },
      { x0: 4, x1: 6, y0: 40, y1: 70 },
    ];
    expect(nodesOf(lowerMark(mark, rows, cartFrame()) as IRScope)).toHaveLength(2);
  });

  it('rule-band-color-value-fill', () => {
    const mark: IRPlotReferenceMark = {
      type: 'reference',
      encoding: { y: { value: 70 }, color: { value: 'amber' } },
      yTo: 90,
    };
    const layer = lowerMark(mark, [{}], cartFrame()) as IRScope;
    expect((layer.nodeDefault as { fill?: string }).fill).toBe('amber');
  });

  it('rule-band-compiles-to-scene', () => {
    const mark: IRPlotReferenceMark = { type: 'reference', encoding: { y: { value: 70 } }, yTo: 90 };
    const layer = lowerMark(mark, [{}], cartFrame()) as IRScope;
    expect(() => compileToScene({ version: 1, type: 'scene', children: [layer] }).scene).not.toThrow();
  });
});

// ── 边界：extent / 单行 / 空数据 ─────────────────────────────────────────────────────────
describe('rule 边界', () => {
  it('rule-extent-partial', () => {
    // 竖直 rule x=5，y 从 extent [20,60] 截断（非满铺）；y 像素 20→320、60→160
    const mark: IRPlotReferenceMark = {
      type: 'reference',
      extentField: 'lo',
      extentToField: 'hi',
      encoding: { x: { value: 5 } },
    };
    const layer = lowerMark(mark, [{ lo: 20, hi: 60 }], cartFrame()) as IRScope;
    const [a, b] = endpointsOf(pathsOf(layer)[0]);
    expect(a).toEqual([200, 320]);
    expect(b).toEqual([200, 160]);
  });

  it('rule-band-extent-partial', () => {
    // 水平 band y∈[70,90]，x 从 extent [2,8] 截断；x 像素 80..320 → 宽 240、中心 200
    const mark: IRPlotReferenceMark = {
      type: 'reference',
      extentField: 'a',
      extentToField: 'b',
      encoding: { y: { value: 70 } },
      yTo: 90,
    };
    const nodes = nodesOf(lowerMark(mark, [{ a: 2, b: 8 }], cartFrame()) as IRScope);
    expect(nodeWidth(nodes[0])).toBe(240);
    expect(nodes[0].position).toEqual([200, 80]);
  });

  it('rule-single-row', () => {
    const mark: IRPlotReferenceMark = { type: 'reference', encoding: { y: { field: 'v' } } };
    const layer = lowerMark(mark, [{ v: 42 }], cartFrame()) as IRScope;
    expect(pathsOf(layer)).toHaveLength(1);
  });

  it('rule-empty-rows-null', () => {
    const mark: IRPlotReferenceMark = { type: 'reference', encoding: { y: { field: 'v' } } };
    expect(lowerMark(mark, [], cartFrame())).toBeNull();
  });

  it('rule-nonfinite-extent-skipped', () => {
    const mark: IRPlotReferenceMark = {
      type: 'reference',
      extentField: 'lo',
      extentToField: 'hi',
      encoding: { x: { value: 5 } },
    };
    // 缺 extent 字段 → coordinate NaN → 跳过 → null
    expect(lowerMark(mark, [{}], cartFrame())).toBeNull();
  });
});

// ── 错误路径：取向 / extent / band 上界 / 坐标系矩阵 fail-loud ─────────────────────────────
describe('rule fail-loud', () => {
  it('rule-orientation-conflict-both', () => {
    const mark = { type: 'reference', encoding: { x: { value: 5 }, y: { value: 80 } } } as IRPlotReferenceMark;
    expect(() => lowerMark(mark, [{}], cartFrame())).toThrow(/exactly one of encoding\.x|orientation|both/i);
  });

  it('rule-orientation-conflict-neither', () => {
    const mark = { type: 'reference', encoding: {} } as IRPlotReferenceMark;
    expect(() => lowerMark(mark, [{}], cartFrame())).toThrow(/exactly one of encoding\.x|orientation|neither/i);
  });

  it('rule-extent-unpaired', () => {
    const mark = { type: 'reference', extentField: 'lo', encoding: { x: { value: 5 } } } as IRPlotReferenceMark;
    expect(() => lowerMark(mark, [{ lo: 1 }], cartFrame())).toThrow(/extentField|extentToField|together/i);
  });

  it('rule-band-bound-mismatch-x-with-yTo', () => {
    const mark = { type: 'reference', yTo: 90, encoding: { x: { value: 5 } } } as IRPlotReferenceMark;
    expect(() => lowerMark(mark, [{}], cartFrame())).toThrow(/yTo|match the bound dimension|xTo/i);
  });

  it('rule-band-bound-mismatch-y-with-xTo', () => {
    const mark = { type: 'reference', xTo: 5, encoding: { y: { value: 80 } } } as IRPlotReferenceMark;
    expect(() => lowerMark(mark, [{}], cartFrame())).toThrow(/xTo|match the bound dimension|yTo/i);
  });

  it('rule-region-requires-four-bounds', () => {
    const mark = {
      type: 'reference',
      kind: 'region',
      xTo: 5,
      encoding: { x: { value: 2 }, y: { value: 70 } },
    } as IRPlotReferenceMark;
    expect(() => lowerMark(mark, [{}], cartFrame())).toThrow(/region|required|yTo/i);
  });

  it('rule-region-rejects-extent', () => {
    const mark = {
      type: 'reference',
      kind: 'region',
      xTo: 5,
      yTo: 90,
      extentField: 'lo',
      extentToField: 'hi',
      encoding: { x: { value: 2 }, y: { value: 70 } },
    } as IRPlotReferenceMark;
    expect(() => lowerMark(mark, [{ lo: 0, hi: 10 }], cartFrame())).toThrow(/region|extentField|extentToField/i);
  });

  it('rule-coord-1d-fail-loud', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      coordinate: { type: 'cartesian1D', x: '__x' },
      scales: [{ type: 'linear', name: '__x' }],
      marks: [{ type: 'reference', encoding: { x: { value: 5 } } }],
    });
    expect(() => expandOf(spec, { d: [{}] }, cartOpts)).toThrow(/cartesian1D|not supported|rule/i);
  });
});

// ── 交互：polar line / band + z-order ────────────────────────────────────────────────────
describe('rule polar', () => {
  const polarFrame = (interpolation: 'polar' | 'chord' = PolarInterpolation.Polar) =>
    createPolarCoordinate({
      center: [200, 200],
      innerRadius: 0,
      outerRadius: 150,
      startAngle: 0,
      endAngle: 360,
      interpolation,
      angularSkeleton: [0, 90, 180, 270],
      primary: linearStub([0, 360], [0, 360]),
      secondary: linearStub([0, 100], [0, 150]),
    });

  it('rule-polar-radial-line', () => {
    // 竖直 rule x=90（常量角度）→ 径向线 inner(r=0)→outer(r=150)，单 line step
    const mark: IRPlotReferenceMark = { type: 'reference', encoding: { x: { value: 90 } } };
    const layer = lowerMark(mark, [{}], polarFrame()) as IRScope;
    const paths = pathsOf(layer);
    expect(paths).toHaveLength(1);
    expect(paths[0].children.filter(s => s.kind === 'line')).toHaveLength(1);
  });

  it('rule-polar-constant-radius-ring', () => {
    // 水平 rule y=50（常量半径）→ 常半径环，用 core circlePath 表达，避免采样成多边形
    const mark: IRPlotReferenceMark = { type: 'reference', encoding: { y: { value: 50 } } };
    const layer = lowerMark(mark, [{}], polarFrame()) as IRScope;
    const steps = pathsOf(layer)[0].children;
    expect(steps.map(s => s.kind)).toEqual(['move', 'circlePath']);
    expect(steps[1].radius).toBeCloseTo(75, 6);
  });

  it('rule-band-polar-ring-sector', () => {
    // 水平 band y∈[40,60]（半径区间）→ projectCell 环带 sector（innerRadius=coord(40)=60、outerRadius=coord(60)=90）
    const mark: IRPlotReferenceMark = { type: 'reference', encoding: { y: { value: 40 } }, yTo: 60 };
    const layer = lowerMark(mark, [{}], polarFrame()) as IRScope;
    const node = nodesOf(layer)[0];
    const shape = node.shape as { type: string; params: { innerRadius: number; outerRadius: number } };
    expect(shape.type).toBe('sector');
    expect(shape.params.innerRadius).toBeGreaterThan(0);
    expect(shape.params.innerRadius).toBeCloseTo(60, 6);
    expect(shape.params.outerRadius).toBeCloseTo(90, 6);
  });

  it('rule-polar-constant-radius-ring_inherits_chord_interpolation', () => {
    const mark: IRPlotReferenceMark = { type: 'reference', encoding: { y: { value: 50 } } };
    const layer = lowerMark(mark, [{}], polarFrame(PolarInterpolation.Chord)) as IRScope;
    expect(pathsOf(layer)[0].children.map(step => step.kind)).toEqual(['move', 'line', 'line', 'line', 'cycle']);
  });

  it('rule-band-polar-mark_override_takes_precedence_over_the_frame', () => {
    const polarMark: IRPlotReferenceMark = {
      type: 'reference',
      interpolation: 'polar',
      encoding: { y: { value: 40 } },
      yTo: 60,
    };
    const chordMark: IRPlotReferenceMark = {
      type: 'reference',
      interpolation: 'chord',
      encoding: { y: { value: 40 } },
      yTo: 60,
    };
    const polarNode = nodesOf(lowerMark(polarMark, [{}], polarFrame(PolarInterpolation.Chord)) as IRScope)[0];
    const chordNode = nodesOf(lowerMark(chordMark, [{}], polarFrame()) as IRScope)[0];
    expect((polarNode.shape as { type?: string } | undefined)?.type).toBe('sector');
    expect((chordNode.shape as { type?: string } | undefined)?.type).toBe('contour');
  });

  it('rule-cartesian-rejects-a-polar-interpolation-override', () => {
    const mark: IRPlotReferenceMark = {
      type: 'reference',
      interpolation: 'chord',
      encoding: { y: { value: 40 } },
      yTo: 60,
    };
    expect(() => lowerMark(mark, [{}], cartFrame())).toThrow(/interpolation|polar2D/i);
  });

  it('rule-band-polar-demo-categorical-angle-keeps-inner-radius', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: {
        reference: 'd',
        model: [
          { name: 'name', type: 'categorical' },
          { name: 'score', type: 'continuous' },
        ],
      },
      coordinate: { type: 'polar2D', interpolation: 'polar' },
      scales: [],
      marks: [
        { type: 'reference', encoding: { y: { value: 60 }, color: { value: '#fde68a' } }, yTo: 80 },
        { type: 'point', encoding: { x: { field: 'name' }, y: { field: 'score' } } },
      ],
    });
    const layer = expandOf(
      spec,
      {
        d: [
          { name: 'Amy', score: 52 },
          { name: 'Ben', score: 74 },
          { name: 'Cara', score: 61 },
          { name: 'Dan', score: 88 },
          { name: 'Eve', score: 45 },
          { name: 'Fay', score: 93 },
        ],
      },
      cartOpts,
    ).children[0] as IRScope;
    const shape = nodesOf(layer)[0].shape as {
      type: string;
      params: { innerRadius: number; outerRadius: number; startAngle: number; endAngle: number };
    };
    expect(shape.type).toBe('sector');
    expect(shape.params.innerRadius).toBeGreaterThan(0);
    expect(shape.params.outerRadius).toBeGreaterThan(shape.params.innerRadius);
    expect(shape.params.startAngle).toBe(0);
    expect(shape.params.endAngle).toBe(360);

    const scene = compileToScene(
      { version: 1, type: 'scene', children: [layer] },
      { shapes: [SectorShapeDefinition] },
    ).scene;
    const filledRing = flattenPrimitives(scene.primitives).find(
      (p): p is Extract<ScenePrimitive, { type: 'path' }> => p.type === 'path' && p.fill === '#fde68a',
    );
    expect(filledRing?.type).toBe('path');
    expect(filledRing?.fillRule).toBe('evenodd');
  });

  it('rule-polar-field-radius-rings-use-circle-path-and-omit-zero-radius', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: {
        reference: 'd',
        model: [
          { name: 'tier', type: 'categorical' },
          { name: 'threshold', type: 'continuous' },
        ],
      },
      coordinate: { type: 'polar2D' },
      scales: [],
      marks: [{ type: 'reference', encoding: { y: { field: 'threshold' }, color: { field: 'tier' } } }],
    });
    const layer = expandOf(
      spec,
      {
        d: [
          { tier: 'low', threshold: 30 },
          { tier: 'mid', threshold: 60 },
          { tier: 'high', threshold: 90 },
        ],
      },
      cartOpts,
    ).children[0] as IRScope;
    const paths = pathsOf(layer);
    expect(paths).toHaveLength(2);
    for (const path of paths) {
      expect(path.children.map(s => s.kind)).toEqual(['move', 'circlePath']);
    }
  });

  it('rule-polar-field-radius-rings-stay-inside-scene-layout-with-legend', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: {
        reference: 'd',
        model: [
          { name: 'tier', type: 'categorical' },
          { name: 'threshold', type: 'continuous' },
        ],
      },
      coordinate: { type: 'polar2D' },
      scales: [],
      marks: [{ type: 'reference', encoding: { y: { field: 'threshold' }, color: { field: 'tier' } } }],
      guides: [
        { type: 'axis', dimension: 'y', grid: true },
        { type: 'legend', channel: 'color' },
      ],
    });
    const layer = expandOf(
      spec,
      {
        d: [
          { tier: 'low', threshold: 30 },
          { tier: 'mid', threshold: 60 },
          { tier: 'high', threshold: 90 },
        ],
      },
      { width: 400, height: 280 },
    );
    const scene = compileToScene({ version: 1, type: 'scene', children: [layer] }).scene;
    const rings = flattenPrimitives(scene.primitives)
      .filter(
        (primitive): primitive is Extract<ScenePrimitive, { type: 'path' }> =>
          primitive.type === 'path' && primitive.stroke !== 'currentColor',
      )
      .flatMap(path => path.commands.filter(command => command.kind === 'ellipseArc'))
      .filter(command => Math.abs(command.endAngle - command.startAngle) >= 360);

    expect(rings).toHaveLength(2);
    for (const ring of rings) {
      expect(scene.layout.x).toBeLessThanOrEqual(ring.center[0] - ring.radiusX);
      expect(scene.layout.y).toBeLessThanOrEqual(ring.center[1] - ring.radiusY);
      expect(scene.layout.x + scene.layout.width).toBeGreaterThanOrEqual(ring.center[0] + ring.radiusX);
      expect(scene.layout.y + scene.layout.height).toBeGreaterThanOrEqual(ring.center[1] + ring.radiusY);
    }
  });

  it('rule-region-polar-sector', () => {
    // region x∈[30,120] 且 y∈[40,60] → projectCell 环扇区
    const mark: IRPlotReferenceMark = {
      type: 'reference',
      kind: 'region',
      encoding: { x: { value: 30 }, y: { value: 40 } },
      xTo: 120,
      yTo: 60,
    };
    const node = nodesOf(lowerMark(mark, [{}], polarFrame()) as IRScope)[0];
    const shape = node.shape as {
      type: string;
      params: { innerRadius: number; outerRadius: number; startAngle: number; endAngle: number };
    };
    expect(shape.type).toBe('sector');
    expect(shape.params.startAngle).toBeCloseTo(30, 6);
    expect(shape.params.endAngle).toBeCloseTo(120, 6);
    expect(shape.params.innerRadius).toBeCloseTo(60, 6);
    expect(shape.params.outerRadius).toBeCloseTo(90, 6);
  });

  it('rule-band-polar-connectable', () => {
    // band sector Node 可被另一 core Path 指向式连接（守 §8.1，与 contract cell Node connectable 同断言）：
    //   line step 指向 Node id → compile 自动 clip 到边界、不抛
    const mark: IRPlotReferenceMark = { type: 'reference', encoding: { y: { value: 40 } }, yTo: 60 };
    const node: IRNode = { ...nodesOf(lowerMark(mark, [{}], polarFrame()) as IRScope)[0], id: 'ring' };
    const scene = {
      version: 1 as const,
      type: 'scene' as const,
      children: [
        { type: 'scope' as const, nodeDefault: { padding: 0, strokeWidth: 0 }, children: [node] },
        {
          type: 'path' as const,
          children: [
            { type: 'step' as const, kind: 'move' as const, to: [-200, -200] as [number, number] },
            { type: 'step' as const, kind: 'line' as const, to: { id: 'ring' } },
          ],
        },
      ],
    };
    expect(() => compileToScene(scene, { shapes: [SectorShapeDefinition] }).scene).not.toThrow();
  });
});

describe('rule region projectCell 坐标系', () => {
  it('rule-region-custom-projectcell-contour', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      coordinate: { type: 'curved-reference' },
      scales: [],
      marks: [{ type: 'reference', kind: 'region', xTo: 6, yTo: 8, encoding: { x: { value: 2 }, y: { value: 3 } } }],
    });
    const options: LowerPlotsOptions = {
      width: WIDTH,
      height: HEIGHT,
      coordinates: [
        defineCoordinate({
          schema: object({
            type: literal('curved-reference').describe('Discriminator: reference region custom coordinate operation'),
          }),
          roles: ['x', 'y'],
          resolve: (_operation, ctx) => {
            const xScale = linearStub([0, 10], [0, ctx.width]);
            const yScale = linearStub([0, 10], [ctx.height, 0]);
            const projectRoles = (values: ReadonlyArray<unknown>): [number, number] | null => {
              const x = xScale.coordinate(values[0]);
              const y = yScale.coordinate(values[1]);
              return Number.isFinite(x) && Number.isFinite(y)
                ? [x, y + 16 * Math.sin((x / ctx.width) * Math.PI)]
                : null;
            };
            return {
              frame: createCoordinateFrame('curved-reference', ['x', 'y'], projectRoles, {
                roleScales: { x: xScale, y: yScale },
                projectCell: (cell: Cell) => ({
                  kind: 'contour',
                  points: densifyCellContour(cell, (x, y) => [x, y + 16 * Math.sin((x / ctx.width) * Math.PI)], {
                    curvedPrimary: true,
                  }),
                }),
              }),
              plotArea: { x: 0, y: 0, width: ctx.width, height: ctx.height },
              gridLayers: [],
              axisLayers: [],
            };
          },
        }),
      ],
    };
    const layer = expandOf(spec, { d: [{}] }, options).children[0] as IRScope;
    const node = nodesOf(layer)[0];
    const shape = node.shape as { type?: string; params?: { points?: Array<[number, number]> } } | undefined;
    expect(shape?.type).toBe('contour');
    expect(shape?.params?.points?.length ?? 0).toBeGreaterThanOrEqual(4);
  });
});

describe('rule + bar z-order', () => {
  it('rule-zorder-with-bar', () => {
    // 同 scope 内 bar + rule（line）按声明序产出图层（z-order parity）
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
      scales: [
        { type: 'band', name: '__x' },
        { type: 'linear', name: '__y' },
      ],
      marks: [
        { type: 'interval', encoding: { x: { field: 'cat' }, y: { field: 'v' } } },
        { type: 'reference', encoding: { y: { value: 5 } } },
      ],
    });
    const expanded = expandOf(
      spec,
      {
        d: [
          { cat: 'a', v: 3 },
          { cat: 'b', v: 8 },
        ],
      },
      cartOpts,
    );
    // 图层序 = 声明序：bar 在前、rule 在后
    const barLayer = expanded.children[0] as IRScope;
    const ruleLayer = expanded.children[1] as IRScope;
    expect(nodesOf(barLayer)).toHaveLength(2);
    expect(pathsOf(ruleLayer)).toHaveLength(1);
  });
});
