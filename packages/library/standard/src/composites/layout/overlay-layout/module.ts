import type { StandardCapabilityModule } from '../../../capability';

import { OverlayLayoutDefinition } from './definition';

/** Standard OverlayLayout 的显式 capability module */
export const OverlayLayoutModule: StandardCapabilityModule = Object.freeze({
  name: 'standard.overlayLayout',
  composites: Object.freeze([OverlayLayoutDefinition]),
});
