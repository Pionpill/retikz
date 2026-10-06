import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './tree-node-shape.controls';
import { renderTreeNodeShapePreview } from './tree-node-shape.preview';

export const previewControls = previewControlContract.controls;
const preview = defineControlledPreview(previewControlContract, values => renderTreeNodeShapePreview(values));
export const previewSource = preview.source;
const Demo = preview.Component;
export default Demo;
