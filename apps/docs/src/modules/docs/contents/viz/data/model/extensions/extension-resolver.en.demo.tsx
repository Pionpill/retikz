import { defineControlledPreview } from '@/modules/docs/preview';

import { extensionResolverControls, previewControlContract } from './extension-resolver.en.controls';
import { renderExtensionResolverPreview } from './extension-resolver-preview';

/** Controls fallback for runtime field resolution */
export const previewControls = extensionResolverControls;

const controlledPreview = defineControlledPreview(previewControlContract, renderExtensionResolverPreview);

/** Stable source configuration derived from the canonical state */
export const previewSource = controlledPreview.source;

/** Runtime field resolver escape-hatch example */
export default controlledPreview.Component;
