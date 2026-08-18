import type { CompositeCoreProviderKey, CoreDependencyProvider } from '@retikz/core';

import { RelationDefinition } from './definition';

/** Relation Composite provider 的公开完整 key */
export const RelationProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: RelationDefinition.namespace,
  type: RelationDefinition.type,
});

/** Relation 的 Core Composite dependency provider */
export const RelationProvider: CoreDependencyProvider = Object.freeze({
  key: RelationProviderKey,
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => RelationDefinition,
});
