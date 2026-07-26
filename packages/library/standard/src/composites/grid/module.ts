import type { StandardCapabilityModule } from '../../capability';

import { GridDefinition } from './definition';

/** Standard Grid 的显式 capability module */
export const GridModule: StandardCapabilityModule = Object.freeze({
  name: 'standard.grid',
  composites: Object.freeze([GridDefinition]),
});
