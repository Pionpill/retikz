import { defineControlledPreview } from '@/modules/docs/preview';

import { densityControls, previewControlContract } from './transform-density.en.controls';
import { TransformDensityPreview } from './transform-density.preview';

/** 注册回退使用的密度英文控件 */
export const previewControls = densityControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  TransformDensityPreview(values, 'en'),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** Dynamic playground for KDE bandwidth and sample count */
const Preview = controlledPreview.Component;

export default Preview;
