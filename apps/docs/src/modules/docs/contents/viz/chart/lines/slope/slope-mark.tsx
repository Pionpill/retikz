import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './slope-mark.controls';
import { renderSlopeMark } from './slope-mark.preview';

const preview = defineControlledPreview(createPreviewControlContract(), renderSlopeMark);
const SlopeMark = preview.Component;
export default SlopeMark;
/** 源码与预览使用相同配置 */
export const previewSource = {
  ...preview.source,
  datasetImports: { 'chart.data': { name: 'slopeData', from: './slope-basic.data' } },
};
export { createPreviewControlContract } from './slope-mark.controls';
export const previewControls = createPreviewControlContract().controls;
