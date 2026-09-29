import { defineControlledPreview } from '@/modules/docs/preview';

import { coordinateCartesianControls, previewControlContract } from './coordinate-cartesian.controls';
import { renderCoordinateCartesian } from './coordinate-cartesian.preview';

export const previewControls = coordinateCartesianControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderCoordinateCartesian);

export const previewSource = controlledPreview.source;
const Preview = controlledPreview.Component;
export default Preview;
