import type { LayoutCompositeDefinition } from '@retikz/core';
import { defineComposite } from '@retikz/core';

import { compileMap } from './pipeline';
import { MapSchema } from './schemas';
import type { IRMap } from './schemas';
/** Standard Map 的布局感知 Definition */
export const MapDefinition: LayoutCompositeDefinition<IRMap, 'standard', 'map'> = defineComposite({
  namespace: 'standard',
  type: 'map',
  schema: MapSchema,
  compile: compileMap,
});
