import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, smoothControls } from './transform-smooth.en.controls';
import { TransformSmoothPreview } from './transform-smooth.preview';

/** 注册回退使用的趋势英文控件 */
export const previewControls = smoothControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  TransformSmoothPreview(values, 'en'),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** Linear trend playground for prediction count and extrapolation extent */
const Preview = controlledPreview.Component;

export default Preview;
