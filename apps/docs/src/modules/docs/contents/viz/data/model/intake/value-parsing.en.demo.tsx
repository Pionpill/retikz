import { defineControlledPreview } from '@/modules/docs/preview';

import { renderValueParsingPreview } from './value-parsing-preview';
import { previewControlContract, valueParsingControls } from './value-parsing.en.controls';

/** Controls fallback for value parsing */
export const previewControls = valueParsingControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderValueParsingPreview);

/** Stable source configuration derived from the canonical state */
export const previewSource = controlledPreview.source;

/** Dynamic playground for built-in coercion and declarative formats */
const Preview = controlledPreview.Component;

export default Preview;
