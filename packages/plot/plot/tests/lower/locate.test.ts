import type { IRNode, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { type LowerPlotsOptions, lowerPlots } from '../../src/lower/expand';
import { SOURCE_INDEX } from '../../src/lower/provenance';
// ADR-02 未来 API：locator 在实现落地前不存在，整文件 import 即会失败（预期）。
// 解析路径取 ADR file-scope 指明的新模块 src/lower/locate.ts（同时 re-export 自 src/lower barrel / src/index）。
import { createPlotLocator } from '../../src/lower/locate';

/**
 * ADR-02：datum locator 命中预演——逻辑地址 → 位置/元素的确定性正向解析纯函数。
 *
 * `createPlotLocator(spec, datasets, options?)` 与 lowerPlots 同参，复用 ADR-01 resolveFrame。
 *   核心保证：locator.datum(i).position 与 lowering 实际摆放第 i 行 Node.position 逐点一致（共享 datumAnchor）。
 *   sector/polar 锚点取扇片 centroid（≠ Node.position 的圆心），断言落在渲染扇区内。
 *
 * 这些测试对「未来 API」编写：createPlotLocator 实现落地前全 FAIL（预期）。
 */

type Datasets = Record<string, Array<Record<string, unknown>>>;

const opts: LowerPlotsOptions = { width: 480, height: 300 };

const SALES = [
  { month: 0, revenue: 10 },
  { month: 1, revenue: 14 },
  { month: 2, revenue: 9 },
];

// ── lowering 侧 helper（找 lowered datum Node 作 parity 对照）────────────

/** 用 lowerPlots 把 spec 展成外层 plot scope */
const expandOf = (spec: PlotSpec, datasets: Datasets, options?: LowerPlotsOptions): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

/** 取第一个 mark 图层 scope（无 guides 时即外层 plot scope 的第一个子 scope） */
const firstLayer = (spec: PlotSpec, datasets: Datasets, options?: LowerPlotsOptions): IRScope =>
  expandOf(spec, datasets, options).children[0] as IRScope;

/** 深度收集图层内所有 datum Node（无 color 时直接子；有 color 时藏在子 Scope 里）——渲染序 */
const datumNodes = (layer: IRScope): Array<IRNode> => {
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

/** 读 sector node 的 shape params（断言其确为 sector shape ref） */
const sectorParams = (node: IRNode): { innerRadius: number; outerRadius: number; startAngle: number; endAngle: number } => {
  const shape = node.shape as { type?: string; params?: Record<string, number> } | undefined;
  expect(shape?.type).toBe('sector');
  return shape!.params as { innerRadius: number; outerRadius: number; startAngle: number; endAngle: number };
};

// ── spec 工厂（沿用 scope-id-meta SALES 风格）──────────────────────────

/** band-x interval(bar) spec；可带 root id */
const barSpec = (over: { id?: string } = {}): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    ...(over.id ? { id: over.id } : {}),
    data: { reference: 'sales' },
    scales: [
      { type: 'band', name: 'xMonth' },
      { type: 'linear', name: 'yRevenue' },
    ],
    coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
    marks: [{ type: 'interval', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
  });

/** linear point spec；可带 root id */
const pointSpec = (over: { id?: string } = {}): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    ...(over.id ? { id: over.id } : {}),
    data: { reference: 'sales' },
    scales: [
      { type: 'linear', name: 'xMonth' },
      { type: 'linear', name: 'yRevenue' },
    ],
    coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
    marks: [{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
  });

/** 饼图 sector spec（stack transform 产累积界 → sector mark） */
const pieSpec = (over: { id?: string } = {}): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    ...(over.id ? { id: over.id } : {}),
    data: { reference: 'd' },
    transform: [{ kind: 'stack', y: 'v' }],
    coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
    scales: [
      { type: 'linear', name: 'a' },
      { type: 'linear', name: 'r' },
    ],
    marks: [{ type: 'sector', encoding: { color: { field: 'k' } } }],
  });

const PIE_ROWS = [
  { k: 'A', v: 3 },
  { k: 'B', v: 7 },
];

/** 正方形画布（sector parity 用，对齐 sector.test.ts：center=[200,200] outerRadius=200） */
const squareOpts: LowerPlotsOptions = { width: 400, height: 400 };

