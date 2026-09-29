import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, stackControls } from './transform-stack.controls';
import { TransformStackPreview } from './transform-stack.preview';

/** 注册回退使用的堆叠控件 */
export const previewControls = stackControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  TransformStackPreview(values, 'zh'),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 比较堆叠基线策略的动态试验场 */
const Preview = controlledPreview.Component;

export default Preview;
