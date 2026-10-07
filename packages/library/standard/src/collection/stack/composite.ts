import { defineComposite } from '@retikz/core';
import type { LayoutCompositeDefinition, CoreDependencyProvider } from '@retikz/core';
import { PathClipProvider } from '@retikz/extension';

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

/** 保留作者稀疏字段与栈底到栈顶顺序 */
export const createStack = (input: IRStack): IRStack => ({ ...input });

/** Stack 及单格裁切依赖 */
export const StackProvider: CoreDependencyProvider = {
  key: { capability: 'composite', namespace: 'standard', type: 'stack' },
  dependencies: [PathClipProvider.key],
  datasets: {},
  makeDefinition: () => StackDefinition,
};
