import type { FC } from 'react';

import { Axis, PathMark, Plot } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { LINE_BASIC_CONTROL_IDS, previewControlContract } from './line-basic.controls';
import { revenue } from './line-basic.data';

/** 位置属性：左侧笛卡尔、右侧极坐标，比较同一组点的投影差异。 */
const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const xField = values[LINE_BASIC_CONTROL_IDS.xField];
  const yField = values[LINE_BASIC_CONTROL_IDS.yField];
  const cartesianX = xField === 'coordinate' ? 'month' : xField;
  const polarX = xField === 'coordinate' ? 'period' : xField;
  const order = values[LINE_BASIC_CONTROL_IDS.orderSource] === 'field' ? 'month' : undefined;

  return (
    <Layout width={620} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
      <Plot data={revenue} width={300} height={220} x={0} y={30}>
        <PathMark x={cartesianX} y={yField} order={order} />
        <Axis dimension="x" />
        <Axis dimension="y" grid />
      </Plot>
      <Plot data={revenue} width={260} height={260} coordinate="polar2D" x={350} y={0}>
        <PathMark x={polarX} y={yField} order={order} />
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
