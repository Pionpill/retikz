import { defineComposite } from '@retikz/core';
import type { LayoutCompositeDefinition, CoreDependencyProvider } from '@retikz/core';

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

/** 保留作者稀疏字段与有序递归结构 */
export const createTree = (input: IRTree): IRTree => ({ ...input });

/** Tree 复用 Core 内置节点和路径，扩展形状由宿主装配 */
export const TreeProvider: CoreDependencyProvider = {
  key: { capability: 'composite', namespace: 'standard', type: 'tree' },
  dependencies: [],
  datasets: {},
  makeDefinition: () => TreeDefinition,
};
