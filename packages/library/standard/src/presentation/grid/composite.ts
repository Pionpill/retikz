import type { CompositeDefinition, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';

import { STANDARD_NAMESPACE } from '../../shared';
import { lowerGrid } from './pipeline';
import { GridSchema } from './schema';
import type { IRGrid, InputGrid } from './types';

/** Standard Grid 的官方 Core composite definition */
export const gridDefinition = defineComposite({
  namespace: STANDARD_NAMESPACE,
  type: 'grid',
  schema: GridSchema,
  compile: grid => ({ children: [lowerGrid(grid)] }),
} satisfies CompositeDefinition<IRGrid, typeof STANDARD_NAMESPACE, 'grid'>);

/** 组装持久化的 Standard Grid composite */
export const createGrid = (input: InputGrid): IRGrid => ({
  namespace: STANDARD_NAMESPACE,
  type: 'grid',
  ...input,
});

/** Grid 的 Core Composite dependency provider */
export const gridProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: gridDefinition.namespace, type: gridDefinition.type }),
  makeDefinition: () => gridDefinition,
});
