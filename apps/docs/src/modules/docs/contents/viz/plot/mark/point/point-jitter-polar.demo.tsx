import type { FC } from 'react';

import { Plot, PlotAxis, PlotScale, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { polarJitterPoints } from './point-jitter.data';
import {
  POINT_JITTER_POLAR_CONTROL_IDS,
  polarJitterOperationOf,
  previewControlContract,
} from './point-jitter-polar.controls';

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const continuous = values[POINT_JITTER_POLAR_CONTROL_IDS.scale] === 'continuous';
  return (
    <Plot
      data={polarJitterPoints}
      width={360}
      height={360}
      coordinate={{ type: 'polar2D' }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <PointMark
        x={continuous ? 'angle' : 'group'}
        y="value"
        size={5}
        color={{ kind: 'constant', value: '#7c3aed' }}
        placement={{
          adjustments: [polarJitterOperationOf(values)],
        }}
      />
      {continuous ? (
        <PlotScale dimension="x" type="linear" domain={[0, 360]} />
      ) : (
        <PlotScale dimension="x" type="point" />
      )}
      <PlotScale dimension="y" type="linear" domainPadding={{ upper: continuous ? 5 : 28 }} />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 在极坐标 angle role 上先抖动角度，再由连续圆弧或离散直弦投影 */
const Demo: FC = controlledPreview.Component;

export default Demo;
