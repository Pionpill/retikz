import type { StandardCapabilityModule } from '../../../capability';

import { GridLayoutDefinition } from './definition';

/** Standard GridLayout 的显式 capability module */
export const GridLayoutModule: StandardCapabilityModule = Object.freeze({
  name: 'standard.gridLayout',
  composites: Object.freeze([GridLayoutDefinition]),
});
