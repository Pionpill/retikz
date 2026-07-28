import { defineControlledPreview } from '@/modules/docs/preview';

import { extensionResolverControls, previewControlContract } from './extension-resolver.controls';
import { renderExtensionResolverPreview } from './extension-resolver-preview';

/** 注册回退使用的运行时解析数据面板 */
export const previewControls = extensionResolverControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderExtensionResolverPreview);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 展示运行时字段 resolver 边界的示例 */
export default controlledPreview.Component;
