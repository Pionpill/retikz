import type { IRNode, IRScope } from '@retikz/core';
import { defineTransformImplementation } from '@retikz/data';
import { defineTransform } from '@retikz/data';
import { SOURCE_INDEX } from '@retikz/data';
import { NonBlankStringSchema } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';
import { object } from 'zod';

import { createPlotLocator } from '../../../src/pipeline';
import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import { lowerPlot } from '../../../src/pipeline/expand/lower';
import type { IRPlot } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

/**
 * datum locator：逻辑地址 → 位置/元素的确定性解析函数
 * @description createPlotLocator 与 lowerPlots 同参，locator.datum(i).position 应与 lowering 实际摆放一致。
 *   sector/polar 锚点取扇片 centroid，断言落在渲染扇区内
 */

type Datasets = Record<string, Array<Record<string, unknown>>>;

const opts: LowerPlotsOptions = { layout: { width: 480, height: 300 } };

const doubleDefinition = defineTransform({
  kind: 'double',
  paramsSchema: object({ field: NonBlankStringSchema, as: NonBlankStringSchema }),
  inputFields: operation => [operation.params.field],
  outputModel: operation => ({ kind: 'preserve', outputs: [{ field: operation.params.as }] }),
});

const doubleDefinitionImplementation = defineTransformImplementation({
  definition: doubleDefinition,
  apply: (rows, operation) =>
    rows.map(row => ({
      ...row,
      [operation.params.as]: Number(row[operation.params.field]) * 2,
    })),
});

const groupSumDefinition = defineTransform({
  kind: 'group-sum',
  paramsSchema: object({ groupBy: NonBlankStringSchema, field: NonBlankStringSchema, as: NonBlankStringSchema }),
  inputFields: operation => [operation.params.groupBy, operation.params.field],
  outputModel: operation => ({
    kind: 'replace',
    fields: [
      { field: operation.params.groupBy, type: { from: operation.params.groupBy } },
      { field: operation.params.as, type: 'continuous' },
    ],
  }),
});

const groupSumDefinitionImplementation = defineTransformImplementation({
  definition: groupSumDefinition,
  apply: (rows, operation, context) => {
    const groups = new Map<string, Array<Record<string, unknown>>>();

    for (const row of rows) {
      const key = String(row[operation.params.groupBy]);
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }

    return [...groups.entries()].map(([key, members]) =>
      context.groupProvenance(
        {
          [operation.params.groupBy]: key,
          [operation.params.as]: members.reduce((sum, row) => sum + Number(row[operation.params.field] ?? 0), 0),
        },
        members,
      ),
    );
  },
});

const SALES = [
  { month: 0, revenue: 10 },
  { month: 1, revenue: 14 },
  { month: 2, revenue: 9 },
];

// ── lowering 侧 helper（找 lowered datum Node 作 parity 对照）────────────

/** 用 lowerPlots 把 spec 展成外层 plot scope */
const expandOf = (spec: IRPlot, datasets: Datasets, options?: LowerPlotsOptions): IRScope => {
  return lowerPlot(spec, datasets, { ...options, textMeasurer: measureLabel }) as IRScope;
};

/** 取第一个 mark 图层 scope（无 guides 时即外层 plot scope 的第一个子 scope） */
const firstLayer = (spec: IRPlot, datasets: Datasets, options?: LowerPlotsOptions): IRScope =>
  expandOf(spec, datasets, options).children[0] as IRScope;

/** 深度收集图层内所有 datum Node（无 color 时直接子；有 color 时藏在子 Scope 里）——渲染序 */
const datumNodes = (layer: IRScope): Array<IRNode> => {
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

/** 读 sector node 的 shape params（断言其确为 sector shape ref） */
const sectorParams = (
  node: IRNode,
): { innerRadius: number; outerRadius: number; startAngle: number; endAngle: number } => {
  const shape = node.shape as { type?: string; params?: Record<string, number> } | undefined;

  expect(shape?.type).toBe('sector');
  return shape!.params as { innerRadius: number; outerRadius: number; startAngle: number; endAngle: number };
};

// ── spec 工厂（沿用 scope-id-meta SALES 风格）──────────────────────────

/** band-x interval(bar) spec；可带 root id */
const barSpec = (over: { id?: string } = {}): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    ...(over.id ? { id: over.id } : {}),
    data: { reference: 'sales' },
    scales: [
      { type: 'band', name: 'xMonth' },
      { type: 'linear', name: 'yRevenue' },
    ],
    coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
    marks: [{ type: 'interval', encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } } }],
  });

