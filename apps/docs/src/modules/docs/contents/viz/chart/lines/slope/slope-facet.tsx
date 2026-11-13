import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './slope-facet.controls';
import { renderSlopeFacet } from './slope-facet.preview';

const preview = defineControlledPreview(createPreviewControlContract(), renderSlopeFacet);
const SlopeFacet = preview.Component;
export default SlopeFacet;
/** 源码与预览使用相同配置 */
export const previewSource = {
  ...preview.source,
  datasetImports: { 'chart.data': { name: 'slopeFacetData', from: './slope-basic.data' } },
};
export { createPreviewControlContract } from './slope-facet.controls';
export const previewControls = createPreviewControlContract().controls;
