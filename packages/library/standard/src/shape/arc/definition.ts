import { defineComposite } from '@retikz/core';

import { lowerArc } from './pipeline';
import { ArcSchema } from './schema';
import type { IRArc } from './types';
/** Arc 的 Core composite 注册项 */
export const ArcDefinition = defineComposite({
  namespace: 'standard',
  type: 'arc',
  schema: ArcSchema,
  expand: (source: IRArc) => ({ children: [lowerArc(source)] }),
});
