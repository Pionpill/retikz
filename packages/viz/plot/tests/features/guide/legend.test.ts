import type { IRChild, IRNode, IRScope } from '@retikz/core';
import { ChildSchema } from '@retikz/core';
import { DEFAULT_EPSILON } from '@retikz/math';
import { describe, expect, it } from 'vitest';

import type { PlotsLoweringOptions } from '../../../src/pipeline/expand';
import { lowerPlotWithDataArtifact } from '../../../src/pipeline/expand/lower';
import type { IRPlot } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

/**
 * Legend guide lowering 契约测试。
 *
 * legend 经 lowerPlots 下沉成一个 core scope（swatch / 色带 ramp / 分箱 / 梯度符号 + 标签），
 * 摆在 position 对应边的预留带内；本测试断言 **结构性** 产物（swatch 数、scope 存在、plotArea 宽度变化、
 * 默认 axis 是否仍在、descriptor 一致性），不硬编码像素。
 *
 * lowerLegend / resolver descriptor 双产出 / by-type axes / 占位均未实现 → 大量 case 此刻 fail，符合预期
 */

type Datasets = Record<string, Array<Record<string, unknown>>>;

const opts: PlotsLoweringOptions = { layout: { width: 480, height: 300 } };

const expandOf = (spec: IRPlot, datasets: Datasets, options: PlotsLoweringOptions = opts): IRScope => {
  return lowerPlotWithDataArtifact(spec, datasets, { ...options, textMeasurer: measureLabel }).child as IRScope;
};

/** 子节点谓词 */
const isScope = (child: IRChild): child is IRScope => child.type === 'scope';

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
 * 辨认 legend 内的 swatch / glyph Node（色块 / ramp 条 / size 圆点 / shape glyph）与标签 Node
 * @description legend 矩形改用 core Node（shape rectangle，修 PathSchema.min(2) 违规），不再是 Path。
 *   swatch Node 自带 shape 且无 text；label Node 有 text
 */
const swatchNodesOf = (scope: IRScope): Array<IRNode> =>
  scope.children.filter(isNode).filter(node => node.text === undefined);

const labelsOf = (scope: IRScope): Array<IRNode> =>
  scope.children.filter(isNode).filter(node => node.text !== undefined);

const sizeSymbolNodesOf = (scope: IRScope): Array<IRNode> =>
  scope.children.filter(isNode).filter(node => node.text === undefined && node.shape === 'circle');

const nodeMinimumSide = (node: IRNode): number => {
  const size = node.layout?.minimumSize;
  if (typeof size === 'number') return size;
  return Math.max(size?.width ?? 0, size?.height ?? 0, size?.default ?? 0);
};

/** 找 legend 层：约定 id 以 'legend' 开头（lowerLegend 给稳定 id）；退化用结构特征兜底（含 swatch Node + label Node） */
const findLegendLayer = (outer: IRScope): IRScope | undefined => {
  const scopes = allScopes(outer);
  const byId = scopes.find(scope => typeof scope.id === 'string' && scope.id.startsWith('legend'));
  if (byId) return byId;

  // 兜底：非 mark 层（无 nodeDefault.shape）且含 swatch Node + 标签 Node
  return scopes.find(
    scope => scope.defaults?.node?.shape === undefined && swatchNodesOf(scope).length > 0 && labelsOf(scope).length > 0,
  );
};

/** mark 层（point/sector 有 nodeDefault.shape；line/area 有 pathDefault.strokeWidth） */
const findMarkLayer = (outer: IRScope): IRScope | undefined =>
  allScopes(outer).find(
    scope => scope.defaults?.node?.shape !== undefined || scope.defaults?.path?.style?.strokeWidth !== undefined,
  );

