import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './map-styles.controls';
import { renderMapStylesPreview } from './map-styles.preview';

export const previewControls = previewControlContract.controls;
const preview = defineControlledPreview(previewControlContract, values => renderMapStylesPreview(values));
export const previewSource = preview.source;
const Demo = preview.Component;
export default Demo;
