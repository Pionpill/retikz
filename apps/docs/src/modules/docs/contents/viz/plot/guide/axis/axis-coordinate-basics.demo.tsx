import { defineControlledPreview } from '@/modules/docs/preview';

import { axisCoordinateBasicsControls, previewControlContract } from './axis-coordinate-basics.controls';
import { renderCoordinateBasics } from './axis-coordinate-basics.preview';

export const previewControls = axisCoordinateBasicsControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderCoordinateBasics);

export const previewSource = controlledPreview.source;
const Preview = controlledPreview.Component;
export default Preview;
