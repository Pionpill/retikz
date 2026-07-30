import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, transformAnnotateControls } from './transform-annotate.controls';
import { renderTransformAnnotatePreview } from './transform-annotate-preview';

/** 注册回退使用的统计标注控件 */
export const previewControls = transformAnnotateControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderTransformAnnotatePreview);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 切换广播统计量且保留原始明细点的动态示例 */
export default controlledPreview.Component;
