import type { CoreDependencyProvider } from '@retikz/core';

import { RelationDefinition } from './definition';

/** Relation 的 Core Composite dependency provider */
export const RelationProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({
    capability: 'composite',
    namespace: RelationDefinition.namespace,
    type: RelationDefinition.type,
  }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => RelationDefinition,
});
