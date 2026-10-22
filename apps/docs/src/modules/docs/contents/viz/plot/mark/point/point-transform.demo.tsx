import { Plot, PlotAxis, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { pointTransformOperationOf, previewControlContract } from './point-transform.controls';
import { regionOrders } from './point-transform.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot data={regionOrders} width={620} height={280}>
    <PointMark
      encodings={{ position: { x: { field: 'region' }, y: { field: 'orders' } } }}
      properties={{ fill: '#94a3b8', opacity: { overall: 0.35 }, minimumSize: 6 }}
    />
    <PointMark
      transforms={[{ operation: pointTransformOperationOf(values) }]}
      encodings={{
        size: 'orders',
        color: 'region',
        label: { content: 'rep' },
        position: { x: { field: 'region' }, y: { field: 'orders' } },
      }}
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
