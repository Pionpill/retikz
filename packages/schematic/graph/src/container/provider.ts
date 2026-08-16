import type { CoreDependencyProvider } from '@retikz/core';

import { ContainerDefinition } from './definition';

const makeContainerDefinition = () => ContainerDefinition;

/** Container 的 Core Composite dependency provider */
export const ContainerProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({
    capability: 'composite',
    namespace: ContainerDefinition.namespace,
    type: ContainerDefinition.type,
  }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeContainerDefinition,
});