// =====================================================================
// Happy path
// =====================================================================
describe('ADR-02 locator — happy path', () => {
  it('datum_position_matches_lowering_point', () => {
    // point mark：locator.datum(i).position === lowering 第 i 行 Node.position（cartesian）
    const spec = pointSpec({ id: 'sales' });
    const datasets: Datasets = { sales: SALES };
    const locator = createPlotLocator(spec, datasets, opts);
    const nodes = datumNodes(firstLayer(spec, datasets, opts));
    expect(nodes).toHaveLength(SALES.length);
    for (let index = 0; index < nodes.length; index++) {
      const anchor = locator.datum(index);
      expect(anchor).not.toBeNull();
      expect(anchor!.position).toEqual(nodes[index].position);
    }
  });

  it('datum_position_matches_lowering_interval', () => {
    // interval mark：柱锚点 === lowering 柱 Node.position（柱中心 [xCenter,(yBase+yValue)/2]）
    const spec = barSpec({ id: 'sales' });
    const datasets: Datasets = { sales: SALES };
    const locator = createPlotLocator(spec, datasets, opts);
    const nodes = datumNodes(firstLayer(spec, datasets, opts));
    expect(nodes).toHaveLength(SALES.length);
    for (let index = 0; index < nodes.length; index++) {
      const anchor = locator.datum(index);
      expect(anchor).not.toBeNull();
      expect(anchor!.position).toEqual(nodes[index].position);
    }
  });

  it('datum_meta_synthesized', () => {
    // datumProvenance 关（默认）→ locator.datum(i).meta 仍给同构 meta（locator 按需合成，零 IR 代价）
    const spec = barSpec({ id: 'sales' });
    const datasets: Datasets = { sales: SALES };
    const locator = createPlotLocator(spec, datasets, opts);
    for (let index = 0; index < SALES.length; index++) {
      const meta = locator.datum(index)!.meta as {
        source?: string;
        dataReference?: string;
        mark?: string;
        markIndex?: number;
        transformedIndex?: number;
        sourceIndex?: number;
      };
      expect(meta.source).toBe('plot');
      expect(meta.dataReference).toBe('sales');
      expect(meta.mark).toBe('interval');
      expect(meta.markIndex).toBe(0);
      expect(meta.transformedIndex).toBe(index);
      // 无 transform → sourceIndex 回指、等于 transformedIndex
      expect(meta.sourceIndex).toBe(index);
    }
  });

  it('resolve_path_series', () => {
    // resolve('<plotId>.series.<v>') → 该 series 已渲染 datum 锚点 centroid
    const TREND = [
      { t: 0, v: 4, city: 'X' },
      { t: 1, v: 8, city: 'X' },
      { t: 0, v: 2, city: 'Y' },
      { t: 1, v: 6, city: 'Y' },
    ];
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      id: 'trend',
      data: { reference: 't' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      // series-bearing mark：point 无 series 字段（schema 会剥离），改用 line（含 series）以承载多系列拆分
      marks: [{ type: 'line', series: 'city', encoding: { x: { field: 't' }, y: { field: 'v' } } }],
    });
    const datasets: Datasets = { t: TREND };
    const locator = createPlotLocator(spec, datasets, opts);
    const anchor = locator.resolve('trend.series.X');
    expect(anchor).not.toBeNull();
    // centroid = X series 两行锚点均值；meta 带 series
    expect((anchor!.meta as { series?: unknown }).series).toBe('X');
    expect(Array.isArray(anchor!.position)).toBe(true);
    expect(anchor!.position).toHaveLength(2);
    expect(Number.isFinite(anchor!.position[0])).toBe(true);
    expect(Number.isFinite(anchor!.position[1])).toBe(true);
    // resolve 与结构 series() 等价
    expect(locator.series('X')).toEqual(anchor);
  });
});

