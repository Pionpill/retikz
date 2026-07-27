import { Axis, Plot, PointMark, Scale, Transform } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { jitterControls, previewControlContract } from './transform-jitter.controls';
import { samples } from './transform-jitter.data';

/** 注册回退使用的抖动控件 */
export const previewControls = jitterControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout width={620} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={samples} width={300} height={220} x={0} y={20}>
      <Scale dimension="x" type="linear" domain={[0.5, 3.5]} />
      <Scale dimension="y" type="linear" domain={[10, 32]} />
      <PointMark x="dose" y="response" />
      <Axis dimension="x" title="原始位置" />
      <Axis dimension="y" title="响应" grid />
    </Plot>
    <Plot data={samples} width={300} height={220} x={320} y={20}>
      <Transform kind="jitter" axis="x" xField="dose" amount={values.amount} seed={values.seed} />
      <Scale dimension="x" type="linear" domain={[0.5, 3.5]} />
      <Scale dimension="y" type="linear" domain={[10, 32]} />
      <PointMark x="dose" y="response" />
      <Axis dimension="x" title="抖动后" />
      <Axis dimension="y" title="响应" grid />
    </Plot>
  </Layout>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 调整最大偏移与随机种子的确定性抖动试验场 */
export default controlledPreview.Component;