/** axis 层：纯文字 nodeDefault（stroke='none'）+ 轴线 path，无 shape */
const axisLayersOf = (outer: IRScope): Array<IRScope> =>
  allScopes(outer).filter(scope => {
    const nodeDefault = scope.defaults?.node;
    return nodeDefault?.style?.stroke === 'none' && nodeDefault.shape === undefined;
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
const ordinalColorLegendSpec = (legend: Record<string, unknown> = {}): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
      { type: 'ordinal', name: 'kindColor' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [
      {
        type: 'point',
        encodings: {
          color: { field: 'kind', scale: 'kindColor' },
          position: { x: { field: 'lon' }, y: { field: 'lat' } },
        },
      },
    ],
    guides: [{ type: 'legend', channel: 'color', scale: 'kindColor', ...legend }],
  });

/** 连续 color 散点 + sequential color legend */
const sequentialColorLegendSpec = (): IRPlot =>
  PlotSchema.parse({
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
    marks: [
      {
        type: 'point',
        encodings: {
          color: { field: 'temperature', scale: 'tempColor' },
          position: { x: { field: 'lon' }, y: { field: 'lat' } },
        },
      },
    ],
    guides: [{ type: 'legend', channel: 'color', scale: 'tempColor', ticks: { count: 4 } }],
  });

/** size 散点 + size legend */
const sizeLegendSpec = (legend: Record<string, unknown> = {}, markProperties: Record<string, unknown> = {}): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [
      {
        type: 'point',
        properties: markProperties,
        encodings: { size: 'population', position: { x: { field: 'lon' }, y: { field: 'lat' } } },
      },
    ],
    guides: [{ type: 'legend', channel: 'size', ...legend }],
  });

const multiSizeLegendSpec = ({
  firstScale = 'sharedSize',
  secondScale = 'sharedSize',
  secondField = 'population',
  guideScale,
}: {
  firstScale?: string;
  secondScale?: string;
  secondField?: string;
  guideScale?: string;
} = {}): IRPlot => {
  const sizeScaleNames = [...new Set([firstScale, secondScale])];
  return PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
      ...sizeScaleNames.map(name => ({ type: 'sqrt' as const, name })),
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [
      {
        type: 'point',
        encodings: {
          size: { field: 'population', scale: firstScale },
          position: { x: { field: 'lon' }, y: { field: 'lat' } },
        },
      },
      {
        type: 'point',
        encodings: {
          size: { field: secondField, scale: secondScale },
          position: { x: { field: 'lon' }, y: { field: 'lat' } },
        },
      },
    ],
    guides: [{ type: 'legend', channel: 'size', ...(guideScale === undefined ? {} : { scale: guideScale }) }],
  });
};

const MULTI_SIZE_ROWS = CONTINUOUS_ROWS.map(row => ({ ...row, secondaryPopulation: row.population }));

/** shape 散点 + shape legend（categorical → glyph 调色板） */
const shapeLegendSpec = (legend: Record<string, unknown> = {}): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'point', encodings: { shape: 'kind', position: { x: { field: 'lon' }, y: { field: 'lat' } } } }],
    guides: [{ type: 'legend', channel: 'shape', ...legend }],
  });

/** sector（饼）+ ordinal color + color legend */
const SECTOR_SHARE = [
  { label: 'A', value: 3 },
  { label: 'B', value: 5 },
  { label: 'C', value: 2 },
];

const sectorColorLegendSpec = (): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    transform: [{ operation: { kind: 'stack', params: { y: 'value' } } }],
    coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
    scales: [
      { type: 'linear', name: 'a' },
      { type: 'linear', name: 'r' },
      { type: 'ordinal', name: 'sliceColor' },
    ],
    marks: [
      {
        type: 'interval',
        encodings: {
          bounds: { x: { from: { field: 'y0' }, to: { field: 'y1' } } },
          color: { field: 'label', scale: 'sliceColor' },
        },
        properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
      },
    ],
    guides: [{ type: 'legend', channel: 'color', scale: 'sliceColor' }],
  });

