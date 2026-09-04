import type { CompositeCoreProviderKey, CoreDependencyProvider } from '@retikz/core';

import {
  DiamondArrowProvider,
  OpenDiamondArrowProvider,
  SquareArrowProvider,
  StraightBarbArrowProvider,
} from '@retikz/standard/arrow';

import type { GraphDefinitionOptions } from '../../contract';

import { createGraphRuntimeDatasets, resolveGraphRuntimeOptions } from '../../providers';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { createRelationDefinitionFromOptions } from './definition';

/** Relation Composite provider 的公开完整 key */
export const RelationProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: GRAPH_NAMESPACE,
  type: GraphType.Relation,
});

/** 使用当前 provider key 已合并的 runtime datasets 创建唯一 Relation Definition */
const makeRelationDefinition: CoreDependencyProvider['makeDefinition'] = datasets =>
  createRelationDefinitionFromOptions(resolveGraphRuntimeOptions(datasets));

/** 创建携带当前 Graph definition options 的 Relation provider */
export const createRelationProvider = (options: GraphDefinitionOptions = {}): CoreDependencyProvider =>
  Object.freeze({
    key: RelationProviderKey,
    dependencies: Object.freeze([
      StraightBarbArrowProvider.key,
      SquareArrowProvider.key,
      DiamondArrowProvider.key,
      OpenDiamondArrowProvider.key,
    ]),
    datasets: createGraphRuntimeDatasets(options),
    makeDefinition: makeRelationDefinition,
  });

/** 使用内置 Graph registries 的默认 Relation provider */
export const RelationProvider = createRelationProvider();
