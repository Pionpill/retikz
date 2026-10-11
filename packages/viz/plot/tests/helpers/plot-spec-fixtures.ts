import type { ExternalDatasets, IRDataTransform } from '@retikz/data';
import type { IRPlot } from '@retikz/plot';

type CartesianScaleNames = {
  x: string;
  y: string;
  color?: string;
};

type PolarScaleNames = {
  angle: string;
  radius: string;
  color: string;
};

/** 用于饼图及径向柱图测试的三类占比数据 */
export const polarShareData: ExternalDatasets = {
  share: [
    { label: 'A', value: 30 },
    { label: 'B', value: 50 },
    { label: 'C', value: 20 },
  ],
};

/** 组合堆叠变换与极坐标区间图元，生成可调整内半径的饼图测试输入 */
export const createPolarPieSpec = (
  reference = 'share',
  scales: PolarScaleNames = { angle: 'angle', radius: 'radius', color: 'color' },
  innerRadius = 0,
): IRPlot => ({
  namespace: 'plot',
  type: 'plot',
  data: { reference },
  transform: [{ operation: { kind: 'stack', params: { y: 'value' } } }],
  scales: [
    { type: 'linear', name: scales.angle },
    { type: 'linear', name: scales.radius },
    { type: 'ordinal', name: scales.color },
  ],
  coordinate: {
    type: 'polar2D',
    angle: scales.angle,
    radius: scales.radius,
    startAngle: 0,
    endAngle: 360,
    innerRadius,
  },
  marks: [
    {
      type: 'interval',
      bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } },
      encoding: { color: { field: 'label', scale: scales.color } },
    },
  ],
  guides: [],
});

/** 生成按 offset 字段沿径向拉出扇区的饼图测试输入 */
export const createPolarPulledSpec = (): IRPlot => ({
  ...createPolarPieSpec(),
  marks: [
    {
      type: 'interval',
      bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } },
      pull: { kind: 'field', value: 'offset' },
      encoding: { color: { field: 'label', scale: 'color' } },
    },
  ],
});

/** 生成角度为分类带、半径为数值的径向柱图测试输入 */
export const createPolarRadialBarSpec = (): IRPlot => ({
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'share' },
  scales: [
    { type: 'band', name: 'angle' },
    { type: 'linear', name: 'radius' },
    { type: 'ordinal', name: 'color' },
  ],
  coordinate: { type: 'polar2D', angle: 'angle', radius: 'radius', startAngle: 0, endAngle: 360, innerRadius: 0 },
  marks: [
    {
      type: 'interval',
      encoding: { x: { field: 'label' }, y: { field: 'value' }, color: { field: 'label', scale: 'color' } },
    },
  ],
  guides: [],
});

/** 覆盖多个步长分箱区间的直方图测试数据 */
export const histogramData: ExternalDatasets = {
  s: [{ m: 0 }, { m: 1 }, { m: 3 }, { m: 5 }, { m: 8 }, { m: 9 }],
};

/** 组合分箱变换与区间图元，生成可调整步长的直方图测试输入 */
export const createHistogramSpec = (
  reference = 's',
  scales: CartesianScaleNames = { x: 'x', y: 'y' },
  step = 2,
): IRPlot => ({
  namespace: 'plot',
  type: 'plot',
  data: { reference },
  transform: [{ operation: { kind: 'bin', params: { field: 'm', step } } }],
  scales: [
    { type: 'linear', name: scales.x },
    { type: 'linear', name: scales.y },
  ],
  coordinate: { type: 'cartesian2D', x: scales.x, y: scales.y },
  marks: [
    {
      type: 'interval',
      bounds: { x: { kind: 'extent', from: 'binStart', to: 'binEnd' } },
      encoding: { y: { field: 'binCount' } },
    },
  ],
  guides: [],
});

/** 用于分组密度估计测试的两组数值样本 */
export const densityData: ExternalDatasets = {
  samples: [
    { species: 'A', value: 0 },
    { species: 'A', value: 4 },
    { species: 'B', value: 10 },
    { species: 'B', value: 14 },
  ],
};

