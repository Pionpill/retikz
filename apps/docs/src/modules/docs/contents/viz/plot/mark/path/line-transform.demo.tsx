import { PathMark, Plot, PlotAxis, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  LINE_TRANSFORM_GROUPING_ID,
  lineTransformOperationOf,
  previewControlContract,
} from './line-transform.controls';
import { weeklyPipeline } from './line-transform.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const groupByChannel = values[LINE_TRANSFORM_GROUPING_ID] === 'channel';

  return (
    <Plot data={weeklyPipeline} width={620} height={280}>
      <PointMark
        encodings={{ color: 'channel', position: { x: 'day', y: 'value' } }}
        properties={{ opacity: { overall: 0.45 }, minimumSize: 6 }}
      />
      <PathMark
        transforms={[{ operation: lineTransformOperationOf(values) }]}
        encodings={{
          order: 'trendX',
          ...(groupByChannel ? { series: 'channel' } : {}),
          ...(groupByChannel ? { color: 'channel' } : {}),
          position: { x: 'trendX', y: 'trendY' },
        }}
        properties={{ stroke: groupByChannel ? undefined : '#0f172a', strokeWidth: 2.5 }}
      />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
