import type { IRPlot, IRPlotLegendGuide, IRPlotScale } from '@retikz/plot';

import { Plot } from '@retikz/plot-react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { cities } from './legend.data';
import { legendColorFormsControls, previewControlContract } from './legend-color-forms.en.controls';

/** 注册回退使用的颜色图例形态控件 */
export const previewControls = legendColorFormsControls;

type LegendColorFormsValues = PreviewControlValuesFor<typeof legendColorFormsControls>;

/** 根据当前形态构造颜色比例尺 */
const buildColorScale = (values: LegendColorFormsValues): IRPlotScale => {
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

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const form = values.form;
  const legend: IRPlotLegendGuide = {
    type: 'legend',
    channel: 'color',
    scale: 'legendColor',
    title: form === 'swatch' ? 'Region' : form === 'ramp' ? 'Population' : 'Population range',
    position: values.position,
    orient: form === 'swatch' && values.orient !== 'auto' ? values.orient : undefined,
    ticks: form === 'ramp' ? { count: values.tickCount } : undefined,
    tickLabels: values.showLabels ? (form === 'ramp' ? { format: values.format } : {}) : false,
    style:
      form === 'swatch'
        ? { swatchSize: values.swatchSize }
        : form === 'ramp'
          ? { rampLength: values.rampLength, rampThickness: values.rampThickness }
          : undefined,
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

  return (
    <Plot spec={spec} data={{ d: cities }} width={380} height={260} style={{ maxWidth: '100%', height: 'auto' }} />
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 在固定散点图中比较分类、连续与分箱颜色图例 */
export default controlledPreview.Component;
