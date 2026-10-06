import { defineComposite } from '@retikz/core';
import type { LayoutCompositeDefinition } from '@retikz/core';

import { compileStack } from './pipeline';
import { StackSchema } from './schema';
import type { IRStack } from './schema';

/** Stack 的布局感知编译定义 */
export const StackDefinition: LayoutCompositeDefinition<IRStack, 'standard', 'stack'> = defineComposite({
  namespace: 'standard',
  type: 'stack',
  schema: StackSchema,
  compile: compileStack,
});