// =====================================================================
// 边界
// =====================================================================
describe('ADR-02 locator — 边界', () => {
  it('datum_out_of_range', () => {
    // datum(负 / ≥ rowCount) → null（不抛）
    const spec = pointSpec({ id: 'sales' });
    const locator = createPlotLocator(spec, { sales: SALES }, opts);
    expect(locator.datum(-1)).toBeNull();
    expect(locator.datum(SALES.length)).toBeNull();
    expect(locator.datum(999)).toBeNull();
  });

  it('unrendered_datum_null', () => {
    // 中间行投影无效（y=NaN）被 lowering 跳过 → locator.datum(该行)=null；且不计入 series centroid
    const rows = [
      { month: 0, revenue: 10, city: 'X' },
      { month: 1, revenue: Number.NaN, city: 'X' }, // 跳过
      { month: 2, revenue: 9, city: 'X' },
    ];
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      id: 'sales',
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      // series-bearing mark：point 无 series 字段（schema 会剥离），改用 line（含 series）
      marks: [{ type: 'line', series: 'city', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
    });
    const locator = createPlotLocator(spec, { sales: rows }, opts);
    // 被跳过的中间行（transformedIndex 1）→ null；存活行 0 / 2 仍可解析
    expect(locator.datum(1)).toBeNull();
    expect(locator.datum(0)).not.toBeNull();
    expect(locator.datum(2)).not.toBeNull();
    // series centroid 只计存活两点（= 行0、行2 锚点均值），不含幽灵中点
    const centroid = locator.series('X');
    expect(centroid).not.toBeNull();
    const a0 = locator.datum(0)!.position;
    const a2 = locator.datum(2)!.position;
    expect(centroid!.position[0]).toBeCloseTo((a0[0] + a2[0]) / 2, 6);
    expect(centroid!.position[1]).toBeCloseTo((a0[1] + a2[1]) / 2, 6);
  });

  it('series_not_found', () => {
    // series(不存在值) → null；全被跳过的 series → null
    const rows = [
      { month: 0, revenue: 10, city: 'X' },
      { month: 1, revenue: Number.NaN, city: 'Z' }, // Z 系列全非有限
    ];
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      id: 'sales',
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      // series-bearing mark：point 无 series 字段（schema 会剥离），改用 line（含 series）
      marks: [{ type: 'line', series: 'city', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
    });
    const locator = createPlotLocator(spec, { sales: rows }, opts);
    expect(locator.series('does-not-exist')).toBeNull();
    // Z 系列唯一行被跳过 → centroid 无成员 → null
    expect(locator.series('Z')).toBeNull();
  });

  it('no_plot_id_structural', () => {
    // root 无 id → 结构寻址 datum(i) 仍解析（不依赖 plotId）；点路径无前缀形式 'datum.<i>' 亦支持（ADR 待决策倾向）
    const spec = pointSpec(); // 无 id
    const locator = createPlotLocator(spec, { sales: SALES }, opts);
    const nodes = datumNodes(firstLayer(spec, { sales: SALES }, opts));
    for (let index = 0; index < nodes.length; index++) {
      const anchor = locator.datum(index);
      expect(anchor).not.toBeNull();
      expect(anchor!.position).toEqual(nodes[index].position);
      // 无具名 Node 可连 → id 省略
      expect(anchor!.id).toBeUndefined();
    }
    // 假设：root 无 id 时支持无前缀点路径 'datum.<i>'（ADR 待决策点倾向「无前缀形式」）。
    // 若实现选择仅结构寻址、不支持无前缀串，此断言需放宽——见报告 §API 歧义。
    const viaAddress = locator.resolve('datum.0');
    expect(viaAddress).not.toBeNull();
    expect(viaAddress!.position).toEqual(nodes[0].position);
  });
});

// =====================================================================
// 错误路径
// =====================================================================
describe('ADR-02 locator — 错误路径', () => {
  it('invalid_address', () => {
    // 非法 address → null（不抛）：垃圾串、错 plotId、错段、越界、错类别值
    const spec = pointSpec({ id: 'sales' });
    const locator = createPlotLocator(spec, { sales: SALES }, opts);
    expect(locator.resolve('garbage')).toBeNull();
    expect(locator.resolve('')).toBeNull();
    expect(locator.resolve('wrongPlot.datum.0')).toBeNull(); // plotId 不符
    expect(locator.resolve('sales.bogus.0')).toBeNull(); // 未知段类型
    expect(locator.resolve('sales.datum.999')).toBeNull(); // 越界 datum
    expect(locator.resolve('sales.datum.notanumber')).toBeNull(); // datum 索引非数字
    // 不抛——以上调用全程不 throw（被 expect 包住即说明无异常逸出）
  });

  it('locator_pure_no_ir_mutation', () => {
    // 建 locator + 多次解析：不改 spec / 不污染输入 datasets / 不产 IR / 不注册 core 元素
    const rows = [
      { month: 0, revenue: 10 },
      { month: 1, revenue: 14 },
    ];
    const datasets: Datasets = { sales: rows };
    const specSnapshot = JSON.stringify(barSpec({ id: 'sales' }));
    const spec = barSpec({ id: 'sales' });
    const locator = createPlotLocator(spec, datasets, opts);
    // 多次解析稳定（同输入同输出，无内部状态漂移）
    const first = locator.datum(0);
    const second = locator.datum(0);
    expect(second).toEqual(first);
    locator.datum(1);
    locator.series('whatever');
    locator.resolve('sales.datum.1');
    // 输入行未被打 SOURCE_INDEX symbol（locator 不污染调用方数据）
    for (const row of rows) {
      expect(Object.getOwnPropertySymbols(row)).not.toContain(SOURCE_INDEX);
    }
    // spec 未被改写
    expect(JSON.stringify(spec)).toBe(specSnapshot);
  });
});