/** linear point spec；可带 root id */
const pointSpec = (over: { id?: string } = {}): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    ...(over.id ? { id: over.id } : {}),
    data: { reference: 'sales' },
    scales: [
      { type: 'linear', name: 'xMonth' },
      { type: 'linear', name: 'yRevenue' },
    ],
    coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
    marks: [{ type: 'point', encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } } }],
  });

/** 饼图 sector spec（stack transform 产累积界 → sector mark） */
const pieSpec = (over: { id?: string } = {}): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    ...(over.id ? { id: over.id } : {}),
    data: { reference: 'd' },
    transform: [{ operation: { kind: 'stack', params: { y: 'v' } } }],
    coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
    scales: [
      { type: 'linear', name: 'a' },
      { type: 'linear', name: 'r' },
    ],
    marks: [
      {
        type: 'interval',
        encodings: { bounds: { x: { from: { field: 'y0' }, to: { field: 'y1' } } }, color: 'k' },
        properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
      },
    ],
  });

const PIE_ROWS = [
  { k: 'A', v: 3 },
  { k: 'B', v: 7 },
];

/** 正方形画布（sector parity 用，对齐 sector.test.ts：center=[200,200] outerRadius=200） */
const squareOpts: LowerPlotsOptions = { layout: { width: 400, height: 400 } };

