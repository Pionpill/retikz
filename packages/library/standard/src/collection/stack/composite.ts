import { defineComposite } from '@retikz/core';
import type { CompositeDefinition, CoreDependencyProvider } from '@retikz/core';
import { pathClipProvider } from '@retikz/extension';

import { compileStack } from './pipeline';
import { StackSchema } from './schema';
import type { IRStack } from './schema';

/** Stack 的布局感知编译定义 */
export const stackDefinition: CompositeDefinition<IRStack, 'standard', 'stack'> = defineComposite({
  namespace: 'standard',
  type: 'stack',
  schema: StackSchema,
  compile: compileStack,
});

/** 保留作者稀疏字段与栈底到栈顶顺序 */
export const createStack = (input: IRStack): IRStack => ({ ...input });

/** Stack 及单格裁切依赖 */
export const stackProvider: CoreDependencyProvider = {
  key: { capability: 'composite', namespace: 'standard', type: 'stack' },
  dependencies: [pathClipProvider.key],
  makeDefinition: () => stackDefinition,
};
