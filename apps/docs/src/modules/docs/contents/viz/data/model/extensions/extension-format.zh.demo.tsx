import { defineControlledPreview } from '@/modules/docs/preview';

import { renderExtensionFormatPreview } from './extension-format-preview';
import { extensionFormatControls, previewControlContract } from './extension-format.controls';

/** 注册回退使用的具名格式数据面板 */
export const previewControls = extensionFormatControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderExtensionFormatPreview);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 展示 Definition、注入与 model 引用闭环的示例 */
const Preview = controlledPreview.Component;

export default Preview;