describe('lowerPlots legend — review 修复回归（sector color / shape glyph / scale 类型）', () => {
  // P1-1：sector（饼/环）的 color 编码同样要喂 color legend——此前 resolveColorLegend 跳过 sector
  it('扇区颜色图例为每个切片提供一个色块', () => {
    const outer = expandOf(sectorColorLegendSpec(), { d: SECTOR_SHARE });
    const legend = findLegendLayer(outer);

    expect(legend).toBeDefined();

    // 3 个 label（A/B/C）→ 3 个 swatch + 3 个标签
    expect(swatchNodesOf(legend as IRScope).length).toBe(3);
    expect(labelsOf(legend as IRScope).length).toBe(3);
  });

  // P1-2：shape legend 的 swatch 应是编码的 glyph 形状，而非清一色矩形
  it('形状图例样本使用编码字形而不是矩形', () => {
    const outer = expandOf(shapeLegendSpec(), { d: ORDINAL_ROWS });
    const legend = findLegendLayer(outer);

    expect(legend).toBeDefined();

    const shapes = swatchNodesOf(legend as IRScope).map(node => node.shape);

    // 3 类 → 3 个 glyph swatch；调色板 circle/rectangle/diamond，至少含一个非 rectangle（证实用了编码形状）
    expect(shapes.length).toBe(3);
    expect(shapes.some(shape => shape !== 'rectangle')).toBe(true);
  });

  it('形状图例保留绘图默认值中的结构化形状参考', () => {
    const pentagon = { type: 'polygon', params: { sides: 5, rotate: -90 } } as const;
    const spec = PlotSchema.parse({
      ...shapeLegendSpec(),
      defaultPlot: { palette: { shape: [pentagon, 'cross', 'circle'] } },
    });
    const legend = findLegendLayer(expandOf(spec, { d: ORDINAL_ROWS }));

    expect(legend).toBeDefined();
    expect(swatchNodesOf(legend as IRScope).map(node => node.shape)).toEqual([pentagon, 'cross', 'circle']);
  });

  it('形状图例字形默认不描边', () => {
    const outer = expandOf(shapeLegendSpec(), { d: ORDINAL_ROWS });
    const legend = findLegendLayer(outer);

    expect(legend).toBeDefined();

    const glyphs = swatchNodesOf(legend as IRScope);

    expect(glyphs.length).toBe(3);
    expect(glyphs.every(node => node.style?.stroke === 'none')).toBe(true);
    expect(glyphs.every(node => node.style?.strokeWidth === 0)).toBe(true);
  });

  it('形状图例字形使用标记填充颜色', () => {
    const outer = expandOf(shapeLegendSpec(), { d: ORDINAL_ROWS });
    const legend = findLegendLayer(outer);
    const mark = findMarkLayer(outer);

    expect(legend).toBeDefined();
    expect(mark).toBeDefined();

    const glyphs = swatchNodesOf(legend as IRScope);
    const markFill = mark?.defaults?.node?.style?.fill;

    expect(markFill).toBeDefined();
    expect(glyphs.every(node => node.style?.fill === markFill)).toBe(true);
  });

  it('形状图例符号大小样式控制字形框', () => {
    const outer = expandOf(shapeLegendSpec({ style: { symbolSize: 18 } }), { d: ORDINAL_ROWS });
    const legend = findLegendLayer(outer);

    expect(legend).toBeDefined();

    const glyphs = swatchNodesOf(legend as IRScope).filter(node => node.shape !== 'rectangle');

    expect(glyphs.length).toBeGreaterThan(0);
    expect(glyphs.every(node => nodeMinimumSide(node) === 18)).toBe(true);
  });

  // P2：color legend 绑到位置 linear scale（非颜色 scale）→ fail-loud，而非落空 ordinal 出空图例
  it('颜色图例绑定非颜色比例尺时明确报错', () => {
    expect(() => expandOf(ordinalColorLegendSpec({ scale: 'x' }), { d: ORDINAL_ROWS })).toThrow(/not a color scale/);
  });
});

