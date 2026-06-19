import type { IRNode, IRScope } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type IntervalMark, type PlotSpec, PlotSpecSchema } from '../../src/schemas';
import { type LowerPlotsOptions, lowerPlots } from '../../src/pipeline/expand';
import { buildIntervalContext, datumAnchor, intervalCell } from '../../src/providers';
import { lowerMark } from '../../src/providers';
import { type Cell } from '../../src/contract';
import { createCartesianCoordinate, createPolarCoordinate } from '../../src/providers';
import type { PositionScale } from '../../src/contract';

/**
 * ADR-02（alpha.11）：rect mark（heatmap 双 band 正交 cell）下沉契约测试。
 * 验证 cartesian 双 band cell 几何（复用 ADR-01 projectCell rect 快路）、值→color 分子 Scope、
 * 缺 color 回退默认填充、y 非 band fail-loud、polar / 1D / ternary 下 fail-loud、rect + interval 共存。
 */

type Datasets = Record<string, Array<Record<string, unknown>>>;

const WIDTH = 400;
const HEIGHT = 400;
const cartOpts: LowerPlotsOptions = { width: WIDTH, height: HEIGHT };

const expandOf = (spec: PlotSpec, datasets: Datasets, options: LowerPlotsOptions): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

const firstLayer = (spec: PlotSpec, datasets: Datasets, options: LowerPlotsOptions): IRScope => expandOf(spec, datasets, options).children[0] as IRScope;

/** 深度收集图层内所有 node（无 color → 直接子；有 color → 藏在分色子 Scope 里） */
const nodesOf = (layer: IRScope): Array<IRNode> => {
  const out: Array<IRNode> = [];
  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'node') out.push(node as unknown as IRNode);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };
  walk(layer.children);
  return out;
};

/** band PositionScale 桩：每类别一个等宽 band，coordinate = band 中心、bandwidth 固定 */
const bandStub = (categories: Array<string>, range: [number, number]): PositionScale => {
  const [r0, r1] = range;
  const step = (r1 - r0) / categories.length;
  const index = new Map(categories.map((cat, i) => [cat, i] as const));
  return {
    coordinate: (value: unknown) => {
      const i = typeof value === 'string' ? index.get(value) : undefined;
      return i === undefined ? NaN : r0 + step * (i + 0.5);
    },
    get bandwidth() {
      return Math.abs(step);
    },
    ticks: () => ({ ticks: [], labels: [] }) as unknown as ReturnType<PositionScale['ticks']>,
    range: () => [r0, r1],
    setRange: () => undefined,
  };
};

/** 连续 linear PositionScale 桩（bandwidth = 0），用于 y 非 band fail-loud */
const linearStub = (domain: [number, number], range: [number, number]): PositionScale => {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  return {
    coordinate: (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? r0 + ((value - d0) / (d1 - d0)) * (r1 - r0) : NaN),
    get bandwidth() {
      return 0;
    },
    ticks: () => ({ ticks: [], labels: [] }) as unknown as ReturnType<PositionScale['ticks']>,
    range: () => [r0, r1],
    setRange: () => undefined,
  };
};

const rectMark = (color?: string): IntervalMark => ({
  type: 'interval',
  encoding: { x: { field: 'rk' }, y: { field: 'ck' }, ...(color ? { color: { field: color, scale: 'heat' } } : {}) },
  bounds: { x: { kind: 'band' }, y: { kind: 'band' } },
});

const heatmapSpec = (color?: string): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    coordinate: { type: 'cartesian2D', x: 'rk', y: 'ck' },
    scales: [
      { type: 'band', name: 'rk' },
      { type: 'band', name: 'ck' },
      ...(color ? [{ type: 'sequential', name: 'heat' }] : []),
    ],
    marks: [rectMark(color)],
  });

