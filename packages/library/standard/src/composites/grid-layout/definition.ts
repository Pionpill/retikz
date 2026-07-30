import type { LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { IRGridLayout } from './types';

import { compileGridLayout } from './compile';
import { GridLayoutSchema } from './schema';

/** Standard GridLayout 的官方 Core layout-aware composite definition */
export const GridLayoutDefinition: LayoutCompositeDefinition<IRGridLayout, 'standard', 'gridLayout'> = defineComposite({
  namespace: 'standard',
  type: 'gridLayout',
  schema: GridLayoutSchema,
  compile: compileGridLayout,
});