/** 控制密度面积图测试的估计、采样及外观参数 */
export type DensityOptions = {
  /** 覆盖测试密度估计的固定带宽 */
  bandwidth?: {
    /** 指定显式固定带宽 */
    kind: 'value';
    /** 密度估计使用的带宽数值 */
    value: number;
  };
  /** 覆盖测试面积图的填充透明度 */
  fillOpacity?: number;
  /**
   * 密度曲线采样数量
   * @default 8
   */
  sampleCount?: number;
  /**
   * 测试中位置与颜色尺度的名称
   * @default { x: 'x', y: 'y', color: 'color' }
   */
  scales?: CartesianScaleNames;
};

/** 按 species 分组估计密度并以闭合面积路径呈现 */
export const createDensityAreaSpec = (reference = 'samples', options: DensityOptions = {}): IRPlot => {
  const scales = options.scales ?? { x: 'x', y: 'y', color: 'color' };
  return {
    namespace: 'plot',
    type: 'plot',
    data: { reference },
    transform: [
      {
        operation: {
          kind: 'density',
          params: {
            field: 'value',
            groupBy: ['species'],
            ...(options.bandwidth ? { bandwidth: options.bandwidth } : {}),
            sampleCount: options.sampleCount ?? 8,
            xAs: 'densityX',
            densityAs: 'density',
          },
        },
      },
    ],
    scales: [
      { type: 'linear', name: scales.x },
      { type: 'linear', name: scales.y },
      ...(scales.color ? [{ type: 'ordinal' as const, name: scales.color }] : []),
    ],
    coordinate: { type: 'cartesian2D', x: scales.x, y: scales.y },
    marks: [
      {
        type: 'path',
        series: 'species',
        order: 'densityX',
        closure: { kind: 'baseline', baseline: 0 },
        ...(options.fillOpacity == null
          ? {}
          : { fillOpacity: { kind: 'constant' as const, value: options.fillOpacity } }),
        encoding: {
          x: { field: 'densityX' },
          y: { field: 'density' },
          ...(scales.color ? { color: { field: 'species', scale: scales.color } } : {}),
        },
        fill: { kind: 'constant', value: '#60a5fa' },
      },
    ],
    guides: [],
  };
};

/** 用于分组趋势拟合测试的递增与递减序列 */
export const smoothData: ExternalDatasets = {
  samples: [
    { series: 'A', time: 0, value: 1 },
    { series: 'A', time: 1, value: 3 },
    { series: 'A', time: 2, value: 5 },
    { series: 'B', time: 0, value: 10 },
    { series: 'B', time: 1, value: 8 },
    { series: 'B', time: 2, value: 6 },
  ],
};

/** 控制趋势图测试的拟合方法、采样数量与尺度名称 */
export type SmoothOptions = {
  /** 覆盖测试趋势拟合的方法 */
  method?: {
    /** 选择线性趋势拟合 */
    kind: 'linear';
  };
  /**
   * 趋势拟合曲线的采样数量
   * @default 8
   */
  sampleCount?: number;
  /**
   * 测试中位置与颜色尺度的名称
   * @default { x: 'x', y: 'y', color: 'color' }
   */
  scales?: Required<CartesianScaleNames>;
};

/** 组合原始散点与逐组拟合路径，验证数据层和趋势层共同绘制 */
export const createSmoothTrendSpec = (reference = 'samples', options: SmoothOptions = {}): IRPlot => {
  const scales = options.scales ?? { x: 'x', y: 'y', color: 'color' };
  return {
    namespace: 'plot',
    type: 'plot',
    data: { reference },
    scales: [
      { type: 'linear', name: scales.x },
      { type: 'linear', name: scales.y },
      { type: 'ordinal', name: scales.color },
    ],
    coordinate: { type: 'cartesian2D', x: scales.x, y: scales.y },
    marks: [
      {
        type: 'point',
        encoding: { x: { field: 'time' }, y: { field: 'value' }, color: { field: 'series', scale: scales.color } },
      },
      {
        type: 'path',
        transform: [
          {
            operation: {
              kind: 'smooth',
              params: {
                x: 'time',
                y: 'value',
                groupBy: ['series'],
                ...(options.method ? { method: options.method } : {}),
                sampleCount: options.sampleCount ?? 8,
                xAs: 'trendX',
                yAs: 'trendY',
              },
            },
          },
        ],
        series: 'series',
        order: 'trendX',
        encoding: { x: { field: 'trendX' }, y: { field: 'trendY' }, color: { field: 'series', scale: scales.color } },
      },
    ],
    guides: [],
  };
};

