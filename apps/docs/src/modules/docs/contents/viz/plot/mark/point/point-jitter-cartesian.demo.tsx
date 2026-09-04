import type { FC } from 'react';

import { Plot, PlotAxis, PlotScale, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { jitterPoints } from './point-jitter.data';
import { cartesianJitterOperationOf, previewControlContract } from './point-jitter-cartesian.controls';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot data={jitterPoints} width={400} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark
      x="group"
      y="value"
      size={6}
      color={{ kind: 'constant', value: '#2563eb' }}
      placement={{ adjustments: [cartesianJitterOperationOf(values)] }}
    />
    <PlotScale dimension="x" type="point" />
    <PlotScale dimension="y" type="linear" domainPadding={{ upper: 6 }} />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 在分类 x role 的实时 step 内散布 Point */
const Demo: FC = controlledPreview.Component;

export default Demo;
