import { defineComposite } from '@retikz/core';

import { lowerCircle } from './pipeline';
import { CircleSchema } from './schema';
import type { IRCircle } from './types';
/** Circle 的 Core composite 注册项 */
export const CircleDefinition = defineComposite({
  namespace: 'standard',
  type: 'circle',
  schema: CircleSchema,
  expand: (source: IRCircle) => ({ children: [lowerCircle(source)] }),
});