// ── happy path：cartesian 双 band cell 几何 ────────────────────────────────────────────
describe('rect cartesian 双 band cell 几何（projectCell rect 快路）', () => {
  it('rect-cartesian-cell-geometry', () => {
    // 2 行类 × 2 列类 band 帧：bw_x = 200/2 = 100、bw_y = 200/2 = 100
    const frame = createCartesianCoordinate(bandStub(['r0', 'r1'], [0, 200]), bandStub(['c0', 'c1'], [200, 0]));
    const mark = rectMark();
    const ctx = buildIntervalContext(mark, frame, [{ rk: 'r0', ck: 'c0' }]);
    const cell = intervalCell(mark, { rk: 'r0', ck: 'c0' }, frame, ctx);
    expect(cell).not.toBeNull();
    const geometry = frame.projectCell(cell as Cell);
    expect(geometry.kind).toBe('rect');
    if (geometry.kind === 'rect') {
      // r0 中心 = 50、c0 中心 = 150（y 倒置）；格 100×100
      expect(geometry.position).toEqual([50, 150]);
      expect(geometry.width).toBe(100);
      expect(geometry.height).toBe(100);
    }
  });

  it('rect-cell-nodes-via-lower-mark', () => {
    const frame = createCartesianCoordinate(bandStub(['r0', 'r1'], [0, 200]), bandStub(['c0', 'c1'], [200, 0]));
    const rows = [
      { rk: 'r0', ck: 'c0' },
      { rk: 'r1', ck: 'c1' },
    ];
    const nodes = nodesOf(lowerMark(rectMark(), rows, frame) as IRScope);
    expect(nodes).toHaveLength(2);
    for (const node of nodes) {
      expect(node.shape).toBeUndefined(); // barStyle 在 nodeDefault 给 rectangle
      expect(node.minimumWidth).toBe(100);
      expect(node.minimumHeight).toBe(100);
    }
  });

  it('rect-single-cell', () => {
    const frame = createCartesianCoordinate(bandStub(['r0'], [0, 120]), bandStub(['c0'], [120, 0]));
    const nodes = nodesOf(lowerMark(rectMark(), [{ rk: 'r0', ck: 'c0' }], frame) as IRScope);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].minimumWidth).toBe(120);
    expect(nodes[0].minimumHeight).toBe(120);
  });

  it('rect-missing-category-skipped', () => {
    const frame = createCartesianCoordinate(bandStub(['r0', 'r1'], [0, 200]), bandStub(['c0', 'c1'], [200, 0]));
    const rows = [
      { rk: 'r0', ck: 'c0' },
      { rk: 'ZZZ', ck: 'c1' }, // 缺类别 → coordinate NaN → 跳过
    ];
    const nodes = nodesOf(lowerMark(rectMark(), rows, frame) as IRScope);
    expect(nodes).toHaveLength(1);
  });

  it('rect-datum-anchor-matches-node-position', () => {
    const frame = createCartesianCoordinate(bandStub(['r0', 'r1'], [0, 200]), bandStub(['c0', 'c1'], [200, 0]));
    const rows = [{ rk: 'r1', ck: 'c0' }];
    const node = nodesOf(lowerMark(rectMark(), rows, frame) as IRScope)[0];
    const mark = rectMark();
    const ctx = buildIntervalContext(mark, frame, rows);
    const anchor = datumAnchor(mark, rows[0], frame, ctx);
    expect(anchor).not.toBeNull();
    const position = node.position as [number, number];
    expect(anchor![0]).toBeCloseTo(position[0], 9);
    expect(anchor![1]).toBeCloseTo(position[1], 9);
  });
});

