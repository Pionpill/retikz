import { defineControlledPreview } from '@/modules/docs/preview';

import { flowCompoundControls, previewControlContract } from './flow-compound.controls';
import { FlowCompoundPreview } from './flow-compound.preview';

/** 注册 controls 自动发现的回退导出 */
export const previewControls = flowCompoundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => FlowCompoundPreview(values, 'zh'));

export const previewSource = controlledPreview.source;
const Preview = controlledPreview.Component;
export default Preview;
