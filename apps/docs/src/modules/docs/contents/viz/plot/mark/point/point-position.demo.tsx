import type { FC } from 'react';

import { Axis, Plot, PointMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { points } from './point-api.data';
import { POINT_POSITION_CONTROL_IDS, previewControlContract } from './point-position.controls';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout width={620} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={points} width={300} height={220} x={0} y={20}>
      <PointMark x={values[POINT_POSITION_CONTROL_IDS.xField]} y={values[POINT_POSITION_CONTROL_IDS.yField]} />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={points} width={260} height={260} coordinate="polar2D" x={340} y={0}>
      <PointMark x={values[POINT_POSITION_CONTROL_IDS.xField]} y={values[POINT_POSITION_CONTROL_IDS.yField]} />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 对比二维笛卡尔与极坐标中的位置字段 */
const Demo: FC = controlledPreview.Component;

export default Demo;
