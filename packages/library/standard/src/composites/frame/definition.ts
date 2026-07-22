import { defineComposite } from '@retikz/core';

import { lowerFrame } from './lower';
import { FrameSchema } from './schema';

/** Standard Frame 的官方 Core composite definition */
export const FrameDefinition = defineComposite({
  namespace: 'standard',
  type: 'frame',
  schema: FrameSchema,
  expand: lowerFrame,
});
