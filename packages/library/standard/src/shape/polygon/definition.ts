import { defineComposite } from '@retikz/core';

import { lowerPolygon } from './pipeline';
import { PolygonSchema } from './schema';
import type { IRPolygon } from './types';

/** Polygon 的 Core composite 注册项 */
export const PolygonDefinition = defineComposite({
  namespace: 'standard',
  type: 'polygon',
  schema: PolygonSchema,
  expand: (source: IRPolygon) => ({ children: [lowerPolygon(source)] }),
});
