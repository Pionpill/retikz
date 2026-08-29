import type { CompositeCoreProviderKey, CoreDependencyProvider } from '@retikz/core';

import { FlexLayoutProvider } from '@retikz/layout';
import { SurfaceProvider } from '@retikz/standard';

import type { GraphDefinitionOptions } from '../../contract';

import { createGraphRuntimeDatasets, resolveGraphRuntimeOptions } from '../../providers';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { EntityProviderKey } from '../entity';
import { RelationProviderKey } from '../relation';
import { createBlockDefinitionFromOptions } from './definition';
import { BlockHeaderProviderKey, BlockRowProviderKey, BlockSectionProviderKey } from './structure-provider';

/** Block Composite provider 的公开完整 key */
export const BlockProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: GRAPH_NAMESPACE,
  type: GraphType.Block,
});

const makeBlockDefinition: CoreDependencyProvider['makeDefinition'] = datasets =>
  createBlockDefinitionFromOptions(resolveGraphRuntimeOptions(datasets));

/** 创建携带当前 Graph definition options 的 Block provider */
export const createBlockProvider = (options: GraphDefinitionOptions = {}): CoreDependencyProvider =>
  Object.freeze({
    key: BlockProviderKey,
    dependencies: Object.freeze([
      BlockHeaderProviderKey,
      BlockSectionProviderKey,
      BlockRowProviderKey,
      EntityProviderKey,
      RelationProviderKey,
      FlexLayoutProvider.key,
      SurfaceProvider.key,
    ]),
    datasets: createGraphRuntimeDatasets(options),
    makeDefinition: makeBlockDefinition,
  });

/** 使用内置 Graph registries 的默认 Block provider */
export const BlockProvider = createBlockProvider();
