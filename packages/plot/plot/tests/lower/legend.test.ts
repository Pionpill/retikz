import type { IRChild, IRNode, IRPath, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { type LowerPlotsOptions, lowerPlots } from '../../src/lower/expand';

/**
 * ADR-03 legend guide lowering 测试（alpha.8）。
 *
 * legend 经 lowerPlots 下沉成一个 core scope（swatch / 色带 ramp / 分箱 / 梯度符号 + 标签），
 * 摆在 position 对应边的预留带内；本测试断言 **结构性** 产物（swatch 数、scope 存在、plotArea 宽度变化、
 * 默认 axis 是否仍在、descriptor 一致性），不硬编码像素。
 *
 * lowerLegend / resolver descriptor 双产出 / by-type axes / 占位均未实现 → 大量 case 此刻 fail，符合预期。
 */

type Datasets = Record<string, Array<Record<string, unknown>>>;

const opts: LowerPlotsOptions = { width: 480, height: 300 };

const expandOf = (spec: PlotSpec, datasets: Datasets, options: LowerPlotsOptions = opts): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

/** 子节点谓词 */
const isScope = (child: IRChild): child is IRScope => child.type === 'scope';
const isPath = (child: IRChild): child is IRPath => child.type === 'path';
const isNode = (child: IRChild): child is IRNode => child.type === 'node';

/** 整棵子树里所有 scope（深度优先；含外层自身的直接 / 间接子层） */
const allScopes = (root: IRScope): Array<IRScope> => {
  const out: Array<IRScope> = [];
  const walk = (scope: IRScope): void => {
    for (const child of scope.children) {
      if (isScope(child)) {
        out.push(child);
        walk(child);
      }
    }
  };
  walk(root);
  return out;
};

/**
 * 启发式辨认 legend 层：legend scope 不是 mark 层（无 nodeDefault.shape / pathDefault.strokeWidth），
 * 也不是 axis / grid 层（带成片刻度文字沿一条轴线）；落在某 position 预留带。
 * 实现期 legend 层建议带稳定标记（如 id 前缀或 meta.role='legend'）——测试先用「含 swatch（小矩形 path）+ 标签 Node」的结构特征找。
 */
const swatchPathsOf = (scope: IRScope): Array<IRPath> => scope.children.filter(isPath);
const labelsOf = (scope: IRScope): Array<IRNode> => scope.children.filter(isNode);

/** 找 legend 层：约定 id 以 'legend' 开头（实现期 lowerLegend 给）；退化用结构特征兜底 */
const findLegendLayer = (outer: IRScope): IRScope | undefined => {
  const scopes = allScopes(outer);
  const byId = scopes.find(scope => typeof scope.id === 'string' && scope.id.startsWith('legend'));
  if (byId) return byId;
  // 兜底：既非 mark 层（无 shape / strokeWidth）又非纯轴线层（这里弱判：含 path 且含多个标签 Node）
  return scopes.find(
    scope =>
      scope.nodeDefault?.shape === undefined &&
      scope.pathDefault?.strokeWidth === undefined &&
      swatchPathsOf(scope).length > 0 &&
      labelsOf(scope).length > 0,
  );
};

/** mark 层（point/sector 有 nodeDefault.shape；line/area 有 pathDefault.strokeWidth） */
const findMarkLayer = (outer: IRScope): IRScope | undefined =>
  allScopes(outer).find(scope => scope.nodeDefault?.shape !== undefined || scope.pathDefault?.strokeWidth !== undefined);

/** axis 层：纯文字 nodeDefault（stroke='none'）+ 轴线 path，无 shape */
const axisLayersOf = (outer: IRScope): Array<IRScope> =>
  allScopes(outer).filter(scope => {
    const nodeDefault = scope.nodeDefault;
    return nodeDefault?.stroke === 'none' && nodeDefault.shape === undefined;
  });

// ── 测试数据 ───────────────────────────────────────────────────────────

/** 分类色：4 行 3 类（A 重复）→ ordinal color swatch */
const ORDINAL_ROWS = [
  { lon: 0, lat: 0, kind: 'A' },
  { lon: 1, lat: 1, kind: 'B' },
  { lon: 2, lat: 0, kind: 'C' },
  { lon: 3, lat: 2, kind: 'A' },
];

/** 单类别色：全 A → 一个 swatch */
const SINGLE_CATEGORY_ROWS = [
  { lon: 0, lat: 0, kind: 'A' },
  { lon: 1, lat: 1, kind: 'A' },
];

/** 连续色 + size：temperature 连续、population 正值 */
const CONTINUOUS_ROWS = [
  { lon: 0, lat: 0, temperature: 5, population: 100 },
  { lon: 1, lat: 1, temperature: 18, population: 4000 },
  { lon: 2, lat: 0, temperature: 30, population: 250 },
];

/** 分箱色（quantile）数据 */
const QUANTILE_ROWS = [
  { lon: 0, lat: 0, density: 1 },
  { lon: 1, lat: 1, density: 4 },
  { lon: 2, lat: 0, density: 9 },
  { lon: 3, lat: 2, density: 16 },
];

// ── spec 工厂 ─────────────────────────────────────────────────────────

/** ordinal color 散点 + 显式 color legend（不声明 Axis） */
const ordinalColorLegendSpec = (legend: Record<string, unknown> = {}): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
      { type: 'ordinal', name: 'kindColor' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' }, color: { field: 'kind', scale: 'kindColor' } } }],
    guides: [{ type: 'legend', channel: 'color', scale: 'kindColor', ...legend }],
  });

