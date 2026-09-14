import type { LayoutCompositeDefinition } from '@retikz/core';
import { defineComposite } from '@retikz/core';

import { STANDARD_NAMESPACE } from '../../shared';
import { compileFrame } from './pipeline';
import { FrameSchema } from './schema';
import type { IRFrame } from './types';

/** Standard Frame 的官方 Core composite definition */
export const FrameDefinition: LayoutCompositeDefinition<IRFrame, typeof STANDARD_NAMESPACE, 'frame'> = defineComposite({
  namespace: STANDARD_NAMESPACE,
  type: 'frame',
  schema: FrameSchema,
  compile: compileFrame,
});
