import { Axis, Plot, PointMark, Scale, Transform } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { jitterOperationOf } from './transform-jitter.controls';
import { samples } from './transform-jitter.data';
import { jitterControls, previewControlContract } from './transform-jitter.en.controls';

/** 注册回退使用的英文抖动控件 */
export const previewControls = jitterControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot data={samples} width={420} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Transform {...jitterOperationOf(values)} />
    <Scale dimension="x" type="linear" domain={[0.5, 3.5]} />
    <Scale dimension="y" type="linear" domain={[10, 32]} />
    <PointMark x="dose" y="response" />
    <Axis dimension="x" title="Jittered" />
    <Axis dimension="y" title="Response" grid />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 调整最大偏移与随机种子的英文确定性抖动试验场 */
export default controlledPreview.Component;
