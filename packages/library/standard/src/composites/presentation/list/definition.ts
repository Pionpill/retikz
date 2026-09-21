import type { LayoutCompositeDefinition } from '@retikz/core';
import { defineComposite } from '@retikz/core';

import { compileList } from './pipeline';
import { ListSchema } from './schemas';
import type { IRList } from './schemas';

/** Standard List 的布局感知 Definition */
export const ListDefinition: LayoutCompositeDefinition<IRList, 'standard', 'list'> = defineComposite({
  namespace: 'standard',
  type: 'list',
  schema: ListSchema,
  compile: compileList,
});
