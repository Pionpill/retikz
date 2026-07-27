import type { FC } from 'react';

import { Axis, PathMark, Plot } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { LINE_SERIES_CONTROL_ID, previewControlContract } from './line-series.controls';
import { climate } from './line-series.data';

/** 显式 series：左侧笛卡尔、右侧极坐标，每个 city 下沉为一条路径。 */
const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const series = values[LINE_SERIES_CONTROL_ID] === 'city' ? 'city' : undefined;

  return (
    <Layout width={620} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
      <Plot data={climate} width={300} height={220} x={0} y={30}>
        <PathMark x="month" y="score" series={series} order="month" />
        <Axis dimension="x" />
        <Axis dimension="y" grid />
      </Plot>
      <Plot data={climate} width={260} height={260} coordinate="polar2D" x={350} y={0}>
        <PathMark x="quarter" y="score" series={series} order="month" closed />
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
