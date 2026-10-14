import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, relateControls } from './transform-relate.controls';
import { TransformRelatePreview } from './transform-relate.preview';

/** 注册回退使用的行配对控件 */
export const previewControls = relateControls;

const controlledPreview = defineControlledPreview(previewControlContract, (values, dimensions) =>
  TransformRelatePreview(values, 'zh', dimensions),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 切换配对范围并独立选择 source / target 行的行配对试验场 */
const Preview = controlledPreview.Component;

export default Preview;
