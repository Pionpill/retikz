import { defineComposite } from '@retikz/core';

import { lowerAxes } from './lower';
import { AxesSchema } from './schema';

/** Standard Axes 的官方 Core composite definition */
export const AxesDefinition = defineComposite({
  namespace: 'standard',
  type: 'axes',
  schema: AxesSchema,
  expand: lowerAxes,
});
