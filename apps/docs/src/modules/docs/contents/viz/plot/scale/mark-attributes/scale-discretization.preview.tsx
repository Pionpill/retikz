import type { IRPlot, IRPlotScale } from '@retikz/plot';
import { Plot } from '@retikz/plot-react';

import type { previewControlContract } from './scale-discretization.controls';
import { discretizationValues } from './scale-discretization.data';

const thresholdBreakpoints = {
  risk: [10, 30, 60],
  service: [20, 50, 80],
} as const;

const buildDiscretizationScale = (values: typeof previewControlContract.canonicalValues): IRPlotScale => {
  const count = values.scaleType === 'threshold' ? 4 : values.count;
  const output =
    values.target === 'color'
      ? { scheme: values.scheme }
      : {
          range: Array.from({ length: count }, (_, index) =>
            values.target === 'size' ? 4 + (index / (count - 1)) * 12 : 0.2 + (index / (count - 1)) * 0.8,
          ),
        };
  if (values.scaleType === 'threshold') {
    const preset = values.thresholdPreset === 'service' ? 'service' : 'risk';

    return {
      type: 'threshold',
      name: 'color',
      breakpoints: [...thresholdBreakpoints[preset]],
      ...output,
    };
  }

  if (values.scaleType === 'quantile') {
    return {
      type: 'quantile',
      name: 'color',
      count: values.count,
      ...output,
    };
  }

  return {
    type: 'quantize',
    name: 'color',
    domain: [0, 100],
    count: values.count,
    ...output,
  };
};

/** 图形参数 */
export type ScaleDiscretizationPreviewValues = {
  target: 'color' | 'size' | 'opacity';
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

        encodings: {
          ...(values.target === 'opacity'
            ? { opacity: { overall: { field: 'value', scale: 'color' } } }
            : { [values.target]: { field: 'value', scale: 'color' } }),
          position: { x: { field: 'x' }, y: { field: 'y' } },
        },
        properties: { size: 7 },
      },
    ],
    guides: [
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y', grid: true },
      { type: 'legend', channel: values.target, scale: 'color', position: 'bottom' },
    ],
  };

  return <Plot spec={spec} data={{ d: discretizationValues }} width={400} height={280} />;
};
