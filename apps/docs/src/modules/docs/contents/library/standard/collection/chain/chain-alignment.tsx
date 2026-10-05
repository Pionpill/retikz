import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './chain-alignment.controls';
import { renderChainPreview } from './chain-alignment.preview';

export const previewControls = previewControlContract.controls;

const preview = defineControlledPreview(previewControlContract, values => renderChainPreview(values));

export const previewSource = preview.source;

const Demo = preview.Component;
export default Demo;