// =====================================================================
// Happy path
// =====================================================================
describe('基准定位器 - 快乐路径', () => {
  it('基准位置匹配下沉点', () => {
    // point mark：locator.datum(i).position === lowering 第 i 行 Node.position（cartesian）
    const spec = pointSpec({ id: 'sales' });
    const datasets: Datasets = { sales: SALES };
    const locator = createPlotLocator(spec, datasets, { ...opts, environment: {} });
    const nodes = datumNodes(firstLayer(spec, datasets, opts));

    expect(nodes).toHaveLength(SALES.length);

    for (let index = 0; index < nodes.length; index++) {
      const anchor = locator.datum(index);

      expect(anchor).not.toBeNull();
      expect(anchor!.position).toEqual(nodes[index].position);
    }
  });

  it('基准位置与下降间隔匹配', () => {
    // interval mark：柱锚点 === lowering 柱 Node.position（柱中心 [xCenter,(yBase+yValue)/2]）
    const spec = barSpec({ id: 'sales' });
    const datasets: Datasets = { sales: SALES };
    const locator = createPlotLocator(spec, datasets, { ...opts, environment: {} });
    const nodes = datumNodes(firstLayer(spec, datasets, opts));

    expect(nodes).toHaveLength(SALES.length);

    for (let index = 0; index < nodes.length; index++) {
      const anchor = locator.datum(index);

      expect(anchor).not.toBeNull();
      expect(anchor!.position).toEqual(nodes[index].position);
    }
  });

  it('数据元合成', () => {
    // datumProvenance 关（默认）→ locator.datum(i).meta 仍给同构 meta（locator 按需合成，零 IR 代价）
    const spec = barSpec({ id: 'sales' });
    const datasets: Datasets = { sales: SALES };
    const locator = createPlotLocator(spec, datasets, { ...opts, environment: {} });

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

  it('解析路径系列', () => {
    // resolve('<plotId>.series.<v>') → 该 series 已渲染 datum 锚点 centroid
    const TREND = [
      { t: 0, v: 4, city: 'X' },
      { t: 1, v: 8, city: 'X' },
      { t: 0, v: 2, city: 'Y' },
      { t: 1, v: 6, city: 'Y' },
    ];
    const spec = PlotSchema.parse({
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
      marks: [{ type: 'path', encodings: { series: 'city', position: { x: { field: 't' }, y: { field: 'v' } } } }],
    });
    const datasets: Datasets = { t: TREND };
    const locator = createPlotLocator(spec, datasets, { ...opts, environment: {} });
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

  it('解析每个面面板内的标记局部转换的 Path 系列', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      id: 'regression',
      data: { reference: 'rows' },
      scales: [
        { type: 'linear', name: 'xScale' },
        { type: 'linear', name: 'yScale' },
        { type: 'ordinal', name: 'colorScale' },
      ],
      composition: {
        defaultView: 'root',
        views: [{ id: 'root', coordinate: { type: 'cartesian2D', x: 'xScale', y: 'yScale' } }],
        arrangements: [{ kind: 'facet', id: 'panel', view: 'root', column: { field: 'panel' } }],
      },
      marks: [
        {
          id: 'trend',
          type: 'path',
          transforms: [
            {
              operation: {
                kind: 'smooth',
                params: {
                  x: 'x',
                  y: 'y',
                  groupBy: ['series'],
                  sampleCount: 2,
                  xAs: 'trendX',
                  yAs: 'trendY',
                },
              },
            },
          ],
          encodings: {
            series: 'series',
            order: 'trendX',
            color: { field: 'series', scale: 'colorScale' },
            position: { x: { field: 'trendX' }, y: { field: 'trendY' } },
          },
        },
      ],
    });
    const locator = createPlotLocator(
      spec,
      {
        rows: [
          { panel: 'left', series: 'A', x: 1, y: 2 },
          { panel: 'left', series: 'A', x: 2, y: 4 },
          { panel: 'right', series: 'A', x: 1, y: 10 },
          { panel: 'right', series: 'A', x: 2, y: 20 },
        ],
      },
      { ...opts, environment: {} },
    );

    const left = locator.series('A', { markIndex: 0, facet: { id: 'panel', column: 'left' } });
    const right = locator.series('A', { markIndex: 0, facet: { id: 'panel', column: 'right' } });

    expect(left).not.toBeNull();
    expect(right).not.toBeNull();
    expect(left?.meta).toMatchObject({ markIndex: 0, series: 'A', facet: { id: 'panel', column: 'left' } });
    expect(right?.meta).toMatchObject({ markIndex: 0, series: 'A', facet: { id: 'panel', column: 'right' } });
    expect(left?.position).not.toEqual(right?.position);
    expect(left?.position[1]).toBeGreaterThanOrEqual(0);
    expect(left?.position[1]).toBeLessThanOrEqual(opts.layout?.height ?? 300);
    expect(right?.position[1]).toBeGreaterThanOrEqual(0);
    expect(right?.position[1]).toBeLessThanOrEqual(opts.layout?.height ?? 300);
  });
});

// =====================================================================
// 边界
// =====================================================================
describe('基准定位器 — 边界', () => {
  it('数据超出范围', () => {
    // datum(负 / ≥ rowCount) → null（不抛）
    const spec = pointSpec({ id: 'sales' });
    const locator = createPlotLocator(spec, { sales: SALES }, { ...opts, environment: {} });

    expect(locator.datum(-1)).toBeNull();
    expect(locator.datum(SALES.length)).toBeNull();
    expect(locator.datum(999)).toBeNull();
  });

  it('未渲染的数据为空', () => {
    // 中间行投影无效（y=NaN）被 lowering 跳过 → locator.datum(该行)=null；且不计入 series centroid
    const rows = [
      { month: 0, revenue: 10, city: 'X' },
      { month: 1, revenue: Number.NaN, city: 'X' }, // 跳过
      { month: 2, revenue: 9, city: 'X' },
    ];
    const spec = PlotSchema.parse({
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
      marks: [
        { type: 'path', encodings: { series: 'city', position: { x: { field: 'month' }, y: { field: 'revenue' } } } },
      ],
    });
    const locator = createPlotLocator(spec, { sales: rows }, { ...opts, environment: {} });

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

  it('系列未找到', () => {
    // series(不存在值) → null；全被跳过的 series → null
    const rows = [
      { month: 0, revenue: 10, city: 'X' },
      { month: 1, revenue: Number.NaN, city: 'Z' }, // Z 系列全非有限
    ];
    const spec = PlotSchema.parse({
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
      marks: [
        { type: 'path', encodings: { series: 'city', position: { x: { field: 'month' }, y: { field: 'revenue' } } } },
      ],
    });
    const locator = createPlotLocator(spec, { sales: rows }, { ...opts, environment: {} });

    expect(locator.series('does-not-exist')).toBeNull();

    // Z 系列唯一行被跳过 → centroid 无成员 → null
    expect(locator.series('Z')).toBeNull();
  });

  it('无情节 ID 结构', () => {
    // root 无 id → 结构寻址 datum(i) 仍解析（不依赖 plotId）；点路径支持无前缀形式 'datum.<i>'
    const spec = pointSpec(); // 无 id
    const locator = createPlotLocator(spec, { sales: SALES }, { ...opts, environment: {} });
    const nodes = datumNodes(firstLayer(spec, { sales: SALES }, opts));

    for (let index = 0; index < nodes.length; index++) {
      const anchor = locator.datum(index);

      expect(anchor).not.toBeNull();
      expect(anchor!.position).toEqual(nodes[index].position);

      // 无具名 Node 可连 → id 省略
      expect(anchor!.id).toBeUndefined();
    }

    const viaAddress = locator.resolve('datum.0');

    expect(viaAddress).not.toBeNull();
    expect(viaAddress!.position).toEqual(nodes[0].position);
  });
});

// =====================================================================
// 错误路径
// =====================================================================
describe('基准定位器 — 错误', () => {
  it('无效地址', () => {
    // 非法 address → null（不抛）：垃圾串、错 plotId、错段、越界、错类别值
    const spec = pointSpec({ id: 'sales' });
    const locator = createPlotLocator(spec, { sales: SALES }, { ...opts, environment: {} });

    expect(locator.resolve('garbage')).toBeNull();
    expect(locator.resolve('')).toBeNull();
    expect(locator.resolve('wrongPlot.datum.0')).toBeNull(); // plotId 不符
    expect(locator.resolve('sales.bogus.0')).toBeNull(); // 未知段类型
    expect(locator.resolve('sales.datum.999')).toBeNull(); // 越界 datum
    expect(locator.resolve('sales.datum.notanumber')).toBeNull(); // datum 索引非数字
    // 不抛——以上调用全程不 throw（被 expect 包住即说明无异常逸出）
  });

  it('定位器纯无 ir 突变', () => {
    // 建 locator + 多次解析：不改 spec / 不污染输入 datasets / 不产 IR / 不注册 core 元素
    const rows = [
      { month: 0, revenue: 10 },
      { month: 1, revenue: 14 },
    ];
    const datasets: Datasets = { sales: rows };
    const specSnapshot = JSON.stringify(barSpec({ id: 'sales' }));
    const spec = barSpec({ id: 'sales' });
    const locator = createPlotLocator(spec, datasets, { ...opts, environment: {} });

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
describe('基准定位器——交互', () => {
  it('极坐标数据项保持等价', () => {
    // sector(饼图)：centroid 落在渲染扇区内（inner ≤ |anchor-center| ≤ outer，角度在 [start,end]）
    //   不与 Node.position（圆心）相等——sector 锚点取扇片 centroid
    const spec = pieSpec({ id: 'pie' });
    const locator = createPlotLocator(spec, { d: PIE_ROWS }, { ...squareOpts, environment: {} });
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

  it('datumIdField 上的 id 回填', () => {
    // datumIdField 设 → datum(i).id === '<plotId>.datum.<slug(value)>'（与 lowering 给该 Node 绑的 id 一致）
    const rows = [
      { month: 0, revenue: 10, q: 'Q1' },
      { month: 1, revenue: 14, q: 'Q2' },
      { month: 2, revenue: 9, q: 'Q3' },
    ];
    const options: LowerPlotsOptions = { ...opts, datumIdField: 'q' };
    const spec = barSpec({ id: 'sales' });
    const locator = createPlotLocator(spec, { sales: rows }, { ...options, environment: {} });

    // 与 lowering 实际绑定的 Node.id 对照
    const nodeIds = datumNodes(firstLayer(spec, { sales: rows }, options)).map(n => n.id);

    expect(nodeIds).toEqual(['sales.datum.Q1', 'sales.datum.Q2', 'sales.datum.Q3']);
    expect(locator.datum(0)!.id).toBe('sales.datum.Q1');
    expect(locator.datum(1)!.id).toBe('sales.datum.Q2');
    expect(locator.datum(2)!.id).toBe('sales.datum.Q3');

    // 未设 datumIdField 时 id 省略
    const plain = createPlotLocator(spec, { sales: rows }, { ...opts, environment: {} });

    expect(plain.datum(0)!.id).toBeUndefined();
  });

  it('共享锚点无漂移', () => {
    // 共享几何单一真源：point / interval 下 locator.position 与 lowering Node.position 完全一致（同 #datum_position_matches_*，
    //   此处显式命名「无漂移」——验证 datumAnchor 被 mark.ts 与 locate.ts 同源调用，无两套投影偏差）
    for (const make of [pointSpec, barSpec]) {
      const spec = make({ id: 'sales' });
      const datasets: Datasets = { sales: SALES };
      const locator = createPlotLocator(spec, datasets, { ...opts, environment: {} });
      const nodes = datumNodes(firstLayer(spec, datasets, opts));

      for (let index = 0; index < nodes.length; index++) {
        // 逐点严格相等（非近似）——共享 datumAnchor 保证无浮点漂移
        expect(locator.datum(index)!.position).toEqual(nodes[index].position);
      }
    }
  });
});

// =====================================================================
// Bug Hunter 回归（stage 3 对抗提升为正式测试）
// =====================================================================
describe('数据定位器 - bug 猎人回归', () => {
  it('定位器匹配变换下的下沉', () => {
    // 关键对抗：locator 必须与 lowering 用「同一份 transform 后行」。带 descending sort 时，
    //   locator.datum(i) 须对齐 lowering 渲染序第 i 个 Node（而非原始数据序），且 meta.sourceIndex 正确回指
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      id: 'sales',
      data: { reference: 'sales' },
      transform: [{ operation: { kind: 'sort', params: { field: 'revenue', order: 'descending' } } }],
      scales: [
        { type: 'band', name: 'xMonth' },
        { type: 'linear', name: 'yRevenue' },
      ],
      coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
      marks: [{ type: 'interval', encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } } }],
    });
    const datasets = { sales: SALES };
    const options: LowerPlotsOptions = { ...opts, provenance: true, datumProvenance: true };
    const nodes = datumNodes(firstLayer(spec, datasets, options));
    const locator = createPlotLocator(spec, datasets, { ...options, environment: {} });

    // 渲染序：revenue 降序 → [14(month1),10(month0),9(month2)] = source 行 [1,0,2]
    expect(nodes).toHaveLength(3);

    for (let index = 0; index < nodes.length; index++) {
      const anchor = locator.datum(index);

      expect(anchor).not.toBeNull();

      // 位置与 lowering 渲染序逐点一致（locator 复用同一 transform 后行 + frame）
      expect(anchor!.position).toEqual(nodes[index].position);

      // meta 渲染序与 lowering Node.meta 一致
      const nodeMeta = nodes[index].meta as { transformedIndex: number; sourceIndex?: number };
      const anchorMeta = anchor!.meta as { transformedIndex: number; sourceIndex?: number };

      expect(anchorMeta.transformedIndex).toBe(index);
      expect(anchorMeta.sourceIndex).toBe(nodeMeta.sourceIndex);
    }

    // sourceIndex 反映降序后回指原始行：[1,0,2]
    expect(nodes.map(n => (n.meta as { sourceIndex?: number }).sourceIndex)).toEqual([1, 0, 2]);
  });

  it('定位器不会改变输入数据集', () => {
    // locator 为合成 meta 需 tagSourceIndex，但必须打在克隆行、不污染调用方原始数据
    const rows = [
      { month: 0, revenue: 10 },
      { month: 1, revenue: 14 },
    ];
    const locator = createPlotLocator(
      barSpec({ id: 'sales' }),
      { sales: rows },
      { environment: {}, ...opts, datumProvenance: true },
    );
    locator.datum(0);
    locator.series('x'); // 触发各路径

    for (const row of rows) {
      expect(Object.getOwnPropertySymbols(row)).not.toContain(SOURCE_INDEX);
    }
  });
});

describe('数据定位器变换注册表等价性', () => {
  it('自定义变换定位器匹配下沉', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      id: 'custom',
      data: { reference: 'd' },
      transform: [{ operation: { kind: 'double', params: { field: 'x', as: 'x2' } } }],
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encodings: { position: { x: { field: 'x2' }, y: { field: 'y' } } } }],
    });
    const datasets = {
      d: [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ],
    };
    const options: LowerPlotsOptions = {
      definitions: { transforms: [doubleDefinition] },
      implementations: { transforms: [doubleDefinitionImplementation] },
      ...opts,
    };
    const nodes = datumNodes(firstLayer(spec, datasets, options));
    const locator = createPlotLocator(spec, datasets, { ...options, environment: {} });

    expect(nodes).toHaveLength(2);

    for (let index = 0; index < nodes.length; index++) {
      expect(locator.datum(index)!.position).toEqual(nodes[index].position);
    }
  });

  it('标记局部变换定位器匹配下沉', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      id: 'local',
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          transforms: [{ operation: { kind: 'sort', params: { field: 'revenue', order: 'descending' } } }],
          encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } },
        },
      ],
    });
    const datasets = { sales: SALES };
    const options: LowerPlotsOptions = { ...opts, provenance: true, datumProvenance: true };
    const nodes = datumNodes(firstLayer(spec, datasets, options));
    const locator = createPlotLocator(spec, datasets, { ...options, environment: {} });

    expect(nodes).toHaveLength(3);

    for (let index = 0; index < nodes.length; index++) {
      const anchor = locator.datum(index);

      expect(anchor).not.toBeNull();
      expect(anchor!.position).toEqual(nodes[index].position);
      expect((anchor!.meta as { sourceIndex?: number }).sourceIndex).toBe(
        (nodes[index].meta as { sourceIndex?: number }).sourceIndex,
      );
    }

    expect(nodes.map(node => (node.meta as { sourceIndex?: number }).sourceIndex)).toEqual([1, 0, 2]);
  });

  it('自定义组变换定位器元携带源索引', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      id: 'grouped',
      data: { reference: 'd' },
      transform: [{ operation: { kind: 'group-sum', params: { groupBy: 'group', field: 'value', as: 'total' } } }],
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'interval', encodings: { position: { x: { field: 'group' }, y: { field: 'total' } } } }],
    });
    const datasets = {
      d: [
        { group: 'A', value: 2 },
        { group: 'A', value: 3 },
        { group: 'B', value: 5 },
      ],
    };
    const locator = createPlotLocator(spec, datasets, {
      definitions: { transforms: [groupSumDefinition] },
      implementations: { transforms: [groupSumDefinitionImplementation] },
      environment: {},
      ...opts,
    });

    expect((locator.datum(0)!.meta as { sourceIndices?: Array<number> }).sourceIndices).toEqual([0, 1]);
    expect((locator.datum(1)!.meta as { sourceIndices?: Array<number> }).sourceIndices).toEqual([2]);
  });
});

