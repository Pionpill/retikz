import { defineControlledPreview } from '@/modules/docs/preview';

import { normalizeControls, previewControlContract } from './transform-normalize.controls';
import { TransformNormalizePreview } from './transform-normalize.preview';

/** 注册回退使用的归一化控件 */
export const previewControls = normalizeControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  TransformNormalizePreview(values, 'zh'),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 比较归一化基准与分组范围的动态试验场 */
const Preview = controlledPreview.Component;

export default Preview;
