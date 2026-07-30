import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, transformSortControls } from './transform-sort.controls';
import { renderTransformSortPreview } from './transform-sort-preview';

/** 注册回退使用的行排序控件 */
export const previewControls = transformSortControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderTransformSortPreview);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 对照原始行序与受控 sort 输出的动态示例 */
export default controlledPreview.Component;
