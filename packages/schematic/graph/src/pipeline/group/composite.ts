import type { CompositeDefinition, CompositeCoreProviderKey, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';
import { flexLayoutProvider } from '@retikz/layout';
import { surfaceProvider } from '@retikz/standard/presentation';

import type { GraphDefinitionOptions } from '../../contract';
import type { GraphDefinitionRegistries } from '../../providers';
import { resolveGraphDefinitionOptions, resolveGraphRuntimeOptions } from '../../providers';
import type { IRGroup } from '../../schemas';
import { GroupSchema } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { blockProviderKey } from '../block';
import { entityProviderKey } from '../entity';
import { relationProviderKey } from '../relation';
import { groupBodyAllocationProviderKey } from './allocation';
import { createCompileGroup } from './compile';

/** 用已解析 registries 创建 Group Composite Definition */
export const createGroupDefinitionFromOptions = (
  options: GraphDefinitionRegistries,
): CompositeDefinition<IRGroup, typeof GRAPH_NAMESPACE, typeof GraphType.Group> =>
  defineComposite({
    namespace: GRAPH_NAMESPACE,
    type: GraphType.Group,
    schema: GroupSchema,
    compile: createCompileGroup(options),
  });

/** 创建使用指定 registries 的 Group Composite Definition */
export const createGroupDefinition = (
  options: GraphDefinitionOptions = {},
): CompositeDefinition<IRGroup, typeof GRAPH_NAMESPACE, typeof GraphType.Group> =>
  createGroupDefinitionFromOptions(resolveGraphDefinitionOptions(options));

/** 使用内置 registries 的默认 Group Composite Definition */
export const groupDefinition: CompositeDefinition<IRGroup, typeof GRAPH_NAMESPACE, typeof GraphType.Group> =
  createGroupDefinition();

/** Group Composite provider 的公开完整 key */
export const groupProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: GRAPH_NAMESPACE,
  type: GraphType.Group,
});

const makeGroupDefinition: CoreDependencyProvider<GraphDefinitionOptions>['makeDefinition'] = contributions =>
  createGroupDefinitionFromOptions(resolveGraphRuntimeOptions(contributions));

/** 创建携带当前 Graph definition options 的 Group provider */
export const createGroupProvider = (
  options: GraphDefinitionOptions = {},
): CoreDependencyProvider<GraphDefinitionOptions> =>
  Object.freeze({
    key: groupProviderKey,
    dependencies: Object.freeze([
      blockProviderKey,
      entityProviderKey,
      relationProviderKey,
      groupBodyAllocationProviderKey,
      flexLayoutProvider.key,
      surfaceProvider.key,
    ]),
    params: options,
    makeDefinition: makeGroupDefinition,
  });

/** 使用内置 Graph registries 的默认 Group provider */
export const groupProvider = createGroupProvider();
