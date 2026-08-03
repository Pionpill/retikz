import type { ExpandCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { IRAxes } from './types';

import { lowerAxes } from './lower';
import { AxesSchema } from './schema';

/** Standard Axes 的官方 Core composite definition */
export const AxesDefinition: ExpandCompositeDefinition<IRAxes, 'standard', 'axes'> = defineComposite({
  namespace: 'standard',
  type: 'axes',
  schema: AxesSchema,
  expand: lowerAxes,
});
