import { defineControlledPreview } from '@/modules/docs/preview';

import { coordinatePolarControls, previewControlContract } from './coordinate-polar.controls';
import { renderCoordinatePolar } from './coordinate-polar.preview';

export const previewControls = coordinatePolarControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderCoordinatePolar);

export const previewSource = controlledPreview.source;

const Preview = controlledPreview.Component;
export default Preview;