// =====================================================================
// 跨评审回归（BLOCKER #1/#2/#3 + WARNING #4 的正式回归网）
// =====================================================================
describe('数据项定位器的锚点等价性及明确报错', () => {
  // dodge：2 系列分组柱（band-x，series 切等分子带）
  const dodgeSpec = (): IRPlot =>
    PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      id: 'dodge',
      data: { reference: 'd' },
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'interval',
          encodings: {
            series: 'g',
            bounds: { x: { group: 'g' } },
            position: { x: { field: 'cat' }, y: { field: 'v' } },
          },
          properties: { bounds: { x: { kind: 'band' } } },
        },
      ],
    });
  const DODGE_ROWS = [
    { cat: 'A', g: 'p', v: 3 },
    { cat: 'A', g: 'q', v: 5 },
    { cat: 'B', g: 'p', v: 7 },
    { cat: 'B', g: 'q', v: 2 },
  ];

  // stack：带 stack transform 的堆叠柱（派生 y0/y1）
  const stackSpec = (): IRPlot =>
    PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      id: 'stk',
      data: { reference: 'd' },
      transform: [{ operation: { kind: 'stack', params: { x: 'cat', y: 'v', groupBy: 'g' } } }],
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'interval',
          encodings: {
            series: 'g',
            bounds: { y: { from: { field: 'y0' }, to: { field: 'y1' } } },
            position: { x: { field: 'cat' }, y: { field: 'v' } },
          },
          properties: { bounds: { y: { kind: 'extent' } } },
        },
      ],
    });
  const STACK_ROWS = [
    { cat: 'A', g: 'p', v: 3 },
    { cat: 'A', g: 'q', v: 5 },
    { cat: 'B', g: 'p', v: 7 },
    { cat: 'B', g: 'q', v: 2 },
  ];

  // polar dodge：极坐标 2 系列 interval（径向柱 / 玫瑰，子角带）
  const polarDodgeSpec = (): IRPlot =>
    PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      id: 'rose',
      data: { reference: 'd' },
      scales: [
        { type: 'band', name: 'a' },
        { type: 'linear', name: 'r', domain: [0, 10] },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r', interpolation: 'polar' },
      marks: [
        {
          type: 'interval',
          encodings: {
            series: 'g',
            bounds: { x: { group: 'g' } },
            position: { x: { field: 'cat' }, y: { field: 'v' } },
          },
          properties: { bounds: { x: { kind: 'band' } } },
        },
      ],
    });
  const POLAR_DODGE_ROWS = [
    { cat: 'A', g: 'p', v: 4 },
    { cat: 'A', g: 'q', v: 6 },
    { cat: 'B', g: 'p', v: 7 },
    { cat: 'B', g: 'q', v: 2 },
  ];

  it('锚奇偶笛卡尔闪避', () => {
    // dodge 柱：每个已渲染行 locator.datum(i).position 与 lowered Node.position 逐点相等
    //   修 #1 前 barCenterAnchor 只匹配 plain → 子带柱漂移；修后共享 intervalRect
    const spec = dodgeSpec();
    const datasets: Datasets = { d: DODGE_ROWS };
    const locator = createPlotLocator(spec, datasets, { ...opts, environment: {} });
    const nodes = datumNodes(firstLayer(spec, datasets, opts));

    expect(nodes).toHaveLength(DODGE_ROWS.length);

    for (let index = 0; index < nodes.length; index++) {
      const anchor = locator.datum(index);

      expect(anchor).not.toBeNull();
      expect(anchor!.position).toEqual(nodes[index].position);
    }
  });

  it('锚等价性笛卡尔堆叠', () => {
    // stack 柱：每行 locator.datum(i).position === lowered Node.position（y0/y1 中点）
    const spec = stackSpec();
    const datasets: Datasets = { d: STACK_ROWS };
    const locator = createPlotLocator(spec, datasets, { ...opts, environment: {} });
    const nodes = datumNodes(firstLayer(spec, datasets, opts));

    expect(nodes).toHaveLength(STACK_ROWS.length);

    for (let index = 0; index < nodes.length; index++) {
      const anchor = locator.datum(index);

      expect(anchor).not.toBeNull();
      expect(anchor!.position).toEqual(nodes[index].position);
    }
  });

  it('锚定奇偶性极闪避', () => {
    // polar 2 系列 interval：locator datum centroid 落在 lowered 扇区内 + 等于该扇区 params 的 wedgeCentroid
    const spec = polarDodgeSpec();
    const datasets: Datasets = { d: POLAR_DODGE_ROWS };
    const locator = createPlotLocator(spec, datasets, { ...squareOpts, environment: {} });
    const nodes = datumNodes(firstLayer(spec, datasets, squareOpts));

    expect(nodes.length).toBeGreaterThan(0);

    const center: [number, number] = [200, 200];

    for (let index = 0; index < nodes.length; index++) {
      const params = sectorParams(nodes[index]);
      const anchor = locator.datum(index);

      expect(anchor).not.toBeNull();

      const [ax, ay] = anchor!.position;

      // 落在 lowered 扇区内（径向）
      const r = Math.hypot(ax - center[0], ay - center[1]);

      expect(r).toBeGreaterThanOrEqual(params.innerRadius - 1e-6);
      expect(r).toBeLessThanOrEqual(params.outerRadius + 1e-6);

      // 等于该扇区 params 的 wedgeCentroid（mid-angle / mid-radius）
      const midAngle = ((params.startAngle + params.endAngle) / 2) * (Math.PI / 180);
      const midRadius = (params.innerRadius + params.outerRadius) / 2;

      expect(ax).toBeCloseTo(center[0] + midRadius * Math.cos(midAngle), 4);
      expect(ay).toBeCloseTo(center[1] + midRadius * Math.sin(midAngle), 4);
    }
  });

  it('基准 id 十字标记抛出', () => {
    // point + bar 两 datum-bearing mark 同 datumIdField 同数据 → 跨 mark 撞同 id（每个 mark 各渲染一遍同值）
    //   → lowering 抛 + createPlotLocator 抛（plot 级共享 registrar，#2/#3 parity）
    const rows = [
      { month: 0, revenue: 10, q: 'Q1' },
      { month: 1, revenue: 14, q: 'Q2' },
    ];
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      id: 'multi',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        { type: 'point', encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } } },
        { type: 'interval', encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } } },
      ],
    });
    const options: LowerPlotsOptions = { ...opts, datumIdField: 'q' };

    expect(() => expandOf(spec, { d: rows }, options)).toThrow();
    expect(() => createPlotLocator(spec, { d: rows }, { ...options, environment: {} })).toThrow();
  });

  it('数据项定位器的 id 无效时明确报错', () => {
    // datumIdField 指向某行缺字段 → createPlotLocator 抛（与 lowering fail-loud parity，#3）
    const rows = [
      { month: 0, revenue: 10, q: 'Q1' },
      { month: 1, revenue: 14 }, // 缺 q
      { month: 2, revenue: 9, q: 'Q3' },
    ];
    const options: LowerPlotsOptions = { ...opts, datumIdField: 'q' };

    expect(() => expandOf(barSpec({ id: 'sales' }), { sales: rows }, options)).toThrow();
    expect(() =>
      createPlotLocator(barSpec({ id: 'sales' }), { sales: rows }, { ...options, environment: {} }),
    ).toThrow();
  });

  it('解析系列数字', () => {
    // 数值 series 值经 resolve('plotId.series.<n>')（字符串 token）可达——宽松字符串比对（#4）
    const TREND = [
      { t: 0, v: 4, g: 5 },
      { t: 1, v: 8, g: 5 },
      { t: 0, v: 2, g: 6 },
      { t: 1, v: 6, g: 6 },
    ];
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      id: 'p',
      data: { reference: 't' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'path', encodings: { series: 'g', position: { x: { field: 't' }, y: { field: 'v' } } } }],
    });
    const locator = createPlotLocator(spec, { t: TREND }, { ...opts, environment: {} });
    const viaAddress = locator.resolve('p.series.5');

    expect(viaAddress).not.toBeNull();
    expect(Number.isFinite(viaAddress!.position[0])).toBe(true);
    expect(Number.isFinite(viaAddress!.position[1])).toBe(true);

    // 位置与结构 series(5)（数值）一致——宽松字符串比对让 '5' token 命中数值 5
    const structural = locator.series(5);

    expect(structural).not.toBeNull();
    expect(viaAddress!.position).toEqual(structural!.position);
  });
});