describe('lowerPlots 传奇——幸福之路（契约）', () => {
  // 离散 swatch：每类一块 + 标签
  it('序数颜色图例每个类别一个样本', () => {
    const outer = expandOf(ordinalColorLegendSpec(), { d: ORDINAL_ROWS });
    const legend = findLegendLayer(outer);

    expect(legend).toBeDefined();

    // 3 个类别（A/B/C 去重）→ 3 个 swatch + 3 个标签
    const labels = labelsOf(legend as IRScope);

    expect(labels).toHaveLength(3);
    expect(labels.map(n => n.text).sort()).toEqual(['A', 'B', 'C']);
    expect(swatchNodesOf(legend as IRScope).length).toBeGreaterThanOrEqual(3);
  });

  it('序数图例文本节点默认为无描边或填充', () => {
    const outer = expandOf(ordinalColorLegendSpec({ title: 'Kind' }), { d: ORDINAL_ROWS });
    const legend = findLegendLayer(outer);

    expect(legend).toBeDefined();

    const labels = labelsOf(legend as IRScope);

    expect(labels.map(node => node.text).sort()).toEqual(['A', 'B', 'C', 'Kind']);
    expect(labels.every(node => node.style?.stroke === 'none')).toBe(true);
    expect(labels.every(node => node.style?.fill === 'none')).toBe(true);
    expect(labels.every(node => node.layout?.padding === 0)).toBe(true);
  });

  // 连续 ramp：色带 + nice 刻度
  it('顺序颜色图例连续斜坡', () => {
    const outer = expandOf(sequentialColorLegendSpec(), { d: CONTINUOUS_ROWS });
    const legend = findLegendLayer(outer);

    expect(legend).toBeDefined();

    // 连续 ramp：刻度标签数 > 1（非逐类 swatch），ticks.count 提示 4 档左右
    const labels = labelsOf(legend as IRScope);

    expect(labels.length).toBeGreaterThan(1);
    expect(labels.every(n => typeof n.text === 'string')).toBe(true);
  });

  it('斜坡图例刻度标签默认为无描边或填充', () => {
    const outer = expandOf(sequentialColorLegendSpec(), { d: CONTINUOUS_ROWS });
    const legend = findLegendLayer(outer);

    expect(legend).toBeDefined();

    const labels = labelsOf(legend as IRScope);

    expect(labels.length).toBeGreaterThan(1);
    expect(labels.every(node => node.style?.stroke === 'none')).toBe(true);
    expect(labels.every(node => node.style?.fill === 'none')).toBe(true);
    expect(labels.every(node => node.layout?.padding === 0)).toBe(true);
  });

  // size 梯度符号：几档代表圈 + 值
  it('尺寸图例毕业符号', () => {
    const outer = expandOf(sizeLegendSpec(), { d: CONTINUOUS_ROWS });
    const legend = findLegendLayer(outer);

    expect(legend).toBeDefined();

    // 梯度符号：≥2 档代表大小（nice 3 档左右）+ 值标签
    const labels = labelsOf(legend as IRScope);

    expect(labels.length).toBeGreaterThanOrEqual(2);
  });

  it('尺寸图例默认符号适合符号框内', () => {
    const outer = expandOf(sizeLegendSpec(), { d: CONTINUOUS_ROWS });
    const legend = findLegendLayer(outer);
    const swatches = swatchNodesOf(legend as IRScope);
    const symbols = sizeSymbolNodesOf(legend as IRScope);

    expect(symbols.length).toBeGreaterThanOrEqual(2);
    expect(swatches.every(node => node.shape === 'circle')).toBe(true);
    expect(Math.max(...symbols.map(nodeMinimumSide))).toBeLessThanOrEqual(14 + DEFAULT_EPSILON);
    expect(symbols.every(node => node.style?.stroke === 'none')).toBe(true);
    expect(symbols.every(node => node.style?.strokeWidth === 0)).toBe(true);
  });

  it('尺寸图例符号使用标记有效颜色', () => {
    const outer = expandOf(sizeLegendSpec({}, { color: '#d946ef' }), {
      d: CONTINUOUS_ROWS,
    });
    const legend = findLegendLayer(outer);
    const symbols = sizeSymbolNodesOf(legend as IRScope);

    expect(symbols.length).toBeGreaterThanOrEqual(2);
    expect(symbols.every(node => node.style?.fill === '#d946ef')).toBe(true);
  });

  it('尺寸图例的 symbolSize 样式控制适配框', () => {
    const outer = expandOf(sizeLegendSpec({ style: { symbolSize: 10 } }), { d: CONTINUOUS_ROWS });
    const legend = findLegendLayer(outer);
    const symbols = sizeSymbolNodesOf(legend as IRScope);

    expect(symbols.length).toBeGreaterThanOrEqual(2);
    expect(Math.max(...symbols.map(nodeMinimumSide))).toBeLessThanOrEqual(10 + DEFAULT_EPSILON);
  });

  it('大小图例保留保留描述符半径并保留空间', () => {
    const outer = expandOf(sizeLegendSpec({ style: { symbolFit: 'preserve' } }), { d: CONTINUOUS_ROWS });
    const legend = findLegendLayer(outer);
    const symbols = sizeSymbolNodesOf(legend as IRScope);

    expect(symbols.length).toBeGreaterThanOrEqual(2);
    expect(Math.max(...symbols.map(nodeMinimumSide))).toBeGreaterThan(14);

    const [first, second] = symbols;

    expect(first).toBeDefined();
    expect(second).toBeDefined();

    const yGap = Math.abs((second.position as [number, number])[1] - (first.position as [number, number])[1]);

    expect(yGap).toBeGreaterThanOrEqual((nodeMinimumSide(first) + nodeMinimumSide(second)) / 2 + 6);
  });

  it('主题图例符号大小被本地样式覆盖', () => {
    const themed = PlotSchema.parse({
      ...sizeLegendSpec({ style: { symbolSize: 10 } }),
      defaultPlot: { legend: { symbolSize: 18 } },
    });
    const outer = expandOf(themed, { d: CONTINUOUS_ROWS });
    const legend = findLegendLayer(outer);
    const symbols = sizeSymbolNodesOf(legend as IRScope);

    expect(symbols.length).toBeGreaterThanOrEqual(2);
    expect(Math.max(...symbols.map(nodeMinimumSide))).toBeLessThanOrEqual(10 + DEFAULT_EPSILON);
  });
});