// ── 值 → color（sequential 色阶 per-datum + 按色分子 Scope）─────────────────────────────
describe('rect 值 → color', () => {
  const rows = [
    { rk: 'r0', ck: 'c0', v: 1 },
    { rk: 'r0', ck: 'c1', v: 5 },
    { rk: 'r1', ck: 'c0', v: 9 },
    { rk: 'r1', ck: 'c1', v: 5 },
  ];

  it('rect-value-to-color', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd', model: [{ name: 'rk', type: 'categorical' }, { name: 'ck', type: 'categorical' }, { name: 'v', type: 'continuous' }] },
      coordinate: { type: 'cartesian2D', x: 'rk', y: 'ck' },
      scales: [
        { type: 'band', name: 'rk' },
        { type: 'band', name: 'ck' },
        { type: 'sequential', name: 'heat', domain: [0, 9] },
      ],
      marks: [{ type: 'interval', encoding: { x: { field: 'rk' }, y: { field: 'ck' }, color: { field: 'v', scale: 'heat' } }, bounds: { x: { kind: 'band' }, y: { kind: 'band' } } }],
    });
    const layer = firstLayer(spec, { d: rows }, cartOpts);
    const nodes = nodesOf(layer);
    expect(nodes).toHaveLength(4);
    // 按色分子 Scope：每个子 Scope nodeDefault 含 fill；不同值 → 不同 fill 串
    const fills = (layer.children as Array<{ nodeDefault?: { fill?: string } }>).map(c => c.nodeDefault?.fill).filter((f): f is string => f !== undefined);
    expect(fills.length).toBeGreaterThan(1);
    expect(new Set(fills).size).toBeGreaterThan(1);
  });

  it('rect-color-grouped-scope-equal-values-share-fill', () => {
    // v=5 出现两次 → 同色应分到同一子 Scope（按 fill 分组）
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd', model: [{ name: 'rk', type: 'categorical' }, { name: 'ck', type: 'categorical' }, { name: 'v', type: 'continuous' }] },
      coordinate: { type: 'cartesian2D', x: 'rk', y: 'ck' },
      scales: [
        { type: 'band', name: 'rk' },
        { type: 'band', name: 'ck' },
        { type: 'sequential', name: 'heat', domain: [0, 9] },
      ],
      marks: [{ type: 'interval', encoding: { x: { field: 'rk' }, y: { field: 'ck' }, color: { field: 'v', scale: 'heat' } }, bounds: { x: { kind: 'band' }, y: { kind: 'band' } } }],
    });
    const layer = firstLayer(spec, { d: rows }, cartOpts);
    const colorScopes = (layer.children as Array<{ type?: string; children?: Array<unknown> }>).filter(c => c.type === 'scope');
    // 3 个不同值（1 / 5 / 9）→ 3 个分色子 Scope；v=5 的两格在同一 Scope（2 子节点）
    expect(colorScopes).toHaveLength(3);
    const sizes = colorScopes.map(s => s.children?.length ?? 0).sort();
    expect(sizes).toEqual([1, 1, 2]);
  });
});

// ── 缺 color → 回退默认填充单图层 ───────────────────────────────────────────────────────
describe('rect 缺 color', () => {
  it('rect-no-color-default-fill', () => {
    const rows = [
      { rk: 'r0', ck: 'c0' },
      { rk: 'r1', ck: 'c1' },
    ];
    const layer = firstLayer(heatmapSpec(), { d: rows }, cartOpts);
    // 单图层：nodeDefault 含 rectangle barStyle + 单一默认填充（图层级，无分色子 Scope）
    expect(layer.nodeDefault).toBeDefined();
    expect((layer.nodeDefault as { shape?: string }).shape).toBe('rectangle');
    expect((layer.nodeDefault as { fill?: string }).fill).toBeTruthy();
    // 缺 color → 不分色子 Scope（children 直接是 node，非 scope）
    expect((layer.children as Array<{ type?: string }>).every(c => c.type === 'node')).toBe(true);
    expect(nodesOf(layer)).toHaveLength(2);
  });

  it('rect-compiles-to-scene', () => {
    const rows = [{ rk: 'r0', ck: 'c0' }];
    const layer = firstLayer(heatmapSpec(), { d: rows }, cartOpts);
    expect(() => compileToScene({ version: 1, type: 'scene', children: [layer] })).not.toThrow();
  });
});

