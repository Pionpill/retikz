import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './tree-connections.controls';
import { renderTreeConnectionsPreview } from './tree-connections.preview';

export const previewControls = previewControlContract.controls;
const preview = defineControlledPreview(previewControlContract, values => renderTreeConnectionsPreview(values));
export const previewSource = preview.source;
const Demo = preview.Component;
export default Demo;
