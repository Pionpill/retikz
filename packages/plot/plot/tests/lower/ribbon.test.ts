import type { IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type LinkMark, type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { type LowerPlotsOptions, lowerPlots } from '../../src/compile/expand';
import { lowerMark } from '../../src/compile/mark';
import { datumAnchor } from '../../src/compile/anchor';
import { createCartesianFrame } from '../../src/compile/project';
import type { PositionScale } from '../../src/compile/scale';

/**
 * ADR-05（alpha.11）：ribbon mark（sankey / alluvial 流带）下沉契约测试。
 * 验证字段端点四角可填充 cubic Path、等宽 / 喇叭带 endWidth、curvature 0/0.5 主轴外推、零宽 / 缺 value 跳过、
 * 负 value fail-loud、端点缺 x/y schema 拒绝、datum 中线锚点、cartesian-only fail-loud。
 */

type Datasets = Record<string, Array<Record<string, unknown>>>;

type CubicStep = { type: 'step'; kind: 'cubic'; to: [number, number]; control1: [number, number]; control2: [number, number] };
type RibbonStep = { kind: string; to?: [number, number]; control1?: [number, number]; control2?: [number, number] };
type RibbonPath = { type: 'path'; children: Array<RibbonStep>; pathDefault?: { fill?: string } };

const WIDTH = 400;
const HEIGHT = 400;
const opts: LowerPlotsOptions = { width: WIDTH, height: HEIGHT };

const expandOf = (spec: PlotSpec, datasets: Datasets, options: LowerPlotsOptions = opts): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

/** 取第一个 mark 图层（expand 产物 child[0]，无 id 时即内容 scope 的 child[0]） */
const firstLayer = (spec: PlotSpec, datasets: Datasets, options: LowerPlotsOptions = opts): IRScope =>
  expandOf(spec, datasets, options).children[0] as IRScope;

/** 收集图层内所有 ribbon path */
const pathsOf = (layer: IRScope): Array<RibbonPath> => {
  const out: Array<RibbonPath> = [];
  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'path') out.push(node as unknown as RibbonPath);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };
  walk(layer.children);
  return out;
};

/**
 * 恒等映射的连续 linear PositionScale 桩（domain == range；coordinate(v)=v）。
 * 用直坐标 frame 使端点投影 = 原始字段值，几何断言可直接对数据值算。
 */
