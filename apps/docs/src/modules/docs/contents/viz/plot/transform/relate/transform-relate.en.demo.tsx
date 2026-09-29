import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, relateControls } from './transform-relate.en.controls';
import { TransformRelatePreview } from './transform-relate.preview';

/** 注册回退使用的行配对英文控件 */
export const previewControls = relateControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  TransformRelatePreview(values, 'en'),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** Row-pairing playground for scope and independent source / target selectors */
const Preview = controlledPreview.Component;

export default Preview;
