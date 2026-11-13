import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './slope-gaps.controls';
import { renderSlopeGaps } from './slope-gaps.preview';

const preview = defineControlledPreview(createPreviewControlContract(), renderSlopeGaps);
const SlopeGaps = preview.Component;
export default SlopeGaps;
/** 源码与预览使用相同配置 */
export const previewSource = {
  ...preview.source,
  datasetImports: { 'chart.data': { name: 'slopeData', from: './slope-basic.data' } },
};
export { createPreviewControlContract } from './slope-gaps.controls';
export const previewControls = createPreviewControlContract().controls;
