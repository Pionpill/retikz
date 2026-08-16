import type { IRPlot } from '@retikz/plot';
import type { FC } from 'react';

import { Plot } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { CUSTOM_SCALE_CONTROL_IDS, customScaleControls, previewControlContract } from './scale-custom.controls';
import { scaleCustomRows } from './scale-custom.data';
import { brandColorScale, easePositionScale } from './scale-custom.definition';

/** controls registry 缺失时使用的显式回退 */
export const previewControls = customScaleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  // 自定义 scale 不参与 React 自动派生：经完整 spec 的 scales 引用，definition 走 scaleDefinitions 注入。
  const spec: IRPlot = {
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'pts' },
    scales: [
      { type: 'ease-position', name: 'x', exponent: values[CUSTOM_SCALE_CONTROL_IDS.exponent] },
      { type: 'linear', name: 'y' },
      { type: 'brand', name: 'tier-color' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [
      {
        type: 'point',
        size: { kind: 'constant', value: 7 },
        color: { kind: 'field', value: 'tier', scale: 'tier-color' },
        encoding: { x: { field: 'x' }, y: { field: 'y' } },
      },
    ],
    guides: [
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y', grid: true },
      { type: 'legend', channel: 'color' },
    ],
  };

  return (
    <Plot
      spec={spec}
      data={{ pts: scaleCustomRows }}
      scaleDefinitions={[easePositionScale, brandColorScale]}
      width={420}
      height={220}
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

const Demo: FC = controlledPreview.Component;

export default Demo;
