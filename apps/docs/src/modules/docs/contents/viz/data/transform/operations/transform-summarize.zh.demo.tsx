import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, transformSummarizeControls } from './transform-summarize.controls';
import { renderTransformSummarizePreview } from './transform-summarize-preview';

/** 注册回退使用的分组汇总控件 */
export const previewControls = transformSummarizeControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderTransformSummarizePreview);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 切换 reducer 并观察分组输出的动态示例 */
export default controlledPreview.Component;
