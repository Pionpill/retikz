import { defineControlledPreview } from '@/modules/docs/preview';

import { jitterControls, previewControlContract } from './transform-jitter.controls';
import { TransformJitterPreview } from './transform-jitter.preview';

/** 注册回退使用的抖动控件 */
export const previewControls = jitterControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  TransformJitterPreview(values, 'zh'),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 调整最大偏移与随机种子的确定性抖动试验场 */
const Preview = controlledPreview.Component;

export default Preview;
