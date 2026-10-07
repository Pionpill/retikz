import type { ExpandCompositeDefinition, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';

import { STANDARD_NAMESPACE } from '../../shared';
import { lowerGrid } from './pipeline';
import { GridSchema } from './schema';
import type { IRGrid, GridInput } from './types';

/** Standard Grid 的官方 Core composite definition */
export const GridDefinition = defineComposite({
  namespace: STANDARD_NAMESPACE,
  type: 'grid',
  schema: GridSchema,
  expand: grid => ({ children: [lowerGrid(grid)] }),
} satisfies ExpandCompositeDefinition<IRGrid, typeof STANDARD_NAMESPACE, 'grid'>);

/** 组装持久化的 Standard Grid composite */
export const createGrid = (input: GridInput): IRGrid => ({
  namespace: STANDARD_NAMESPACE,
  type: 'grid',
  ...input,
});

/** Grid 的 Core Composite dependency provider */
export const GridProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: GridDefinition.namespace, type: GridDefinition.type }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => GridDefinition,
});
