import type { LayoutCompositeDefinition } from '@retikz/core';
import { defineComposite } from '@retikz/core';

import { compileArray } from './pipeline';
import { ArraySchema } from './schema';
import type { IRArray } from './schema';

/** Standard Array 的布局感知 Definition */
export const ArrayDefinition: LayoutCompositeDefinition<IRArray, 'standard', 'array'> = defineComposite({
  namespace: 'standard',
  type: 'array',
  schema: ArraySchema,
  compile: compileArray,
});
