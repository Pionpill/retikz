import type { CompositeCoreProviderKey, CoreDependencyProvider } from '@retikz/core';
import { flexLayoutProvider } from '@retikz/layout';
import { surfaceProvider } from '@retikz/standard/presentation';

import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { entityProviderKey } from '../entity';
import { relationProviderKey } from '../relation';
import { blockHeaderDefinition, blockRowDefinition, blockSectionDefinition } from './structure-definition';

const STRUCTURE_DEPENDENCIES = Object.freeze([
  entityProviderKey,
  relationProviderKey,
  flexLayoutProvider.key,
  surfaceProvider.key,
]);

/** Block Header Composite provider 的公开完整 key */
export const blockHeaderProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: GRAPH_NAMESPACE,
  type: GraphType.BlockHeader,
});

/** Block Section Composite provider 的公开完整 key */
export const blockSectionProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: GRAPH_NAMESPACE,
  type: GraphType.BlockSection,
});

/** Block Row Composite provider 的公开完整 key */
export const blockRowProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: GRAPH_NAMESPACE,
  type: GraphType.BlockRow,
});

/** Block Header 的 Core Composite dependency provider */
export const blockHeaderProvider: CoreDependencyProvider = Object.freeze({
  key: blockHeaderProviderKey,
  dependencies: STRUCTURE_DEPENDENCIES,
  makeDefinition: () => blockHeaderDefinition,
});

/** Block Section 的 Core Composite dependency provider */
export const blockSectionProvider: CoreDependencyProvider = Object.freeze({
  key: blockSectionProviderKey,
  dependencies: STRUCTURE_DEPENDENCIES,
  makeDefinition: () => blockSectionDefinition,
});

/** Block Row 的 Core Composite dependency provider */
export const blockRowProvider: CoreDependencyProvider = Object.freeze({
  key: blockRowProviderKey,
  dependencies: STRUCTURE_DEPENDENCIES,
  makeDefinition: () => blockRowDefinition,
});
