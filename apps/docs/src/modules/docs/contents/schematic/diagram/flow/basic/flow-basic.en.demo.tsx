import { defineControlledPreview } from '@/modules/docs/preview';

import { flowBasicControls, previewControlContract } from './flow-basic.en.controls';
import { FlowBasicPreview } from './flow-basic.preview';

/** 注册 controls 自动发现的回退导出 */
export const previewControls = flowBasicControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => FlowBasicPreview(values, 'en'));

export const previewSource = controlledPreview.source;
const Preview = controlledPreview.Component;
export default Preview;
