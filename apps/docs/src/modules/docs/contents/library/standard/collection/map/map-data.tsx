import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './map-data.controls';
import { renderMapDataPreview } from './map-data.preview';

/** JSON 数据展开控件 */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values =>
  renderMapDataPreview({ dataExpand: values.dataExpand }),
);
export const previewSource = controlledPreview.source;
const Demo = controlledPreview.Component;
export default Demo;
