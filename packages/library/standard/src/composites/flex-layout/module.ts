import type { StandardCapabilityModule } from '../../capability';

import { FlexLayoutDefinition } from './definition';

/** Standard FlexLayout 的显式 capability module */
export const FlexLayoutModule: StandardCapabilityModule = Object.freeze({
  name: 'standard.flexLayout',
  composites: Object.freeze([FlexLayoutDefinition]),
});