const identityScale = (): PositionScale => {
  let r: [number, number] = [0, WIDTH];
  return {
    coordinate: (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : NaN),
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

const identityFrame = () => createCartesianFrame(identityScale(), identityScale());

/** ribbon mark 工厂：一条流，source/target 字段对 + value（可选 endWidth / curvature / color） */
const ribbonMark = (over: Partial<LinkMark> = {}): LinkMark => ({
  type: 'link',
  source: { x: { field: 'sx' }, y: { field: 'sy' } },
  target: { x: { field: 'tx' }, y: { field: 'ty' } },
  value: 'amount',
  encoding: {},
  ...over,
});

const stepKinds = (path: RibbonPath): Array<string> => path.children.map(s => s.kind);
const cubicSteps = (path: RibbonPath): Array<CubicStep> => path.children.filter((s): s is CubicStep => s.kind === 'cubic');

describe('lowerRibbon field endpoints (ADR-05)', () => {
  // ── Happy path ──────────────────────────────────────────
  it('ribbon-field-endpoints-fillable-path', () => {
    // 水平流：S=(0,100) → T=(200,100)，amount=10（域 max）→ 源端半宽 = RIBBON_MAX_WIDTH/2 = 20
    const rows = [{ sx: 0, sy: 100, tx: 200, ty: 100, amount: 10 }];
    const layer = lowerMark(ribbonMark(), rows, identityFrame()) as IRScope;
    const paths = pathsOf(layer);
    expect(paths).toHaveLength(1);
    // 可填充围合结构：move → cubic → line → cubic → cycle
    expect(stepKinds(paths[0])).toEqual(['move', 'cubic', 'line', 'cubic', 'cycle']);
    const steps = paths[0].children;
    // 源端封口两角（move 起点 = S_top，最后 cubic 终点 = S_bot）：水平流弦法向竖直，半宽 20 → y 100±20
    expect(steps[0].to).toEqual([0, 120]);
    expect(steps[3].to).toEqual([0, 80]);
    // 目标端封口两角（首 cubic 终点 = T_top、line 终点 = T_bot）：x=200、y 100±20
    expect(steps[1].to).toEqual([200, 120]);
    expect(steps[2].to).toEqual([200, 80]);
  });

  it('ribbon-equal-width', () => {
    // 无 endWidth → 源宽 = 目标宽；amount=10=域 max → 半宽 20，四角法向半宽相等（喇叭度 0）
    const rows = [{ sx: 0, sy: 100, tx: 200, ty: 100, amount: 10 }];
    const steps = pathsOf(lowerMark(ribbonMark(), rows, identityFrame()) as IRScope)[0].children;
    const sourceHalf = Math.abs((steps[0].to as [number, number])[1] - 100); // S_top.y - centerY
    const targetHalf = Math.abs((steps[1].to as [number, number])[1] - 100); // T_top.y - centerY
    expect(sourceHalf).toBeCloseTo(20, 6);
    expect(targetHalf).toBeCloseTo(20, 6);
  });

  it('ribbon-curvature-default-extrapolates-along-main-axis', () => {
    // 默认 curvature 0.5、水平弦长 200 → reach = 0.5*200 = 100；上边界 cubic control1.x = S_top.x + 100 = 100
    const rows = [{ sx: 0, sy: 100, tx: 200, ty: 100, amount: 10 }];
    const cubics = cubicSteps(pathsOf(lowerMark(ribbonMark(), rows, identityFrame()) as IRScope)[0]);
    expect(cubics[0].control1[0]).toBeCloseTo(100, 6); // S_top.x + reach
    expect(cubics[0].control2[0]).toBeCloseTo(100, 6); // T_top.x - reach
  });

  // ── 边界 ───────────────────────────────────────────────
  it('ribbon-flared-end-width', () => {
    // endWidth 给独立字段：source amount=10（半宽 20）、target end=5（半宽 10）→ 喇叭带四角半宽各异
    const rows = [{ sx: 0, sy: 100, tx: 200, ty: 100, amount: 10, end: 5 }];
    const steps = pathsOf(lowerMark(ribbonMark({ endWidth: 'end' }), rows, identityFrame()) as IRScope)[0].children;
    expect(Math.abs((steps[0].to as [number, number])[1] - 100)).toBeCloseTo(20, 6); // 源端半宽
    expect(Math.abs((steps[1].to as [number, number])[1] - 100)).toBeCloseTo(10, 6); // 目标端半宽
  });

  it('ribbon-curvature-zero-near-straight', () => {
    // curvature=0 → reach=0、控制点贴端点（control == 对应封口角）
    const rows = [{ sx: 0, sy: 100, tx: 200, ty: 100, amount: 10 }];
    const cubics = cubicSteps(pathsOf(lowerMark(ribbonMark({ curvature: 0 }), rows, identityFrame()) as IRScope)[0]);
    expect(cubics[0].control1).toEqual([0, 120]); // = S_top
    expect(cubics[0].control2).toEqual([200, 120]); // = T_top
  });

  it('ribbon-zero-width-skip', () => {
    // value=0 且无 endWidth → 两端半宽皆 0（< ε）→ 跳过该行，无 path（单行全跳 → layer null）
    const rows = [{ sx: 0, sy: 100, tx: 200, ty: 100, amount: 0 }];
    expect(lowerMark(ribbonMark(), rows, identityFrame())).toBeNull();
  });

  it('ribbon-single-end-zero-renders-triangle', () => {
    // 源宽 > 0、endWidth=0 → 喇叭收成尖点的三角带，有可填充面积 → 不跳过（W1：仅两端皆零才跳）
    const rows = [{ sx: 0, sy: 100, tx: 200, ty: 100, amount: 10, end: 0 }];
    const paths = pathsOf(lowerMark(ribbonMark({ endWidth: 'end' }), rows, identityFrame()) as IRScope);
    expect(paths).toHaveLength(1);
    // 目标端封口两角重合（半宽 0）
    const steps = paths[0].children;
    expect(steps[1].to).toEqual([200, 100]);
    expect(steps[2].to).toEqual([200, 100]);
  });

  it('ribbon-both-ends-zero-skip', () => {
    // 两端半宽皆 0（value=0 且 endWidth=0）→ 无可填充面积 → 跳过
    const rows = [{ sx: 0, sy: 100, tx: 200, ty: 100, amount: 0, end: 0 }];
    expect(lowerMark(ribbonMark({ endWidth: 'end' }), rows, identityFrame())).toBeNull();
  });

  it('ribbon-nonfinite-value-skip', () => {
    // value 缺失 / 非有限 → 跳过该行（与 point null 跳过同语义），保留有效行
    const rows = [
      { sx: 0, sy: 100, tx: 200, ty: 100 }, // amount 缺失
      { sx: 0, sy: 50, tx: 200, ty: 50, amount: 10 },
    ];
    const paths = pathsOf(lowerMark(ribbonMark(), rows, identityFrame()) as IRScope);
    expect(paths).toHaveLength(1);
  });

  it('ribbon-coincident-endpoints-skip', () => {
    // 源 / 目标重合（零弦长）→ 无法定法向 → 跳过该行
    const rows = [{ sx: 50, sy: 50, tx: 50, ty: 50, amount: 10 }];
    expect(lowerMark(ribbonMark(), rows, identityFrame())).toBeNull();
  });

  // ── 错误路径 ───────────────────────────────────────────
  it('ribbon-negative-value-fail-loud', () => {
    const rows = [{ sx: 0, sy: 100, tx: 200, ty: 100, amount: -3 }];
    expect(() => lowerMark(ribbonMark(), rows, identityFrame())).toThrow(/non-negative/);
  });

  it('ribbon-named-width-scale-unsupported-fail-loud', () => {
    const rows = [{ sx: 0, sy: 100, tx: 200, ty: 100, amount: 10 }];
    expect(() => lowerMark(ribbonMark({ width: 'w' }), rows, identityFrame())).toThrow(/width scale/);
  });

  // ── color 分组 ─────────────────────────────────────────
  it('ribbon-color-field-groups-by-fill', () => {
    // 两行不同 category → 按色分两子 Scope（各 pathDefault.fill），IR 体积 O(色数)
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'flows' },
      coordinate: { type: 'cartesian2D', x: 'xs', y: 'ys' },
      scales: [
        { type: 'linear', name: 'xs' },
        { type: 'linear', name: 'ys' },
        { type: 'ordinal', name: '__color' },
      ],
      marks: [ribbonMark({ encoding: { color: { field: 'cat', scale: '__color' } } })],
    });
    const flows = [
      { sx: 0, sy: 100, tx: 200, ty: 100, amount: 10, cat: 'A' },
      { sx: 0, sy: 200, tx: 200, ty: 200, amount: 6, cat: 'B' },
    ];
    const layer = firstLayer(spec, { flows });
    const fills = new Set(layer.children.map(c => (c as IRScope).pathDefault?.fill));
    expect(fills.size).toBe(2);
  });

  // ── datum 锚点 ─────────────────────────────────────────
  it('ribbon-datum-anchor-midline', () => {
    // 锚点 = 源中心↔目标中心连线中点；locator 与 lowering 同源
    const frame = identityFrame();
    const anchor = datumAnchor(ribbonMark(), { sx: 0, sy: 100, tx: 200, ty: 100, amount: 10 }, frame);
    expect(anchor).toEqual([100, 100]);
  });

  it('ribbon-datum-anchor-null-when-endpoint-missing', () => {
    const frame = identityFrame();
    const anchor = datumAnchor(ribbonMark(), { sx: 0, sy: 100, amount: 10 }, frame); // tx/ty 缺失
    expect(anchor).toBeNull();
  });

  // ── orientation 取向（默认 horizontal）─────────────────────
  it('ribbon-orientation-default-horizontal-vertical-caps', () => {
    // 默认 horizontal：对角流 S=(0,0)→T=(200,80)，半宽沿 y（normal=(0,1)）→ 封口竖直、四角 x 与端点同
    const rows = [{ sx: 0, sy: 0, tx: 200, ty: 80, amount: 10 }];
    const steps = pathsOf(lowerMark(ribbonMark(), rows, identityFrame()) as IRScope)[0].children;
    // 源端封口两角：x = 0（与源同 x，半宽不偏 x）、y = 0 ± 20
    expect(steps[0].to).toEqual([0, 20]); // S_top
    expect(steps[3].to).toEqual([0, -20]); // S_bot
    // 目标端封口两角：x = 200（与目标同 x）、y = 80 ± 20
    expect(steps[1].to).toEqual([200, 100]); // T_top
    expect(steps[2].to).toEqual([200, 60]); // T_bot
  });

  it('ribbon-orientation-default-horizontal-tangent-along-x', () => {
    // 对角流默认 horizontal：外推沿主轴 x（Δmain = 200），control1/2 仅偏 x，封口切向水平
    const rows = [{ sx: 0, sy: 0, tx: 200, ty: 80, amount: 10 }];
    const cubics = cubicSteps(pathsOf(lowerMark(ribbonMark(), rows, identityFrame()) as IRScope)[0]);
    // reach = 0.5 * 200 = 100；topControl1 = S_top + (100,0) = (100, 20)
    expect(cubics[0].control1[0]).toBeCloseTo(100, 6);
    expect(cubics[0].control1[1]).toBeCloseTo(20, 6); // y 不变（出切向沿 x）
  });

  it('ribbon-orientation-vertical-flow-along-y', () => {
    // vertical：主轴 (0,1)、半宽沿 x（normal=(1,0)）。S=(50,0)→T=(60,200)，Δmain=200
    const rows = [{ sx: 50, sy: 0, tx: 60, ty: 200, amount: 10 }];
    const steps = pathsOf(lowerMark(ribbonMark({ orientation: 'vertical' }), rows, identityFrame()) as IRScope)[0].children;
    // 源端封口两角：y = 0（与源同 y）、x = 50 ± 20
    expect(steps[0].to).toEqual([70, 0]); // S_top (x+20)
    expect(steps[3].to).toEqual([30, 0]); // S_bot (x-20)
    // 目标端封口两角：y = 200、x = 60 ± 20
    expect(steps[1].to).toEqual([80, 200]); // T_top
    expect(steps[2].to).toEqual([40, 200]); // T_bot
    // 外推沿 y：control1 = S_top + (0, 100)
    const cubics = cubicSteps(pathsOf(lowerMark(ribbonMark({ orientation: 'vertical' }), rows, identityFrame()) as IRScope)[0]);
    expect(cubics[0].control1[1]).toBeCloseTo(100, 6);
    expect(cubics[0].control1[0]).toBeCloseTo(70, 6); // x 不变（出切向沿 y）
  });

  it('ribbon-width-gradient-midpoint-between-source-and-target', () => {
    // 喇叭带宽度沿程渐变：源半宽 20、目标半宽 10；带边界中点处半宽应在两者之间（曲线在 t=0.5 的法向半宽 ≈ 15）
    const rows = [{ sx: 0, sy: 100, tx: 200, ty: 100, amount: 10, end: 5 }];
    const steps = pathsOf(lowerMark(ribbonMark({ endWidth: 'end' }), rows, identityFrame()) as IRScope)[0].children;
    const sourceHalf = Math.abs((steps[0].to as [number, number])[1] - 100); // 20
    const targetHalf = Math.abs((steps[1].to as [number, number])[1] - 100); // 10
    expect(sourceHalf).toBeCloseTo(20, 6);
    expect(targetHalf).toBeCloseTo(10, 6);
    // 上 / 下边界 cubic 控制点也按各端半宽偏移（topControl1 = S_top + e、bottomControl2 = S_bot + e），保证沿程平滑过渡
    const cubics = cubicSteps(pathsOf(lowerMark(ribbonMark({ endWidth: 'end' }), rows, identityFrame()) as IRScope)[0]);
    expect(cubics[0].control1[1]).toBeCloseTo(120, 6); // S_top.y（源半宽 20）
    expect(cubics[0].control2[1]).toBeCloseTo(110, 6); // T_top.y（目标半宽 10）
  });
});

