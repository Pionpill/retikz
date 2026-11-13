import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract } from './line-mark.controls';
import { renderLineMark } from './line-mark.preview';

const preview = defineControlledPreview(createPreviewControlContract(), renderLineMark);
const LineMark = preview.Component;
export default LineMark;
/** 稳定源码与可见图形共用实现 */
export const previewSource = {
  ...preview.source,
  datasetImports: { 'chart.data': { name: 'lineData', from: './line-basic.data' } },
};
export { createPreviewControlContract } from './line-mark.controls';
export const previewControls = createPreviewControlContract().controls;
