import type { ExpandCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { IRAxes } from './types';

import { STANDARD_NAMESPACE } from '../../shared';
import { lowerAxes } from './lower';
import { AxesSchema } from './schema';

/** Standard Axes 的官方 Core composite definition */
export const AxesDefinition: ExpandCompositeDefinition<IRAxes, typeof STANDARD_NAMESPACE, 'axes'> = defineComposite({
  namespace: STANDARD_NAMESPACE,
  type: 'axes',
  schema: AxesSchema,
  expand: lowerAxes,
});
