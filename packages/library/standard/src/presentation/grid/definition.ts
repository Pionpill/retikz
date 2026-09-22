import type { ExpandCompositeDefinition } from '@retikz/core';
import { defineComposite } from '@retikz/core';

import { STANDARD_NAMESPACE } from '../../shared';
import { lowerGrid } from './pipeline';
import { GridSchema } from './schema';
import type { IRGrid } from './types';

/** Standard Grid 的官方 Core composite definition */
export const GridDefinition = defineComposite({
  namespace: STANDARD_NAMESPACE,
  type: 'grid',
  schema: GridSchema,
  expand: grid => ({ children: [lowerGrid(grid)] }),
} satisfies ExpandCompositeDefinition<IRGrid, typeof STANDARD_NAMESPACE, 'grid'>);
