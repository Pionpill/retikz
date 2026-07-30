import type { FC } from 'react';

import { Axis, PathMark, Plot, PointMark } from '@retikz/plot-react';

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
    <Plot data={weeklyPipeline} width={620} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
      <PointMark x="day" y="value" color="channel" opacity={0.45} minimumSize={6} />
      <PathMark
        x="trendX"
        y="trendY"
        order="trendX"
        series={groupByChannel ? 'channel' : undefined}
        color={groupByChannel ? 'channel' : undefined}
        stroke={groupByChannel ? undefined : '#0f172a'}
        strokeWidth={2.5}
        transform={[lineTransformOperationOf(values)]}
      />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
