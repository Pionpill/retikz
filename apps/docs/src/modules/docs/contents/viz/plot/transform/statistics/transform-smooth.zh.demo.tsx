import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, smoothControls } from './transform-smooth.controls';
import { TransformSmoothPreview } from './transform-smooth.preview';

/** 注册回退使用的趋势控件 */
export const previewControls = smoothControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  TransformSmoothPreview(values, 'zh'),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 调整预测点数和外推范围的线性趋势试验场 */
const Preview = controlledPreview.Component;

export default Preview;
