import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, transformSelectControls } from './transform-select.controls';
import { renderTransformSelectPreview } from './transform-select-preview';

/** 注册回退使用的代表行选择控件 */
export const previewControls = transformSelectControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderTransformSelectPreview);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 切换 selector、排名数与平局策略的动态示例 */
export default controlledPreview.Component;
