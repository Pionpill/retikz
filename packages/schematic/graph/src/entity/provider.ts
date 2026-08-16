import type { CoreDependencyProvider } from '@retikz/core';

import { EntityDefinition } from './definition';

/** Entity 的 Core Composite dependency provider */
export const EntityProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({
    capability: 'composite',
    namespace: EntityDefinition.namespace,
    type: EntityDefinition.type,
  }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => EntityDefinition,
});

/** 创建 Entity provider 集合 */
export const createEntityProviders = (): ReadonlyArray<CoreDependencyProvider> => Object.freeze([EntityProvider]);
