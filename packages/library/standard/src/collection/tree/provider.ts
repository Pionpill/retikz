import type { CoreDependencyProvider } from '@retikz/core';

import { TreeDefinition } from './definition';

/** Tree 复用 Core 内置节点和路径，扩展形状由宿主装配 */
export const TreeProvider: CoreDependencyProvider = {
  key: { capability: 'composite', namespace: 'standard', type: 'tree' },
  dependencies: [],
  datasets: {},
  makeDefinition: () => TreeDefinition,
};
