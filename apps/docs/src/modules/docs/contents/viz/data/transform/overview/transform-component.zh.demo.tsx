import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, transformComponentControls } from './transform-component.controls';
import { renderTransformComponentPreview } from './transform-component-preview';

/** 注册回退使用的 Transform 输入控件 */
export const previewControls = transformComponentControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderTransformComponentPreview);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 展示固定 Transform 声明顺序与输入行的示例 */
export default controlledPreview.Component;
