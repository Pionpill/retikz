import { defineControlledPreview } from '@/modules/docs/preview';

import { extensionTransformControls, previewControlContract } from './extension-transform.controls';
import { renderExtensionTransformPreview } from './extension-transform-preview';

/** 注册回退使用的自定义 transform 控件 */
export const previewControls = extensionTransformControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderExtensionTransformPreview);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 调整 JSON-safe factor 并对照原值与派生值的动态示例 */
export default controlledPreview.Component;
