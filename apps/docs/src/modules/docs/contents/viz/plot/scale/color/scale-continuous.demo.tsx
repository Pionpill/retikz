import type { IRPlotScale, IRPlot } from '@retikz/plot';

import { Plot } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, scaleContinuousControls } from './scale-continuous.controls';
import { colorValues } from './scale-continuous.data';

/** 注册回退使用的连续颜色比例尺 controls */
export const previewControls = scaleContinuousControls;

/** 按 controls 状态构造当前颜色比例尺 */
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

const controlledPreview = defineControlledPreview(previewControlContract, values => {
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

  return (
    <Plot spec={spec} data={{ d: colorValues }} width={400} height={280} style={{ maxWidth: '100%', height: 'auto' }} />
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 在同一散点图中切换连续与发散颜色比例尺 */
export default controlledPreview.Component;
