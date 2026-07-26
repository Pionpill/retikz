import type { StandardCapabilityModule } from '../../capability';

import { FrameDefinition } from './definition';

/** Standard Frame 的显式 capability module */
export const FrameModule: StandardCapabilityModule = Object.freeze({
  name: 'standard.frame',
  composites: Object.freeze([FrameDefinition]),
});
