import { defineControlledPreview } from '@/modules/docs/preview';

import { renderTransformAnnotatePreview } from './transform-annotate-preview';
import { previewControlContract, transformAnnotateControls } from './transform-annotate.en.controls';

/** Registers fallback controls for the statistical-annotation example */
export const previewControls = transformAnnotateControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderTransformAnnotatePreview);

/** Stable source configuration derived from canonical values */
export const previewSource = controlledPreview.source;

/** Switches the broadcast statistic while retaining detail points */
const Preview = controlledPreview.Component;

export default Preview;
