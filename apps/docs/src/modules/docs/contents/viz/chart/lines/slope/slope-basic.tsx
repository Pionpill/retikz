import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './slope-basic.controls';
import { renderSlopeBasic } from './slope-basic.preview';

const preview = defineControlledPreview(createPreviewControlContract(), renderSlopeBasic);
const SlopeBasic = preview.Component;
export default SlopeBasic;
/** 源码与预览使用相同配置 */
export const previewSource = {
  ...preview.source,
  datasetImports: { 'chart.data': { name: 'slopeData', from: './slope-basic.data' } },
};
export { createPreviewControlContract } from './slope-basic.controls';
export const previewControls = createPreviewControlContract().controls;
