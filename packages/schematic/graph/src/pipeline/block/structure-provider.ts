import type { CompositeCoreProviderKey, CoreDependencyProvider } from '@retikz/core';

import { FlexLayoutProvider } from '@retikz/layout';
import { SurfaceProvider } from '@retikz/standard';

import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { EntityProviderKey } from '../entity';
import { RelationProviderKey } from '../relation';
import { BlockHeaderDefinition, BlockRowDefinition, BlockSectionDefinition } from './structure-definition';

const STRUCTURE_DEPENDENCIES = Object.freeze([
  EntityProviderKey,
  RelationProviderKey,
  FlexLayoutProvider.key,
  SurfaceProvider.key,
]);

/** Block Header Composite provider 的公开完整 key */
export const BlockHeaderProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: GRAPH_NAMESPACE,
  type: GraphType.BlockHeader,
});

/** Block Section Composite provider 的公开完整 key */
export const BlockSectionProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: GRAPH_NAMESPACE,
  type: GraphType.BlockSection,
});

/** Block Row Composite provider 的公开完整 key */
export const BlockRowProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: GRAPH_NAMESPACE,
  type: GraphType.BlockRow,
});

/** Block Header 的 Core Composite dependency provider */
export const BlockHeaderProvider: CoreDependencyProvider = Object.freeze({
  key: BlockHeaderProviderKey,
  dependencies: STRUCTURE_DEPENDENCIES,
  datasets: Object.freeze({}),
  makeDefinition: () => BlockHeaderDefinition,
});

/** Block Section 的 Core Composite dependency provider */
export const BlockSectionProvider: CoreDependencyProvider = Object.freeze({
  key: BlockSectionProviderKey,
  dependencies: STRUCTURE_DEPENDENCIES,
  datasets: Object.freeze({}),
  makeDefinition: () => BlockSectionDefinition,
});

/** Block Row 的 Core Composite dependency provider */
export const BlockRowProvider: CoreDependencyProvider = Object.freeze({
  key: BlockRowProviderKey,
  dependencies: STRUCTURE_DEPENDENCIES,
  datasets: Object.freeze({}),
  makeDefinition: () => BlockRowDefinition,
});
