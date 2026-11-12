import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './line-mapping.controls';
import { renderLineMapping } from './line-mapping.preview';

const preview = defineControlledPreview(createPreviewControlContract(), renderLineMapping);
const LineMapping = preview.Component;
export default LineMapping;
/** 稳定源码与可见图形共用实现 */
export const previewSource = {
  ...preview.source,
  datasetImports: { 'chart.data': { name: 'lineData', from: './line-basic.data' } },
};
export { createPreviewControlContract } from './line-mapping.controls';
export const previewControls = createPreviewControlContract().controls;
