import type { FC } from 'react';

import { Axis, PathMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';
import { defineControlledPreview } from '@/modules/docs/preview';

import { LINE_RADAR_CLOSED_ID, previewControlContract } from './line-radar.controls';
import { team } from './line-radar.data';

/** 几何属性：两个极坐标对比闭合路径与不闭合路径。 */
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout width={620} height={300} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={team} width={280} height={280} coordinate="polar2D" x={10} y={10}>
      <PathMark x="dim" y="score" order="rank" closed />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={team} width={280} height={280} coordinate="polar2D" x={330} y={10}>
      <PathMark x="dim" y="score" order="rank" closed={values[LINE_RADAR_CLOSED_ID]} />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

const Demo: FC = controlledPreview.Component;

export default Demo;