// ── 错误路径：1D / ternary fail-loud（坐标系级守卫仍在）；band×band 在 polar / 非 band scale 下的新行为 ─
describe('rect fail-loud', () => {
  // 重构后 band bound 直接取 scale.bandwidth（linear scale = 0），不再单独要求 band scale → 退化 cell（高 0），不再 throw。
  it('rect-secondary-not-band-degenerate-cell', () => {
    const frame = createCartesianCoordinate(bandStub(['r0', 'r1'], [0, 200]), linearStub([0, 10], [200, 0]));
    const nodes = nodesOf(lowerMark(rectMark(), [{ rk: 'r0', ck: 5 }], frame) as IRScope);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].minimumHeight).toBe(0);
  });

  it('rect-primary-not-band-degenerate-cell', () => {
    const frame = createCartesianCoordinate(linearStub([0, 10], [0, 200]), bandStub(['c0', 'c1'], [200, 0]));
    const nodes = nodesOf(lowerMark(rectMark(), [{ rk: 5, ck: 'c0' }], frame) as IRScope);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].minimumWidth).toBe(0);
  });

  it('rect-y-linear-via-spec-degenerate-cell', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      coordinate: { type: 'cartesian2D', x: 'rk', y: 'ck' },
      scales: [
        { type: 'band', name: 'rk' },
        { type: 'linear', name: 'ck' },
      ],
      marks: [{ type: 'interval', encoding: { x: { field: 'rk' }, y: { field: 'ck' } }, bounds: { x: { kind: 'band' }, y: { kind: 'band' } } }],
    });
    expect(() => expandOf(spec, { d: [{ rk: 'r0', ck: 3 }] }, cartOpts)).not.toThrow();
  });

  // 重构后 interval（band×band）在 polar2D 下受支持（→ sector），不再 fail-loud。
  it('rect-polar-supported-as-sector', () => {
    const frame = createPolarCoordinate({
      center: [200, 200],
      innerRadius: 0,
      outerRadius: 150,
      startAngle: 0,
      endAngle: 360,
      continuousAngle: false,
      primary: bandStub(['r0', 'r1'], [0, 360]),
      secondary: bandStub(['c0', 'c1'], [0, 150]),
    });
    expect(() => lowerMark(rectMark(), [{ rk: 'r0', ck: 'c0' }], frame)).not.toThrow();
  });

  it('rect-1d-fail-loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      coordinate: { type: 'cartesian1D', x: 'rk' },
      scales: [{ type: 'band', name: 'rk' }],
      marks: [{ type: 'interval', encoding: { x: { field: 'rk' }, y: { field: 'ck' } }, bounds: { x: { kind: 'band' }, y: { kind: 'band' } } }],
    });
    expect(() => expandOf(spec, { d: [{ rk: 'r0', ck: 'c0' }] }, cartOpts)).toThrow(/cartesian1D|not supported|rect/i);
  });

  it('rect-ternary-fail-loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      coordinate: { type: 'ternary2D' },
      scales: [
        { type: 'linear', name: 'a' },
        { type: 'linear', name: 'b' },
        { type: 'linear', name: 'c' },
      ],
      marks: [{ type: 'interval', encoding: { x: { field: 'rk' }, y: { field: 'ck' } }, bounds: { x: { kind: 'band' }, y: { kind: 'band' } } }],
    });
    expect(() => expandOf(spec, { d: [{ rk: 'r0', ck: 'c0' }] }, cartOpts)).toThrow(/ternary2D|requires|z/i);
  });
});

// ── 交互：rect + interval 共存（各自 cell 算法、同走 projectCell 装配）────────────────────
describe('rect + interval 共存', () => {
  it('rect-with-interval-coexist', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      coordinate: { type: 'cartesian2D', x: 'rk', y: 'ck' },
      scales: [
        { type: 'band', name: 'rk' },
        { type: 'band', name: 'ck' },
      ],
      marks: [
        { type: 'interval', encoding: { x: { field: 'rk' }, y: { field: 'ck' } }, bounds: { x: { kind: 'band' }, y: { kind: 'band' } } },
        // interval（柱）：x band（rk）、y 连续读 v；同 plot 双 mark 各自 cell 算法
        { type: 'interval', encoding: { x: { field: 'rk' }, y: { field: 'v' } } },
      ],
    });
    const expanded = expandOf(spec, { d: [{ rk: 'r0', ck: 'c0', v: 3 }, { rk: 'r1', ck: 'c1', v: 6 }] }, cartOpts);
    // 两个图层各产物互不串扰
    const rectLayer = expanded.children[0] as IRScope;
    const intervalLayer = expanded.children[1] as IRScope;
    const rectNodes = nodesOf(rectLayer);
    const intervalNodes = nodesOf(intervalLayer);
    expect(rectNodes).toHaveLength(2);
    expect(intervalNodes).toHaveLength(2);
    // rect 格高 = y band bandwidth（固定）；interval 柱高随 value 变（两柱不等高）
    expect(rectNodes[0].minimumHeight as number).toBeCloseTo(rectNodes[1].minimumHeight as number, 6);
    expect(intervalNodes[0].minimumHeight).not.toBe(intervalNodes[1].minimumHeight);
  });
});

// ── schema：rect mark accept / 判别分流 ─────────────────────────────────────────────────
describe('rect schema', () => {
  it('rect-schema-accepts-with-and-without-color', () => {
    expect(() => PlotSpecSchema.parse(heatmapSpec('v'))).not.toThrow();
    expect(() => PlotSpecSchema.parse(heatmapSpec())).not.toThrow();
  });

  it('rect-schema-discriminates', () => {
    const spec = PlotSpecSchema.parse(heatmapSpec());
    expect(spec.marks[0].type).toBe('interval');
  });
});
