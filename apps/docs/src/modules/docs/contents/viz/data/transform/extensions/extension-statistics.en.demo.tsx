import { defineControlledPreview } from '@/modules/docs/preview';

import { extensionStatisticsControls, previewControlContract } from './extension-statistics.en.controls';
import { renderExtensionStatisticsPreview } from './extension-statistics-preview';

/** Registers fallback controls for the statistics-extension input */
export const previewControls = extensionStatisticsControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderExtensionStatisticsPreview);

/** Stable source configuration derived from canonical values */
export const previewSource = controlledPreview.source;

/** Keeps reducer and selector extension responsibilities visible side by side */
export default controlledPreview.Component;
