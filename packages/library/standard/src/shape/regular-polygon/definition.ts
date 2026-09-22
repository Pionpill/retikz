import { defineComposite } from '@retikz/core';

import { lowerRegularPolygon } from './pipeline';
import { RegularPolygonSchema } from './schema';
import type { IRRegularPolygon } from './types';
/** RegularPolygon 的 Core composite 注册项 */
export const RegularPolygonDefinition = defineComposite({
  namespace: 'standard',
  type: 'regularPolygon',
  schema: RegularPolygonSchema,
  expand: (source: IRRegularPolygon) => ({ children: [lowerRegularPolygon(source)] }),
});
