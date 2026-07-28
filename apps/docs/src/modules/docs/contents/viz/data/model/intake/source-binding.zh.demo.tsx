import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, sourceBindingControls } from './source-binding.controls';
import { renderSourceBindingPreview } from './source-binding-preview';

/** 注册回退使用的数据源绑定控件 */
export const previewControls = sourceBindingControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderSourceBindingPreview);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 保持消费配置不变并切换数据源的动态试验场 */
export default controlledPreview.Component;