describe('lowerPlots legend — 边界（contract）', () => {
  // 单类别 legend → 一个 swatch
  it('单类别传奇一个样本', () => {
    const outer = expandOf(ordinalColorLegendSpec(), { d: SINGLE_CATEGORY_ROWS });
    const legend = findLegendLayer(outer);

    expect(legend).toBeDefined();

    const labels = labelsOf(legend as IRScope);

    expect(labels).toHaveLength(1);
    expect(labels[0].text).toBe('A');
  });

  it('没有比例的尺寸图例拒绝多个比例标识', () => {
    expect(() =>
      expandOf(multiSizeLegendSpec({ firstScale: 'sizeA', secondScale: 'sizeB' }), { d: MULTI_SIZE_ROWS }),
    ).toThrow(/multiple scales/);
  });

  it('带刻度的尺寸图例选择准确的标识', () => {
    const outer = expandOf(multiSizeLegendSpec({ firstScale: 'sizeA', secondScale: 'sizeB', guideScale: 'sizeB' }), {
      d: MULTI_SIZE_ROWS,
    });

    expect(findLegendLayer(outer)).toBeDefined();
  });

  it.each([
    ['implicit selector', undefined],
    ['explicit selector', 'sharedSize'],
  ])('尺寸图例将等效的重复标识与 %s 合并', (_label, guideScale) => {
    const outer = expandOf(multiSizeLegendSpec({ guideScale }), { d: MULTI_SIZE_ROWS });

    expect(findLegendLayer(outer)).toBeDefined();
  });

  it.each([
    ['implicit selector', undefined],
    ['explicit selector', 'sharedSize'],
  ])('尺寸图例拒绝与 %s 冲突的重复标识', (_label, guideScale) => {
    expect(() =>
      expandOf(multiSizeLegendSpec({ secondField: 'secondaryPopulation', guideScale }), { d: MULTI_SIZE_ROWS }),
    ).toThrow(/conflicting size descriptors/);
  });

  // quantize / quantile 分箱标签：每档一区间标签
  it('quantile 图例显示分箱标签', () => {
    const spec = PlotSchema.parse({
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
      marks: [
        {
          type: 'point',
          encodings: {
            color: { field: 'density', scale: 'densColor' },
            position: { x: { field: 'lon' }, y: { field: 'lat' } },
          },
        },
      ],
      guides: [{ type: 'legend', channel: 'color', scale: 'densColor' }],
    });
    const outer = expandOf(spec, { d: QUANTILE_ROWS });
    const legend = findLegendLayer(outer);

    expect(legend).toBeDefined();

    // 分箱 → 多个区间 swatch + 区间标签
    expect(swatchNodesOf(legend as IRScope).length).toBeGreaterThanOrEqual(1);
    expect(labelsOf(legend as IRScope).length).toBeGreaterThanOrEqual(1);
  });

  // 空数据 → legend 不崩（空或退化）
  it('空数据图例不会崩溃', () => {
    expect(() => expandOf(ordinalColorLegendSpec(), { d: [] })).not.toThrow();
  });
});

