import { defineControlledPreview } from '@/modules/docs/preview';

import { deriveIntervalControls, previewControlContract } from './transform-derive-interval.en.controls';
import { TransformDeriveIntervalPreview } from './transform-derive-interval.preview';

/** 注册回退使用的英文派生区间控件 */
export const previewControls = deriveIntervalControls;

const controlledPreview = defineControlledPreview(previewControlContract, values =>
  TransformDeriveIntervalPreview(values, 'en'),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 在显式起止字段与基线模式之间切换的英文派生区间试验场 */
const Preview = controlledPreview.Component;

export default Preview;
