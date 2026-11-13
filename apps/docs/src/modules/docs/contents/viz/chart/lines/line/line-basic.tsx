import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './line-basic.controls';
import { renderLineBasic } from './line-basic.preview';

const preview = defineControlledPreview(createPreviewControlContract(), renderLineBasic);
const LineBasic = preview.Component;
export default LineBasic;
/** 稳定源码与可见图形共用实现 */
export const previewSource = {
  ...preview.source,
  datasetImports: { 'chart.data': { name: 'lineData', from: './line-basic.data' } },
};
export { createPreviewControlContract } from './line-basic.controls';
export const previewControls = createPreviewControlContract().controls;
