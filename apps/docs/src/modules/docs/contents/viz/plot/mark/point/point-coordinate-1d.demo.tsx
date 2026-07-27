import type { FC } from 'react';

import { Axis, Plot, PointMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { POINT_COORDINATE_1D_CONTROL_IDS, previewControlContract } from './point-coordinate-1d.controls';
import { samples } from './point-coordinates.data';

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout width={620} height={230} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={samples} width={300} height={150} coordinate="cartesian1D" x={0} y={40}>
      <PointMark x={values[POINT_COORDINATE_1D_CONTROL_IDS.xField]} color="group" />
      <Axis dimension="x" />
    </Plot>
    <Plot data={samples} width={230} height={230} coordinate="polar1D" x={360} y={0}>
      <PointMark x={values[POINT_COORDINATE_1D_CONTROL_IDS.xField]} color="group" />
      <Axis dimension="x" />
    </Plot>
  </Layout>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 对比同一个一维位置字段在直线与极坐标中的投影 */
const Demo: FC = controlledPreview.Component;

export default Demo;
