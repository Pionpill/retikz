import type { IRPlot, IRPlotScale } from '@retikz/plot';
import { Plot } from '@retikz/plot-react';

import type { previewControlContract } from './scale-discretization.controls';
import { discretizationValues } from './scale-discretization.data';

const thresholdBreakpoints = {
  risk: [10, 30, 60],
  service: [20, 50, 80],
} as const;

const buildDiscretizationScale = (values: typeof previewControlContract.canonicalValues): IRPlotScale => {
  if (values.scaleType === 'threshold') {
    const preset = values.thresholdPreset === 'service' ? 'service' : 'risk';

    return {
      type: 'threshold',
      name: 'color',
      breakpoints: [...thresholdBreakpoints[preset]],
      scheme: values.scheme,
    };
  }
  if (values.scaleType === 'quantile') {
    return {
      type: 'quantile',
      name: 'color',
      count: values.count,
      scheme: values.scheme,
    };
  }
  return {
    type: 'quantize',
    name: 'color',
    domain: [0, 100],
    count: values.count,
    scheme: values.scheme,
  };
};

/** 图形参数 */
export type ScaleDiscretizationPreviewValues = {
  scaleType: 'quantize' | 'threshold' | 'quantile';
  count: number;
  thresholdPreset: 'risk' | 'service';
  scheme: 'blues' | 'greens' | 'magma';
};

/** 绘制示例图形 */
export const ScaleDiscretizationPreview = (values: ScaleDiscretizationPreviewValues) => {
  const spec: IRPlot = {
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }, buildDiscretizationScale(values)],
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

  return <Plot spec={spec} data={{ d: discretizationValues }} width={400} height={280} />;
};