/** 包含两个分组及各自离群值的箱线图测试数据 */
export const boxplotData: ExternalDatasets = {
  samples: [
    { group: 'A', boxX: 1, boxX0: 0.74, boxX1: 1.26, value: 1 },
    { group: 'A', boxX: 1, boxX0: 0.74, boxX1: 1.26, value: 2 },
    { group: 'A', boxX: 1, boxX0: 0.74, boxX1: 1.26, value: 3 },
    { group: 'A', boxX: 1, boxX0: 0.74, boxX1: 1.26, value: 4 },
    { group: 'A', boxX: 1, boxX0: 0.74, boxX1: 1.26, value: 20 },
    { group: 'B', boxX: 2, boxX0: 1.74, boxX1: 2.26, value: 4 },
    { group: 'B', boxX: 2, boxX0: 1.74, boxX1: 2.26, value: 5 },
    { group: 'B', boxX: 2, boxX0: 1.74, boxX1: 2.26, value: 6 },
    { group: 'B', boxX: 2, boxX0: 1.74, boxX1: 2.26, value: 7 },
    { group: 'B', boxX: 2, boxX0: 1.74, boxX1: 2.26, value: 30 },
  ],
};

/** 按组生成四分位区间、中位数及 1.5 倍四分位距须线的测试变换 */
export const boxplotSummary: IRDataTransform = {
  kind: 'summarize',
  params: {
    groupBy: ['group', 'boxX', 'boxX0', 'boxX1'],
    metrics: [
      {
        kind: 'quantile-band',
        field: 'value',
        lowerP: 0.25,
        upperP: 0.75,
        outputs: {
          lower: 'boxLow',
          upper: 'boxHigh',
          points: [{ p: 0.5, as: 'median' }],
          whiskerMin: 'whiskerMin',
          whiskerMax: 'whiskerMax',
        },
        whisker: { kind: 'spread', factor: 1.5 },
      },
    ],
  },
};

/** 按组选择 1.5 倍四分位距边界之外的测试数据行 */
export const boxplotOutside: IRDataTransform = {
  kind: 'select',
  params: {
    groupBy: ['group'],
    selector: {
      kind: 'outside-quantile-band',
      field: 'value',
      lowerP: 0.25,
      upperP: 0.75,
      boundary: { kind: 'spread', factor: 1.5 },
    },
  },
};

/** 组合区间、参考线与离群散点，生成箱线图测试输入 */
export const createBoxplotComposition = (
  reference = 'samples',
  scales: CartesianScaleNames = { x: 'x', y: 'y' },
): IRPlot => ({
  namespace: 'plot',
  type: 'plot',
  data: { reference },
  scales: [
    { type: 'linear', name: scales.x },
    { type: 'linear', name: scales.y },
  ],
  coordinate: { type: 'cartesian2D', x: scales.x, y: scales.y },
  marks: [
    {
      type: 'interval',
      transform: [{ operation: boxplotSummary }],
      bounds: {
        x: { kind: 'extent', from: 'boxX0', to: 'boxX1' },
        y: { kind: 'extent', from: 'boxLow', to: 'boxHigh' },
      },
      fill: { kind: 'constant', value: '#93c5fd' },
      fillOpacity: { kind: 'constant', value: 0.32 },
      encoding: { x: { field: 'boxX' }, y: { field: 'boxHigh' } },
    },
    {
      type: 'reference',
      transform: [{ operation: boxplotSummary }],
      extentField: 'boxX0',
      extentToField: 'boxX1',
      encoding: { y: { field: 'median' } },
    },
    {
      type: 'reference',
      transform: [{ operation: boxplotSummary }],
      extentField: 'whiskerMin',
      extentToField: 'whiskerMax',
      encoding: { x: { field: 'boxX' } },
    },
    {
      type: 'point',
      transform: [{ operation: boxplotOutside }],
      encoding: { x: { field: 'boxX' }, y: { field: 'value' } },
    },
  ],
  guides: [],
});
