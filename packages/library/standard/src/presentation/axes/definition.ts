import type { ExpandCompositeDefinition } from '@retikz/core';
import { defineComposite } from '@retikz/core';

import { STANDARD_NAMESPACE } from '../../shared';
import { lowerAxes } from './pipeline';
import { AxesSchema } from './schema';
import type { IRAxes } from './types';

/** Standard Axes 的官方 Core composite definition */
export const AxesDefinition = defineComposite({
  namespace: STANDARD_NAMESPACE,
  type: 'axes',
  schema: AxesSchema,
  expand: axes => ({ children: [lowerAxes(axes)] }),
} satisfies ExpandCompositeDefinition<IRAxes, typeof STANDARD_NAMESPACE, 'axes'>);
