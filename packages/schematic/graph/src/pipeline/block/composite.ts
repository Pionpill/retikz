import type { CompositeDefinition, CompositeCoreProviderKey, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';
import { flexLayoutProvider } from '@retikz/layout';
import { surfaceProvider } from '@retikz/standard/presentation';

import type { GraphDefinitionOptions } from '../../contract';
import type { GraphDefinitionRegistries } from '../../providers';
import { resolveGraphDefinitionOptions, resolveGraphRuntimeOptions } from '../../providers';
import type { IRBlock } from '../../schemas';
import { BlockSchema } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { entityProviderKey } from '../entity';
import { relationProviderKey } from '../relation';
import { createCompileBlock } from './compile';
import { blockHeaderProviderKey, blockRowProviderKey, blockSectionProviderKey } from './structure-provider';

/** 用已解析 registries 创建 Block Composite Definition */
export const createBlockDefinitionFromOptions = (
  options: GraphDefinitionRegistries,
): CompositeDefinition<IRBlock, typeof GRAPH_NAMESPACE, typeof GraphType.Block> =>
  defineComposite({
    namespace: GRAPH_NAMESPACE,
    type: GraphType.Block,
    schema: BlockSchema,
    compile: createCompileBlock(options),
  });

/** 创建使用指定 registries 的 Block Composite Definition */
export const createBlockDefinition = (
  options: GraphDefinitionOptions = {},
): CompositeDefinition<IRBlock, typeof GRAPH_NAMESPACE, typeof GraphType.Block> =>
  createBlockDefinitionFromOptions(resolveGraphDefinitionOptions(options));

/** 使用内置 registries 的默认 Block Composite Definition */
export const blockDefinition: CompositeDefinition<IRBlock, typeof GRAPH_NAMESPACE, typeof GraphType.Block> =
  createBlockDefinition();

/** Block Composite provider 的公开完整 key */
export const blockProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: GRAPH_NAMESPACE,
  type: GraphType.Block,
});

const makeBlockDefinition: CoreDependencyProvider<GraphDefinitionOptions>['makeDefinition'] = contributions =>
  createBlockDefinitionFromOptions(resolveGraphRuntimeOptions(contributions));

/** 创建携带当前 Graph definition options 的 Block provider */
export const createBlockProvider = (
  options: GraphDefinitionOptions = {},
): CoreDependencyProvider<GraphDefinitionOptions> =>
  Object.freeze({
    key: blockProviderKey,
    dependencies: Object.freeze([
      blockHeaderProviderKey,
      blockSectionProviderKey,
      blockRowProviderKey,
      entityProviderKey,
      relationProviderKey,
      flexLayoutProvider.key,
      surfaceProvider.key,
    ]),
    params: options,
    makeDefinition: makeBlockDefinition,
  });

/** 使用内置 Graph registries 的默认 Block provider */
export const blockProvider = createBlockProvider();