describe('lowerRibbon integration + schema (ADR-05)', () => {
  const flowSpec = (over: Partial<LinkMark> = {}): PlotSpec =>
    PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'flows' },
      coordinate: { type: 'cartesian2D', x: 'xs', y: 'ys' },
      scales: [
        { type: 'linear', name: 'xs' },
        { type: 'linear', name: 'ys' },
      ],
      marks: [ribbonMark(over)],
    });

  it('ribbon-full-pipeline-emits-fillable-band', () => {
    const flows = [{ sx: 1, sy: 1, tx: 9, ty: 4, amount: 10 }];
    const paths = pathsOf(firstLayer(flowSpec(), { flows }));
    expect(paths).toHaveLength(1);
    expect(stepKinds(paths[0])).toEqual(['move', 'cubic', 'line', 'cubic', 'cycle']);
  });

  it('ribbon-endpoints-enter-axis-domain', () => {
    // target.x=9 是 x 域 max；经默认 layout 投影后所有四角 x ∈ [plotArea]，无越界 NaN
    const flows = [{ sx: 1, sy: 1, tx: 9, ty: 4, amount: 10 }];
    const steps = pathsOf(firstLayer(flowSpec(), { flows }))[0].children;
    for (const step of steps) {
      if (step.to) {
        expect(Number.isFinite(step.to[0])).toBe(true);
        expect(Number.isFinite(step.to[1])).toBe(true);
      }
    }
  });

  // schema reject：端点缺 x / y
  it('ribbon-endpoint-missing-xy-reject', () => {
    expect(() =>
      PlotSpecSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        coordinate: { type: 'cartesian2D' },
        scales: [],
        marks: [{ type: 'link', source: { x: { field: 'sx' } }, target: { x: { field: 'tx' }, y: { field: 'ty' } }, value: 'amount', encoding: {} }],
      }),
    ).toThrow();
  });

  it('ribbon-missing-value-reject', () => {
    expect(() =>
      PlotSpecSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        coordinate: { type: 'cartesian2D' },
        scales: [],
        marks: [{ type: 'link', source: { x: { field: 'sx' }, y: { field: 'sy' } }, target: { x: { field: 'tx' }, y: { field: 'ty' } }, encoding: {} }],
      }),
    ).toThrow();
  });

  it('ribbon-curvature-out-of-range-reject', () => {
    expect(() =>
      PlotSpecSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        coordinate: { type: 'cartesian2D' },
        scales: [],
        marks: [ribbonMark({ curvature: 2 })],
      }),
    ).toThrow();
  });

  it('ribbon-json-round-trip', () => {
    const m = ribbonMark({ id: 'flow', endWidth: 'end', curvature: 0.3, encoding: { color: { field: 'cat', scale: 'c' } } });
    expect(PlotSpecSchema.parse(JSON.parse(JSON.stringify(flowSpec()))).marks[0].type).toBe('link');
    // 直接 mark round trip
    const parsed = JSON.parse(JSON.stringify(m));
    expect(parsed).toEqual(m);
  });

  // 坐标系矩阵：ribbon 仅 cartesian2D
  it('ribbon-polar-fail-loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'flows' },
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      scales: [
        { type: 'linear', name: 'a' },
        { type: 'linear', name: 'r' },
      ],
      marks: [ribbonMark()],
    });
    const flows = [{ sx: 1, sy: 1, tx: 9, ty: 4, amount: 10 }];
    expect(() => expandOf(spec, { flows })).toThrow(/not supported under the polar2D/);
  });
});
