import type { LayoutCompositeDefinition } from '@retikz/core';
import { defineComposite } from '@retikz/core';

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