/** 连续 color 散点 + sequential color legend */
const sequentialColorLegendSpec = (): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: {
      reference: 'd',
      model: [
        { name: 'lon', type: 'continuous' },
        { name: 'lat', type: 'continuous' },
        { name: 'temperature', type: 'continuous' },
      ],
    },
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
      { type: 'sequential', name: 'tempColor' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' }, color: { field: 'temperature', scale: 'tempColor' } } }],
    guides: [{ type: 'legend', channel: 'color', scale: 'tempColor', tickCount: 4 }],
  });

/** size 散点 + size legend */
const sizeLegendSpec = (legend: Record<string, unknown> = {}): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' }, size: { field: 'population' } } }],
    guides: [{ type: 'legend', channel: 'size', ...legend }],
  });

describe('lowerPlots legend — happy path（ADR-03）', () => {
  // 离散 swatch：每类一块 + 标签
  it('ordinal_color_legend_one_swatch_per_category', () => {
    const outer = expandOf(ordinalColorLegendSpec(), { d: ORDINAL_ROWS });
    const legend = findLegendLayer(outer);
    expect(legend).toBeDefined();
    // 3 个类别（A/B/C 去重）→ 3 个 swatch + 3 个标签
    const labels = labelsOf(legend as IRScope);
    expect(labels).toHaveLength(3);
    expect(labels.map(n => n.text).sort()).toEqual(['A', 'B', 'C']);
    expect(swatchPathsOf(legend as IRScope).length).toBeGreaterThanOrEqual(3);
  });

  // 连续 ramp：色带 + nice 刻度
  it('sequential_color_legend_continuous_ramp', () => {
    const outer = expandOf(sequentialColorLegendSpec(), { d: CONTINUOUS_ROWS });
    const legend = findLegendLayer(outer);
    expect(legend).toBeDefined();
    // 连续 ramp：刻度标签数 > 1（非逐类 swatch），tickCount 提示 4 档左右
    const labels = labelsOf(legend as IRScope);
    expect(labels.length).toBeGreaterThan(1);
    expect(labels.every(n => typeof n.text === 'string')).toBe(true);
  });

  // size 梯度符号：几档代表圈 + 值
  it('size_legend_graduated_symbols', () => {
    const outer = expandOf(sizeLegendSpec(), { d: CONTINUOUS_ROWS });
    const legend = findLegendLayer(outer);
    expect(legend).toBeDefined();
    // 梯度符号：≥2 档代表大小（nice 3 档左右）+ 值标签
    const labels = labelsOf(legend as IRScope);
    expect(labels.length).toBeGreaterThanOrEqual(2);
  });
});

describe('lowerPlots legend — 边界（ADR-03）', () => {
  // 单类别 legend → 一个 swatch
  it('single_category_legend_one_swatch', () => {
    const outer = expandOf(ordinalColorLegendSpec(), { d: SINGLE_CATEGORY_ROWS });
    const legend = findLegendLayer(outer);
    expect(legend).toBeDefined();
    const labels = labelsOf(legend as IRScope);
    expect(labels).toHaveLength(1);
    expect(labels[0].text).toBe('A');
  });

  // quantize / quantile 分箱标签：每档一区间标签
  it('quantile_legend_binned_labels', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: {
        reference: 'd',
        model: [
          { name: 'lon', type: 'continuous' },
          { name: 'lat', type: 'continuous' },
          { name: 'density', type: 'continuous' },
        ],
      },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'quantile', name: 'densColor' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' }, color: { field: 'density', scale: 'densColor' } } }],
      guides: [{ type: 'legend', channel: 'color', scale: 'densColor' }],
    });
    const outer = expandOf(spec, { d: QUANTILE_ROWS });
    const legend = findLegendLayer(outer);
    expect(legend).toBeDefined();
    // 分箱 → 多个区间 swatch + 区间标签
    expect(swatchPathsOf(legend as IRScope).length).toBeGreaterThanOrEqual(1);
    expect(labelsOf(legend as IRScope).length).toBeGreaterThanOrEqual(1);
  });

  // 空数据 → legend 不崩（空或退化）
  it('empty_data_legend_no_crash', () => {
    expect(() => expandOf(ordinalColorLegendSpec(), { d: [] })).not.toThrow();
  });
});

