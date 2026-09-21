import { defineComposite } from '@retikz/core';

import { lowerEllipse } from './pipeline';
import { EllipseSchema } from './schema';
import type { IREllipse } from './types';
/** Ellipse 的 Core composite 注册项 */
export const EllipseDefinition = defineComposite({
  namespace: 'standard',
  type: 'ellipse',
  schema: EllipseSchema,
  expand: (source: IREllipse) => ({ children: [lowerEllipse(source)] }),
});
