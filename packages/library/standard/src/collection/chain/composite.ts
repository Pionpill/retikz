import type { LayoutCompositeDefinition, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';
import { PathClipProvider } from '@retikz/extension';

import { compileChain } from './pipeline';
import { ChainSchema } from './schema';
import type { IRChain } from './schema';

/** Standard Chain 的布局感知 Definition */
export const ChainDefinition: LayoutCompositeDefinition<IRChain, 'standard', 'chain'> = defineComposite({
  namespace: 'standard',
  type: 'chain',
  schema: ChainSchema,
  compile: compileChain,
});

/** 保留稀疏 Source 的链工厂 */
export const createChain = (input: IRChain): IRChain => ({ ...input });

/** Chain 与单元格 lower target 的按需依赖声明 */
export const ChainProvider: CoreDependencyProvider = {
  key: { capability: 'composite', namespace: 'standard', type: 'chain' },
  dependencies: [PathClipProvider.key],
  datasets: {},
  makeDefinition: () => ChainDefinition,
};
