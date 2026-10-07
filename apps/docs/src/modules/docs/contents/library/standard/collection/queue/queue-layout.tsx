import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './queue-layout.controls';
import { renderQueuePreview } from './queue-layout.preview';

export const previewControls = previewControlContract.controls;
const preview = defineControlledPreview(previewControlContract, values => renderQueuePreview(values));
export const previewSource = preview.source;
const Demo = preview.Component;
export default Demo;
