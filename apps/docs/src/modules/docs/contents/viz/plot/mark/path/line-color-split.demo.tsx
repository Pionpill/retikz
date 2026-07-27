import type { FC } from 'react';

import { Axis, PathMark, Plot } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { LINE_COLOR_CONTROL_ID, previewControlContract } from './line-color-split.controls';
import { channelTrend } from './line-series.data';

/** 隐式拆分：不写 series，只用分类 color 字段拆成多条路径。 */
const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const color = values[LINE_COLOR_CONTROL_ID] === 'channel' ? 'channel' : undefined;

  return (
    <Layout width={620} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
      <Plot data={channelTrend} width={300} height={220} x={0} y={30}>
        <PathMark x="month" y="score" color={color} order="month" />
        <Axis dimension="x" />
        <Axis dimension="y" grid />
      </Plot>
      <Plot data={channelTrend} width={260} height={260} coordinate="polar2D" x={350} y={0}>
        <PathMark x="quarter" y="score" color={color} order="month" closed />
        <Axis dimension="x" />
        <Axis dimension="y" grid />
      </Plot>
    </Layout>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
