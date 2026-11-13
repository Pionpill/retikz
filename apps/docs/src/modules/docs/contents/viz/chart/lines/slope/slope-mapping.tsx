import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './slope-mapping.controls';
import { renderSlopeMapping } from './slope-mapping.preview';

const preview = defineControlledPreview(createPreviewControlContract(), renderSlopeMapping);
const SlopeMapping = preview.Component;
export default SlopeMapping;
/** 源码与预览使用相同配置 */
export const previewSource = {
  ...preview.source,
  datasetImports: { 'chart.data': { name: 'slopeData', from: './slope-basic.data' } },
};
export { createPreviewControlContract } from './slope-mapping.controls';
export const previewControls = createPreviewControlContract().controls;
