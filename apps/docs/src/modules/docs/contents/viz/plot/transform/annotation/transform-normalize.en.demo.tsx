import { defineControlledPreview } from '@/modules/docs/preview';

import { normalizeControls, previewControlContract } from './transform-normalize.en.controls';
import { TransformNormalizePreview } from './transform-normalize.preview';

/** 注册回退使用的归一化英文控件 */
export const previewControls = normalizeControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  TransformNormalizePreview(values, 'en'),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** Dynamic playground for normalization basis and grouping scope */
const Preview = controlledPreview.Component;

export default Preview;
