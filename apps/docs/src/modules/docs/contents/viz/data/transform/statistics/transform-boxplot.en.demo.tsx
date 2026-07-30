import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, transformBoxplotControls } from './transform-boxplot.en.controls';
import { renderTransformBoxplotPreview } from './transform-boxplot-preview';

/** Registers fallback controls for the boxplot statistics example */
export const previewControls = transformBoxplotControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderTransformBoxplotPreview);

/** Stable source configuration derived from canonical values */
export const previewSource = controlledPreview.source;

/** Synchronizes box, whisker, and outlier boundaries from one controlled state */
export default controlledPreview.Component;