describe('lowerPlots legend — 错误路径（contract）', () => {
  // 多 color scale 未给 scale 消歧 → fail-loud
  it('多个颜色比例尺存在歧义时明确报错', () => {
    const spec = PlotSchema.parse({
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
        {
          type: 'point',
          encodings: {
            color: { field: 'kind', scale: 'colorA' },
            position: { x: { field: 'lon' }, y: { field: 'lat' } },
          },
        },
        {
          type: 'point',
          encodings: {
            color: { field: 'kind', scale: 'colorB' },
            position: { x: { field: 'lon' }, y: { field: 'lat' } },
          },
        },
      ],
      // channel=color 无 scale → 两个 color scale 歧义
      guides: [{ type: 'legend', channel: 'color' }],
    });

    expect(() => expandOf(spec, { d: ORDINAL_ROWS })).toThrow();
  });

  // legend 绑不存在的 scale name → fail-loud
  it('图例引用未知比例尺名称时明确报错', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'ordinal', name: 'kindColor' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          encodings: {
            color: { field: 'kind', scale: 'kindColor' },
            position: { x: { field: 'lon' }, y: { field: 'lat' } },
          },
        },
      ],
      guides: [{ type: 'legend', channel: 'color', scale: 'doesNotExist' }],
    });

    expect(() => expandOf(spec, { d: ORDINAL_ROWS })).toThrow();
  });
});

describe('lowerPlots legend — 交互（contract 修 P1 ⑦ / P2 ⑩ / P1 ⑥）', () => {
  // 修 P1 ⑦：Legend 不抑制默认 axes —— point mark + 只声明 Legend、无显式 Axis → 默认 x/y 轴仍在 + legend
  it('图例不抑制默认轴', () => {
    // 显式补两条默认 axis + legend，模拟 buildPlotIR by-type 合并后的 spec：legend 与 axis 共存、互不抑制
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'ordinal', name: 'kindColor' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          encodings: {
            color: { field: 'kind', scale: 'kindColor' },
            position: { x: { field: 'lon' }, y: { field: 'lat' } },
          },
        },
      ],
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
  it('显式轴和图例共存', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'ordinal', name: 'kindColor' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          encodings: {
            color: { field: 'kind', scale: 'kindColor' },
            position: { x: { field: 'lon' }, y: { field: 'lat' } },
          },
        },
      ],
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
  it('右侧图例缩窄绘图区', () => {
    // 对比：无 legend vs 有 right legend，mark 层的横向跨度应收窄（legend 预留右带）
    const noLegend = expandOf(
      PlotSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        scales: [
          { type: 'linear', name: 'x' },
          { type: 'linear', name: 'y' },
        ],
        coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
        marks: [{ type: 'point', encodings: { position: { x: { field: 'lon' }, y: { field: 'lat' } } } }],
      }),
      { d: ORDINAL_ROWS },
    );
    const withLegend = expandOf(ordinalColorLegendSpec({ position: 'right' }), { d: ORDINAL_ROWS });

    const markXMax = (outer: IRScope): number => {
      const mark = findMarkLayer(outer) as IRScope;

      // point mark 的 Node position x（color 编码时 Node 落在嵌套子 scope，故递归收集所有 Node）
      const collectNodes = (scope: IRScope): Array<IRNode> =>
        scope.children.flatMap(child => (isScope(child) ? collectNodes(child) : isNode(child) ? [child] : []));
      const xs = collectNodes(mark)
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
  it('大小图例重用解析器描述符', () => {
    const outer = expandOf(sizeLegendSpec(), { d: CONTINUOUS_ROWS });
    const legend = findLegendLayer(outer);

    expect(legend).toBeDefined();

    // 梯度符号用 Node 表示；这里弱断言：legend 至少有 swatch 几何与 mark 同帧（结构存在）
    expect(swatchNodesOf(legend as IRScope).length + labelsOf(legend as IRScope).length).toBeGreaterThan(0);

    // mark 层存在（resolver 同时驱动实绘 size 与 legend descriptor）
    expect(findMarkLayer(outer)).toBeDefined();
  });
});

