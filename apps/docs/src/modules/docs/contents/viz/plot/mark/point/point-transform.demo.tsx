import type { FC } from 'react';

import { Plot, PlotAxis, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { pointTransformOperationOf, previewControlContract } from './point-transform.controls';
import { regionOrders } from './point-transform.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot data={regionOrders} width={620} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark x="region" y="orders" fill="#94a3b8" opacity={0.35} minimumSize={6} />
    <PointMark
      x="region"
      y="orders"
      size="orders"
      color="region"
      label="rep"
      transform={[pointTransformOperationOf(values)]}
    />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 调整当前 PointMark 内 jitter 的最大偏移与随机种子 */
const Demo: FC = controlledPreview.Component;

export default Demo;
