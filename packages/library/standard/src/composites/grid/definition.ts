import type { ExpandCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { IRGrid } from './types';

import { lowerGrid } from './lower';
import { GridSchema } from './schema';

/** Standard Grid 的官方 Core composite definition */
export const GridDefinition: ExpandCompositeDefinition<IRGrid, 'standard', 'grid'> = defineComposite({
  namespace: 'standard',
  type: 'grid',
  schema: GridSchema,
  expand: lowerGrid,
});