/** quantile 分箱 color legend spec（ChildSchema 回归复用） */
const quantileColorLegendSpec = (): IRPlot =>
  PlotSchema.parse({
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
    marks: [
      {
        type: 'point',
        encodings: {
          color: { field: 'density', scale: 'densColor' },
          position: { x: { field: 'lon' }, y: { field: 'lat' } },
        },
      },
    ],
    guides: [{ type: 'legend', channel: 'color', scale: 'densColor' }],
  });

describe('lowerPlots legend — ramp 刻度域取配置 domain', () => {
  // 数据 temperature 仅 [5,30]，显式 domain [0,100]；ramp 刻度应落 domain（取色基准同源），非数据 extent
  const explicitDomainRampSpec = (): IRPlot =>
    PlotSchema.parse({
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
        { type: 'sequential', name: 'tempColor', domain: [0, 100] },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          encodings: {
            color: { field: 'temperature', scale: 'tempColor' },
            position: { x: { field: 'lon' }, y: { field: 'lat' } },
          },
        },
      ],
      guides: [{ type: 'legend', channel: 'color', scale: 'tempColor', ticks: { count: 4 } }],
    });

  it('显式域斜坡刻度遵循域而不是数据范围', () => {
    const outer = expandOf(explicitDomainRampSpec(), { d: CONTINUOUS_ROWS });
    const legend = findLegendLayer(outer);
    const labelNumbers = labelsOf(legend as IRScope)
      .map(node => (typeof node.text === 'string' ? node.text : ''))
      .map(text => Number(text.replace(/[^0-9.-]/g, '')))
      .filter(value => Number.isFinite(value));

    // 数据 extent 上界仅 30；domain 上界 100 → 应出现 > 30 的刻度（证实刻度跟 domain 而非数据）
    expect(Math.max(...labelNumbers)).toBeGreaterThan(30);
  });

  it('时间斜坡显​​式字符串刻度保持有限的标签位置', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: {
        reference: 'd',
        model: [
          { name: 'lon', type: 'continuous' },
          { name: 'lat', type: 'continuous' },
          { name: 'date', type: 'temporal' },
        ],
      },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        {
          type: 'sequential',
          name: 'dateColor',
          domain: [Date.UTC(2026, 0, 1), Date.UTC(2026, 0, 3)],
        },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          encodings: {
            color: { field: 'date', scale: 'dateColor' },
            position: { x: { field: 'lon' }, y: { field: 'lat' } },
          },
        },
      ],
      guides: [
        {
          type: 'legend',
          channel: 'color',
          scale: 'dateColor',
          ticks: { values: ['2026-01-01T00:00:00.000Z', '2026-01-03T00:00:00.000Z'] },
          tickLabels: { format: '%Y-%m-%d' },
        },
      ],
    });
    const rows = [
      { lon: 0, lat: 0, date: '2026-01-01T00:00:00.000Z' },
      { lon: 1, lat: 1, date: '2026-01-03T00:00:00.000Z' },
    ];

    const outer = expandOf(spec, { d: rows });
    const legend = findLegendLayer(outer);
    const labels = labelsOf(legend as IRScope);

    expect(labels.map(node => node.text)).toEqual(['2026-01-01', '2026-01-03']);
    expect(
      labels
        .map(node => node.position as [number, number])
        .flat()
        .every(Number.isFinite),
    ).toBe(true);
  });
});

