import type { ExpandCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { IRFrame } from './types';

import { lowerFrame } from './lower';
import { FrameSchema } from './schema';

/** Standard Frame 的官方 Core composite definition */
export const FrameDefinition: ExpandCompositeDefinition<IRFrame, 'standard', 'frame'> = defineComposite({
  namespace: 'standard',
  type: 'frame',
  schema: FrameSchema,
  expand: lowerFrame,
});
