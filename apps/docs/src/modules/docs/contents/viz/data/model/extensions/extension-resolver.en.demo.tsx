import { defineControlledPreview } from '@/modules/docs/preview';

import { renderExtensionResolverPreview } from './extension-resolver-preview';
import { extensionResolverControls, previewControlContract } from './extension-resolver.en.controls';

/** Controls fallback for runtime field resolution */
export const previewControls = extensionResolverControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderExtensionResolverPreview);

/** Stable source configuration derived from the canonical state */
export const previewSource = controlledPreview.source;

/** Runtime field resolver escape-hatch example */
const Preview = controlledPreview.Component;

export default Preview;
