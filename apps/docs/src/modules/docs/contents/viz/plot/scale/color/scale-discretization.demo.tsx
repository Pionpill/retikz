import type { IRPlotScale, IRPlotSpec } from '@retikz/plot';

import { Plot } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, scaleDiscretizationControls } from './scale-discretization.controls';
import { discretizationValues } from './scale-discretization.data';

/** 注册回退使用的离散化颜色比例尺 controls */
export const previewControls = scaleDiscretizationControls;

const thresholdBreakpoints = {
  risk: [10, 30, 60],
  service: [20, 50, 80],
} as const;

/** 按 controls 状态构造当前离散化颜色比例尺 */
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

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const spec: IRPlotSpec = {
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

  return (
    <Plot
      spec={spec}
      data={{ d: discretizationValues }}
      width={400}
      height={280}
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 在同一份偏斜数据上比较等宽、业务阈值与等频分档 */
export default controlledPreview.Component;
