import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './line-facet.controls';
import { renderLineFacet } from './line-facet.preview';

const preview = defineControlledPreview(createPreviewControlContract(), renderLineFacet);
const LineFacet = preview.Component;
export default LineFacet;
/** 稳定源码与可见图形共用实现 */
export const previewSource = {
  ...preview.source,
  datasetImports: { 'chart.data': { name: 'lineData', from: './line-basic.data' } },
};
export { createPreviewControlContract } from './line-facet.controls';
export const previewControls = createPreviewControlContract().controls;
