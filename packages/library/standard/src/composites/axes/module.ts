import type { StandardCapabilityModule } from '../../capability';

import { AxesDefinition } from './definition';

/** Standard Axes 的显式 capability module */
export const AxesModule: StandardCapabilityModule = Object.freeze({
  name: 'standard.axes',
  composites: Object.freeze([AxesDefinition]),
});
