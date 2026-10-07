import { defineComposite } from '@retikz/core';
import type { LayoutCompositeDefinition } from '@retikz/core';

import { compileTree } from './pipeline';
import { TreeSchema } from './schema';
import type { IRTree } from './schema';

/** Tree 的布局感知编译定义 */
export const TreeDefinition: LayoutCompositeDefinition<IRTree, 'standard', 'tree'> = defineComposite({
  namespace: 'standard',
  type: 'tree',
  schema: TreeSchema,
  compile: compileTree,
});
