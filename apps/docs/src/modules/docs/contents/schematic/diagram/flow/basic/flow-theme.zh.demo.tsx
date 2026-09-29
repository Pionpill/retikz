import { defineControlledPreview } from '@/modules/docs/preview';

import { flowThemeControls, previewControlContract } from './flow-theme.controls';
import { FlowThemePreview } from './flow-theme.preview';

/** 注册 controls 自动发现的回退导出 */
export const previewControls = flowThemeControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => FlowThemePreview(values, 'zh'));

export const previewSource = controlledPreview.source;
const Preview = controlledPreview.Component;
export default Preview;
