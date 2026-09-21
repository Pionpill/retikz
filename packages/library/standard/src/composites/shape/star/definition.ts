import { defineComposite } from '@retikz/core';

import { lowerStar } from './pipeline';
import { StarSchema } from './schema';
import type { IRStar } from './types';
/** Star 的 Core composite 注册项 */
export const StarDefinition = defineComposite({
  namespace: 'standard',
  type: 'star',
  schema: StarSchema,
  expand: (source: IRStar) => ({ children: [lowerStar(source)] }),
});
