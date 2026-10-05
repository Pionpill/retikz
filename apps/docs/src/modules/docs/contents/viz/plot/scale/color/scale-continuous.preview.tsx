import type { IRPlot, IRPlotScale } from '@retikz/plot';
import { Plot } from '@retikz/plot-react';

import type { previewControlContract } from './scale-continuous.controls';
import { colorValues } from './scale-continuous.data';

const buildColorScale = (values: typeof previewControlContract.canonicalValues): IRPlotScale => {
  if (values.scaleType === 'diverging') {
    return {
      type: 'diverging',
      name: 'color',
      domain: [-50, values.midpoint, 50],
      scheme: values.divergingScheme,
    };
  }

  return {
    type: 'sequential',
    name: 'color',
    domain: [-50, 50],
    scheme: values.sequentialScheme,
  };
};

/** 图形参数 */
export type ScaleContinuousPreviewValues = {
  scaleType: 'sequential' | 'diverging';
  sequentialScheme: 'viridis' | 'blues' | 'greens';
  divergingScheme: 'rdbu' | 'brbg' | 'spectral';
  midpoint: number;
};

/** 绘制示例图形 */
export const ScaleContinuousPreview = (values: ScaleContinuousPreviewValues) => {
  const spec: IRPlot = {
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }, buildColorScale(values)],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [
      {
        type: 'point',
        color: { kind: 'field', value: 'value', scale: 'color' },
        size: { kind: 'constant', value: 7 },
        encoding: { x: { field: 'x' }, y: { field: 'y' } },
      },
    ],
    guides: [
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y', grid: true },
      { type: 'legend', channel: 'color', scale: 'color', position: 'bottom' },
    ],
  };

  return <Plot spec={spec} data={{ d: colorValues }} width={400} height={280} />;
};
