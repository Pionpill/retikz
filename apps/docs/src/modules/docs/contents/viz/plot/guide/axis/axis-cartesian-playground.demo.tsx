import { defineControlledPreview } from '@/modules/docs/preview';

import { axisCartesianPlaygroundControls, previewControlContract } from './axis-cartesian-playground.controls';
import { renderCartesianPlayground } from './axis-cartesian-playground.preview';

export const previewControls = axisCartesianPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderCartesianPlayground);

export const previewSource = controlledPreview.source;

const Preview = controlledPreview.Component;
export default Preview;
