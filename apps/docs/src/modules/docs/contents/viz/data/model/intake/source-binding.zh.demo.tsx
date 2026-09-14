import { defineControlledPreview } from '@/modules/docs/preview';

import { renderSourceBindingPreview } from './source-binding-preview';
import { previewControlContract, sourceBindingControls } from './source-binding.controls';

/** 注册回退使用的数据源绑定控件 */
export const previewControls = sourceBindingControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderSourceBindingPreview);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 保持消费配置不变并切换数据源的动态试验场 */
const Preview = controlledPreview.Component;

export default Preview;
