import { defineControlledPreview } from '@/modules/docs/preview';

import { jitterControls, previewControlContract } from './transform-jitter.en.controls';
import { TransformJitterPreview } from './transform-jitter.preview';

/** 注册回退使用的英文抖动控件 */
export const previewControls = jitterControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  TransformJitterPreview(values, 'en'),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 调整最大偏移与随机种子的英文确定性抖动试验场 */
const Preview = controlledPreview.Component;

export default Preview;
