import type { ExternalDatasets } from '@retikz/data';
import type { IRPlotTransform } from '@retikz/plot';
import type { IRPlotSpec } from '@retikz/plot';

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

export const polarShareData: ExternalDatasets = {
  share: [
    { label: 'A', value: 30 },
    { label: 'B', value: 50 },
    { label: 'C', value: 20 },
  ],
};

export const createPolarPieSpec = (
  reference = 'share',
  scales: PolarScaleNames = { angle: 'angle', radius: 'radius', color: 'color' },
  innerRadius = 0,
): IRPlotSpec => ({
  namespace: 'plot',
  type: 'plot',
  data: { reference },
  transform: [{ kind: 'stack', y: 'value' }],
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

export const createPolarPulledSpec = (): IRPlotSpec => ({
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

export const createPolarRadialBarSpec = (): IRPlotSpec => ({
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

export const histogramData: ExternalDatasets = {
  s: [{ m: 0 }, { m: 1 }, { m: 3 }, { m: 5 }, { m: 8 }, { m: 9 }],
};

export const createHistogramSpec = (
  reference = 's',
  scales: CartesianScaleNames = { x: 'x', y: 'y' },
  step = 2,
): IRPlotSpec => ({
  namespace: 'plot',
  type: 'plot',
  data: { reference },
  transform: [{ kind: 'bin', field: 'm', step }],
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

export const densityData: ExternalDatasets = {
  samples: [
    { species: 'A', value: 0 },
    { species: 'A', value: 4 },
    { species: 'B', value: 10 },
    { species: 'B', value: 14 },
  ],
};

export type DensitySpecOptions = {
  bandwidth?: { kind: 'value'; value: number };
  fillOpacity?: number;
  sampleCount?: number;
  scales?: CartesianScaleNames;
};

export const createDensityAreaSpec = (reference = 'samples', options: DensitySpecOptions = {}): IRPlotSpec => {
  const scales = options.scales ?? { x: 'x', y: 'y', color: 'color' };
  return {
    namespace: 'plot',
    type: 'plot',
    data: { reference },
    transform: [
      {
        kind: 'density',
        field: 'value',
        groupBy: ['species'],
        ...(options.bandwidth ? { bandwidth: options.bandwidth } : {}),
        sampleCount: options.sampleCount ?? 8,
        xAs: 'densityX',
        densityAs: 'density',
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
        fill: { kind: 'constant', value: '#60a5fa' },
        ...(options.fillOpacity == null
          ? {}
          : { fillOpacity: { kind: 'constant' as const, value: options.fillOpacity } }),
        encoding: {
          x: { field: 'densityX' },
          y: { field: 'density' },
          ...(scales.color ? { color: { field: 'species', scale: scales.color } } : {}),
        },
      },
    ],
    guides: [],
  };
};

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

export type SmoothSpecOptions = {
  method?: { kind: 'linear' };
  sampleCount?: number;
  scales?: Required<CartesianScaleNames>;
};

export const createSmoothTrendSpec = (reference = 'samples', options: SmoothSpecOptions = {}): IRPlotSpec => {
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
            kind: 'smooth',
            x: 'time',
            y: 'value',
            groupBy: ['series'],
            ...(options.method ? { method: options.method } : {}),
            sampleCount: options.sampleCount ?? 8,
            xAs: 'trendX',
            yAs: 'trendY',
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

export const boxplotSummary: IRPlotTransform = {
  kind: 'summarize',
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
};

export const boxplotOutside: IRPlotTransform = {
  kind: 'select',
  groupBy: ['group'],
  selector: {
    kind: 'outside-quantile-band',
    field: 'value',
    lowerP: 0.25,
    upperP: 0.75,
    boundary: { kind: 'spread', factor: 1.5 },
  },
};

export const createBoxplotCompositionSpec = (
  reference = 'samples',
  scales: CartesianScaleNames = { x: 'x', y: 'y' },
): IRPlotSpec => ({
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
      transform: [boxplotSummary],
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
      transform: [boxplotSummary],
      extentField: 'boxX0',
      extentToField: 'boxX1',
      encoding: { y: { field: 'median' } },
    },
    {
      type: 'reference',
      transform: [boxplotSummary],
      extentField: 'whiskerMin',
      extentToField: 'whiskerMax',
      encoding: { x: { field: 'boxX' } },
    },
    { type: 'point', transform: [boxplotOutside], encoding: { x: { field: 'boxX' }, y: { field: 'value' } } },
  ],
  guides: [],
});
