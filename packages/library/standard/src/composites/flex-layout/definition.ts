import type { LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { IRFlexLayout } from './types';

import { compileFlexLayout } from './compile';
import { FlexLayoutSchema } from './schema';

/** Standard FlexLayout 的官方 Core layout-aware composite definition */
export const FlexLayoutDefinition: LayoutCompositeDefinition<IRFlexLayout, 'standard', 'flexLayout'> = defineComposite({
  namespace: 'standard',
  type: 'flexLayout',
  schema: FlexLayoutSchema,
  compile: compileFlexLayout,
});
