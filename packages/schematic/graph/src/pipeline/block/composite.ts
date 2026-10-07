import type { LayoutCompositeDefinition, CompositeCoreProviderKey, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';
import { FlexLayoutProvider } from '@retikz/layout';
import { SurfaceProvider } from '@retikz/standard/presentation';

import type { GraphDefinitionOptions } from '../../contract';
import type { ResolvedGraphDefinitionOptions } from '../../providers';
import { resolveGraphDefinitionOptions, createGraphRuntimeDatasets, resolveGraphRuntimeOptions } from '../../providers';
import type { IRBlock } from '../../schemas';
import { BlockSchema } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { EntityProviderKey } from '../entity';
import { RelationProviderKey } from '../relation';
import { createCompileBlock } from './compile';
import { BlockHeaderProviderKey, BlockRowProviderKey, BlockSectionProviderKey } from './structure-provider';

/** 用已解析 registries 创建 Block Composite Definition */
export const createBlockDefinitionFromOptions = (
  options: ResolvedGraphDefinitionOptions,
): LayoutCompositeDefinition<IRBlock, typeof GRAPH_NAMESPACE, typeof GraphType.Block> =>
  defineComposite({
    namespace: GRAPH_NAMESPACE,
    type: GraphType.Block,
    schema: BlockSchema,
    compile: createCompileBlock(options),
  });

/** 创建使用指定 registries 的 Block Composite Definition */
export const createBlockDefinition = (
  options: GraphDefinitionOptions = {},
): LayoutCompositeDefinition<IRBlock, typeof GRAPH_NAMESPACE, typeof GraphType.Block> =>
  createBlockDefinitionFromOptions(resolveGraphDefinitionOptions(options));

/** 使用内置 registries 的默认 Block Composite Definition */
export const BlockDefinition: LayoutCompositeDefinition<IRBlock, typeof GRAPH_NAMESPACE, typeof GraphType.Block> =
  createBlockDefinition();

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
