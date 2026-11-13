import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './line-gaps.controls';
import { renderLineGaps } from './line-gaps.preview';

const preview = defineControlledPreview(createPreviewControlContract(), renderLineGaps);
const LineGaps = preview.Component;
export default LineGaps;
/** 稳定源码与可见图形共用实现 */
export const previewSource = {
  ...preview.source,
  datasetImports: { 'chart.data': { name: 'lineData', from: './line-basic.data' } },
};
export { createPreviewControlContract } from './line-gaps.controls';
export const previewControls = createPreviewControlContract().controls;
