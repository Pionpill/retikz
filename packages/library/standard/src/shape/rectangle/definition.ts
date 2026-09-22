import { defineComposite } from '@retikz/core';

import { lowerRectangle } from './pipeline';
import { RectangleSchema } from './schema';
import type { IRRectangle } from './types';
/** Rectangle 的 Core composite 注册项 */
export const RectangleDefinition = defineComposite({
  namespace: 'standard',
  type: 'rectangle',
  schema: RectangleSchema,
  expand: (source: IRRectangle) => ({ children: [lowerRectangle(source)] }),
});