describe('lowerPlots legend — 错误路径（ADR-03）', () => {
  // 多 color scale 未给 scale 消歧 → fail-loud
  it('ambiguous_multiple_color_scales_fail_loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'ordinal', name: 'colorA' },
        { type: 'ordinal', name: 'colorB' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        { type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' }, color: { field: 'kind', scale: 'colorA' } } },
        { type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' }, color: { field: 'kind', scale: 'colorB' } } },
      ],
      // channel=color 无 scale → 两个 color scale 歧义
      guides: [{ type: 'legend', channel: 'color' }],
    });
    expect(() => expandOf(spec, { d: ORDINAL_ROWS })).toThrow();
  });

  // legend 绑不存在的 scale name → fail-loud
  it('legend_unknown_scale_name_fail_loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'ordinal', name: 'kindColor' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' }, color: { field: 'kind', scale: 'kindColor' } } }],
      guides: [{ type: 'legend', channel: 'color', scale: 'doesNotExist' }],
    });
    expect(() => expandOf(spec, { d: ORDINAL_ROWS })).toThrow();
  });
});

describe('lowerPlots legend — 交互（ADR-03 修 P1 ⑦ / P2 ⑩ / P1 ⑥）', () => {
  // 修 P1 ⑦：Legend 不抑制默认 axes —— point mark + 只声明 Legend、无显式 Axis → 默认 x/y 轴仍在 + legend
  it('legend_does_not_suppress_default_axes', () => {
    // 显式补两条默认 axis + legend，模拟 buildPlotSpec by-type 合并后的 spec：legend 与 axis 共存、互不抑制
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'ordinal', name: 'kindColor' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' }, color: { field: 'kind', scale: 'kindColor' } } }],
      guides: [
        { type: 'axis', dimension: 'x' },
        { type: 'axis', dimension: 'y' },
        { type: 'legend', channel: 'color', scale: 'kindColor' },
      ],
    });
    const outer = expandOf(spec, { d: ORDINAL_ROWS });
    // 默认 x/y 轴层仍在（≥2 轴层）+ legend 层在
    expect(axisLayersOf(outer).length).toBeGreaterThanOrEqual(2);
    expect(findLegendLayer(outer)).toBeDefined();
  });

  // 显式 Axis + Legend 共存
  it('explicit_axis_and_legend_coexist', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'ordinal', name: 'kindColor' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' }, color: { field: 'kind', scale: 'kindColor' } } }],
      guides: [
        { type: 'axis', dimension: 'x', grid: true },
        { type: 'legend', channel: 'color', scale: 'kindColor' },
      ],
    });
    const outer = expandOf(spec, { d: ORDINAL_ROWS });
    expect(axisLayersOf(outer).length).toBeGreaterThanOrEqual(1);
    expect(findLegendLayer(outer)).toBeDefined();
    expect(findMarkLayer(outer)).toBeDefined();
  });

  // P2 ⑩ 占位：position='right' → plotArea 右侧收窄、legend 落预留带（非 overlay / 出界）
  it('legend_right_narrows_plot_area', () => {
    // 对比：无 legend vs 有 right legend，mark 层的横向跨度应收窄（legend 预留右带）
    const noLegend = expandOf(
      PlotSpecSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        scales: [
          { type: 'linear', name: 'x' },
          { type: 'linear', name: 'y' },
        ],
        coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
        marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' } } }],
      }),
      { d: ORDINAL_ROWS },
    );
    const withLegend = expandOf(ordinalColorLegendSpec({ position: 'right' }), { d: ORDINAL_ROWS });

    const markXMax = (outer: IRScope): number => {
      const mark = findMarkLayer(outer) as IRScope;
      // point mark 的 Node position x
      const xs = labelsOf(mark)
        .map(n => n.position)
        .filter((p): p is [number, number] => Array.isArray(p))
        .map(p => p[0]);
      return xs.length > 0 ? Math.max(...xs) : 0;
    };
    // 有 legend 时数据点最大 x 应更靠左（plotArea 右侧被 legend 占走）
    expect(markXMax(withLegend)).toBeLessThan(markXMax(noLegend));
  });

  // P1 ⑥ descriptor 复用：size resolver 产 descriptor，legend 梯度符号读同一 descriptor
  //   → legend 最大档半径应落在 size resolver 的 range 上界附近（与 mark 实绘半径同源）
  it('size_legend_reuses_resolver_descriptor', () => {
    const outer = expandOf(sizeLegendSpec(), { d: CONTINUOUS_ROWS });
    const legend = findLegendLayer(outer);
    expect(legend).toBeDefined();
    // 梯度符号用 path / node 表示；这里弱断言：legend 至少有 swatch 几何与 mark 同帧（结构存在）
    expect(swatchPathsOf(legend as IRScope).length + labelsOf(legend as IRScope).length).toBeGreaterThan(0);
    // mark 层存在（resolver 同时驱动实绘 size 与 legend descriptor）
    expect(findMarkLayer(outer)).toBeDefined();
  });
});
