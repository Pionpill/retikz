import type { IRPlot, IRPlotLegendGuide, IRPlotScale } from '@retikz/plot';
import { Plot } from '@retikz/plot-react';

import type { Lang } from '@/i18n';

import { legendColorFormsI18n } from './legend-color-forms.i18n';
import { cities } from './legend.data';

const buildColorScale = (values: LegendColorFormsPreviewValues): IRPlotScale => {
  if (values.form === 'swatch') {
    return { type: 'ordinal', name: 'legendColor' };
  }
  if (values.form === 'binned') {
    return {
      type: 'quantize',
      name: 'legendColor',
      domain: [0, 600],
      count: values.binCount,
      scheme: values.scheme,
    };
  }
  return {
    type: 'sequential',
    name: 'legendColor',
    domain: [0, 600],
    scheme: 'magma',
  };
};

/** 图形参数 */
export type LegendColorFormsPreviewValues = {
  form: 'swatch' | 'ramp' | 'binned';
  position: 'right' | 'left' | 'top' | 'bottom';
  orient: 'auto' | 'vertical' | 'horizontal';
  tickCount: number;
  showLabels: boolean;
  format: '~s' | '.0f' | '.1f';
  swatchSize: number;
  rampLength: number;
  rampThickness: number;
  binCount: number;
  scheme: 'blues' | 'greens' | 'magma';
};

/** 绘制示例图形 */
export const LegendColorFormsPreview = (values: LegendColorFormsPreviewValues, lang: Lang) => {
  const i18n = legendColorFormsI18n[lang];
  const form = values.form;
  const legend: IRPlotLegendGuide = {
    type: 'legend',
    channel: 'color',
    scale: 'legendColor',
    title: form === 'swatch' ? i18n.region : form === 'ramp' ? i18n.population : i18n.populationRange,
    position: values.position,
    ...(form === 'swatch' && values.orient !== 'auto' ? { orient: values.orient } : {}),
    ...(form === 'ramp' ? { ticks: { count: values.tickCount } } : {}),
    tickLabels: values.showLabels ? (form === 'ramp' ? { format: values.format } : {}) : false,
    ...(form === 'swatch'
      ? { style: { swatchSize: values.swatchSize } }
      : form === 'ramp'
        ? { style: { rampLength: values.rampLength, rampThickness: values.rampThickness } }
        : {}),
  };
  const spec: IRPlot = {
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }, buildColorScale(values)],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [
      {
        type: 'point',
        color: {
          kind: 'field',
          value: form === 'swatch' ? 'region' : 'pop',
          scale: 'legendColor',
        },
        size: { kind: 'constant', value: 6 },
        encoding: { x: { field: 'lng' }, y: { field: 'lat' } },
      },
    ],
    guides: [{ type: 'axis', dimension: 'x' }, { type: 'axis', dimension: 'y', grid: true }, legend],
  };

  return <Plot spec={spec} data={{ d: cities }} width={380} height={260} />;
};