describe('lowerPlots legend — core schema 合法性回归（修 PathSchema.min(2) 违规）', () => {
  // legend 下沉产物（整个 legend scope）必须通过 core ChildSchema 校验——
  //   早期 swatch 用单 step rectangle Path 违反 PathSchema.children.min(2)，schema 校验会拒绝
  //   改用 core Node（shape rectangle）后，整个 legend scope 应 100% 合法可序列化
  const assertLegendSchemaValid = (outer: IRScope): void => {
    const legend = findLegendLayer(outer);

    expect(legend).toBeDefined();

    const result = ChildSchema.safeParse(legend);

    expect(result.success).toBe(true);
  };

  it('序号样本图例传递子 schema', () => {
    assertLegendSchemaValid(expandOf(ordinalColorLegendSpec(), { d: ORDINAL_ROWS }));
  });

  it('单类别样本图例传递子 schema', () => {
    assertLegendSchemaValid(expandOf(ordinalColorLegendSpec(), { d: SINGLE_CATEGORY_ROWS }));
  });

  it('顺序斜坡图例传递子 schema', () => {
    assertLegendSchemaValid(expandOf(sequentialColorLegendSpec(), { d: CONTINUOUS_ROWS }));
  });

  it('quantile 分箱图例通过子项 schema 校验', () => {
    assertLegendSchemaValid(expandOf(quantileColorLegendSpec(), { d: QUANTILE_ROWS }));
  });

  it('大小分级图例传递子 schema', () => {
    assertLegendSchemaValid(expandOf(sizeLegendSpec(), { d: CONTINUOUS_ROWS }));
  });
});

describe('复合分类图例符号', () => {
  it('覆盖来自绑定比例和显式绘制的线和点颜色', () => {
    const spec = ordinalColorLegendSpec({
      symbols: [
        { kind: 'line', paint: '#112233' },
        { kind: 'point', scale: 'kindColor' },
      ],
    });
    const layer = findLegendLayer(expandOf(spec, { d: ORDINAL_ROWS }));

    expect(layer).toBeDefined();

    const symbols = swatchNodesOf(layer!);

    expect(symbols).toHaveLength(6);
    expect(symbols.filter(node => node.shape === 'rectangle').map(node => node.style?.fill)).toEqual([
      '#112233',
      '#112233',
      '#112233',
    ]);
    expect(symbols.filter(node => node.shape === 'circle')).toHaveLength(3);
  });

  it('拒绝解析时没有颜色源的符号', () => {
    expect(() => ordinalColorLegendSpec({ symbols: [{ kind: 'point' }] })).toThrow();
  });

  it('拒绝缺失的符号比例和连续的图例', () => {
    expect(() =>
      expandOf(ordinalColorLegendSpec({ symbols: [{ kind: 'line', scale: 'missing' }] }), { d: ORDINAL_ROWS }),
    ).toThrow(/unknown scale/);

    const spec = sequentialColorLegendSpec();
    spec.guides = [
      { type: 'legend', channel: 'color', scale: 'tempColor', symbols: [{ kind: 'point', paint: '#112233' }] },
    ];

    expect(() => expandOf(spec, { d: CONTINUOUS_ROWS })).toThrow(/categorical/);
  });
});

it('拒绝复合符号中不同的有序类别域', () => {
  const spec = ordinalColorLegendSpec({ symbols: [{ kind: 'point', scale: 'otherColor' }] });
  spec.scales.push({ type: 'ordinal', name: 'otherColor', domain: ['C', 'B', 'A'] });
  spec.marks.push({
    type: 'point',
    encodings: {
      color: { field: 'kind', scale: 'otherColor' },
      position: { x: { field: 'lon' }, y: { field: 'lat' } },
    },
  });

  expect(() => expandOf(spec, { d: ORDINAL_ROWS })).toThrow(/same ordered categorical domain/);
});
it.each([{ step: 0 }, { step: -1 }, { offset: -1 }, { step: 1.5 }])('拒绝无效的序数调色板索引 %j', rangeIndex => {
  const spec = ordinalColorLegendSpec();

  expect(() => PlotSchema.parse({ ...spec, scales: [{ type: 'ordinal', name: 'bad', rangeIndex }] })).toThrow();
});
it('将序数索引步骤应用于有效主题调色板', () => {
  const spec = ordinalColorLegendSpec();
  spec.scales = spec.scales.map(scale =>
    scale.type === 'ordinal' ? { ...scale, rangeIndex: { step: 2, offset: 1 } } : scale,
  );
  spec.defaultPlot = { palette: { categorical: ['#111111', '#222222', '#333333'] } };
  const legend = findLegendLayer(expandOf(spec, { d: ORDINAL_ROWS }));

  expect(swatchNodesOf(legend!).map(node => node.style?.fill)).toEqual(['#222222', '#111111', '#333333']);
});
