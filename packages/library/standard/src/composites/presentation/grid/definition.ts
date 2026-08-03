import type { ExpandCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { IRGrid } from './types';

import { STANDARD_NAMESPACE } from '../../shared';
import { lowerGrid } from './lower';
import { GridSchema } from './schema';

/** Standard Grid 的官方 Core composite definition */
export const GridDefinition: ExpandCompositeDefinition<IRGrid, typeof STANDARD_NAMESPACE, 'grid'> = defineComposite({
  namespace: STANDARD_NAMESPACE,
  type: 'grid',
  schema: GridSchema,
  expand: lowerGrid,
});