// =====================================================================
// 交互
// =====================================================================
describe('ADR-02 locator — 交互', () => {
  it('polar_datum_parity', () => {
    // sector(饼图)：centroid 落在渲染扇区内（inner ≤ |anchor-center| ≤ outer，角度在 [start,end]）。
    //   不与 Node.position（圆心）相等——sector 锚点取扇片 centroid。
    const spec = pieSpec({ id: 'pie' });
    const locator = createPlotLocator(spec, { d: PIE_ROWS }, squareOpts);
    const nodes = datumNodes(firstLayer(spec, { d: PIE_ROWS }, squareOpts));
    expect(nodes.length).toBeGreaterThan(0);
    const center: [number, number] = [200, 200]; // 正方形画布圆心
    for (let index = 0; index < nodes.length; index++) {
      const params = sectorParams(nodes[index]);
      const anchor = locator.datum(index);
      expect(anchor).not.toBeNull();
      // sector 锚点 ≠ 圆心 Node.position
      expect(anchor!.position).not.toEqual(nodes[index].position);
      const [ax, ay] = anchor!.position;
      const dx = ax - center[0];
      const dy = ay - center[1];
      const r = Math.hypot(dx, dy);
      // 径向落在扇环内
      expect(r).toBeGreaterThanOrEqual(params.innerRadius - 1e-6);
      expect(r).toBeLessThanOrEqual(params.outerRadius + 1e-6);
      // 角度落在 [startAngle, endAngle]（度，0°=+x、90°=+y、屏幕 y 向下，与 projectPolar 同约定）
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angle < params.startAngle - 1e-6) angle += 360;
      expect(angle).toBeGreaterThanOrEqual(params.startAngle - 1e-6);
      expect(angle).toBeLessThanOrEqual(params.endAngle + 1e-6);
      // 显式对照预期 centroid 公式：mid-angle θ=(start+end)/2、mid-radius r=(inner+outer)/2
      const midAngle = ((params.startAngle + params.endAngle) / 2) * (Math.PI / 180);
      const midRadius = (params.innerRadius + params.outerRadius) / 2;
      expect(ax).toBeCloseTo(center[0] + midRadius * Math.cos(midAngle), 4);
      expect(ay).toBeCloseTo(center[1] + midRadius * Math.sin(midAngle), 4);
    }
  });

  it('id_backfill_on_datumIdField', () => {
    // datumIdField 设 → datum(i).id === '<plotId>.datum.<slug(value)>'（与 lowering 给该 Node 绑的 id 一致）
    const rows = [
      { month: 0, revenue: 10, q: 'Q1' },
      { month: 1, revenue: 14, q: 'Q2' },
      { month: 2, revenue: 9, q: 'Q3' },
    ];
    const options: LowerPlotsOptions = { ...opts, datumIdField: 'q' };
    const spec = barSpec({ id: 'sales' });
    const locator = createPlotLocator(spec, { sales: rows }, options);
    // 与 lowering 实际绑定的 Node.id 对照
    const nodeIds = datumNodes(firstLayer(spec, { sales: rows }, options)).map(n => n.id);
    expect(nodeIds).toEqual(['sales.datum.Q1', 'sales.datum.Q2', 'sales.datum.Q3']);
    expect(locator.datum(0)!.id).toBe('sales.datum.Q1');
    expect(locator.datum(1)!.id).toBe('sales.datum.Q2');
    expect(locator.datum(2)!.id).toBe('sales.datum.Q3');
    // 未设 datumIdField 时 id 省略
    const plain = createPlotLocator(spec, { sales: rows }, opts);
    expect(plain.datum(0)!.id).toBeUndefined();
  });

  it('shared_anchor_no_drift', () => {
    // 共享几何单一真源：point / interval 下 locator.position 与 lowering Node.position 完全一致（同 #datum_position_matches_*，
    //   此处显式命名「无漂移」——验证 datumAnchor 被 mark.ts 与 locate.ts 同源调用，无两套投影偏差）。
    for (const make of [pointSpec, barSpec]) {
      const spec = make({ id: 'sales' });
      const datasets: Datasets = { sales: SALES };
      const locator = createPlotLocator(spec, datasets, opts);
      const nodes = datumNodes(firstLayer(spec, datasets, opts));
      for (let index = 0; index < nodes.length; index++) {
        // 逐点严格相等（非近似）——共享 datumAnchor 保证无浮点漂移
        expect(locator.datum(index)!.position).toEqual(nodes[index].position);
      }
    }
  });
});
