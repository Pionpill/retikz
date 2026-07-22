import { defineComposite } from '@retikz/core';

import { lowerGrid } from './lower';
import { GridSchema } from './schema';

/** Standard Grid 的官方 Core composite definition */
export const GridDefinition = defineComposite({
  namespace: 'standard',
  type: 'grid',
  schema: GridSchema,
  expand: lowerGrid,
});
