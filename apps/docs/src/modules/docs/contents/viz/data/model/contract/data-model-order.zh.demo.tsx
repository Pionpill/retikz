import { defineControlledPreview } from '@/modules/docs/preview';

import { dataModelOrderControls, previewControlContract } from './data-model-order.controls';
import { renderDataModelOrderPreview } from './data-model-order-preview';

/** 注册回退使用的分类顺序控件 */
export const previewControls = dataModelOrderControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderDataModelOrderPreview);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 对比分类域顺序且保持源行不变的动态试验场 */
export default controlledPreview.Component;
