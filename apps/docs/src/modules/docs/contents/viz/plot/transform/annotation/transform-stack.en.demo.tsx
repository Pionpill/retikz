import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, stackControls } from './transform-stack.en.controls';
import { TransformStackPreview } from './transform-stack.preview';

/** 注册回退使用的堆叠英文控件 */
export const previewControls = stackControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  TransformStackPreview(values, 'en'),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** Dynamic playground for comparing stack baseline strategies */
const Preview = controlledPreview.Component;

export default Preview;
