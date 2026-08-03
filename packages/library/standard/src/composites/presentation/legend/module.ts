import type { StandardCapabilityModule } from '../../../capability';

import { LegendDefinition } from './definition';

/** Standard Legend 的显式 capability module */
export const LegendModule: StandardCapabilityModule = Object.freeze({
  name: 'standard.legend',
  composites: Object.freeze([LegendDefinition]),
});
