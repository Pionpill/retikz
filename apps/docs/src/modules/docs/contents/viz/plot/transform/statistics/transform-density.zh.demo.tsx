import { defineControlledPreview } from '@/modules/docs/preview';

import { densityControls, previewControlContract } from './transform-density.controls';
import { TransformDensityPreview } from './transform-density.preview';

/** 注册回退使用的密度控件 */
export const previewControls = densityControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  TransformDensityPreview(values, 'zh'),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 比较 KDE 带宽与采样数的动态试验场 */
const Preview = controlledPreview.Component;

export default Preview;
