import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './queue-composition.controls';
import { renderQueuePreview } from './queue-composition.preview';

export const previewControls = previewControlContract.controls;
const preview = defineControlledPreview(previewControlContract, values => renderQueuePreview(values));
export const previewSource = preview.source;
const Demo = preview.Component;
export default Demo;
