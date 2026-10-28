import type { CompositeDefinition, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';
import { pathClipProvider } from '@retikz/extension';

import { compileChain } from './pipeline';
import { ChainSchema } from './schema';
import type { IRChain } from './schema';

/** Standard Chain 的布局感知 Definition */
export const chainDefinition: CompositeDefinition<IRChain, 'standard', 'chain'> = defineComposite({
  namespace: 'standard',
  type: 'chain',
  schema: ChainSchema,
  compile: compileChain,
});

/** 保留稀疏 Source 的链工厂 */
export const createChain = (input: IRChain): IRChain => ({ ...input });

/** Chain 与单元格 lower target 的按需依赖声明 */
export const chainProvider: CoreDependencyProvider = {
  key: { capability: 'composite', namespace: 'standard', type: 'chain' },
  dependencies: [pathClipProvider.key],
  makeDefinition: () => chainDefinition,
};
