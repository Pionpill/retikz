import type { ExpandCompositeDefinition, CompositeCoreProviderKey, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';
import { EllipticCapsuleShapeProvider, HexagonShapeProvider } from '@retikz/extension';

import type { GraphDefinitionOptions } from '../../contract';
import type { ResolvedGraphDefinitionOptions } from '../../providers';
import { resolveGraphDefinitionOptions, createGraphRuntimeDatasets, resolveGraphRuntimeOptions } from '../../providers';
import { resolveEntity, resolveEntityAppearance } from '../../resolve';
import type { IRGraphEntity } from '../../schemas';
import { EntitySchema } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import { lowerEntity } from './lower';

/** 使用已解析 Graph definitions 创建独立 Entity Composite Definition */
export const createEntityDefinitionFromOptions = (
  options: ResolvedGraphDefinitionOptions,
): ExpandCompositeDefinition<IRGraphEntity, typeof GRAPH_NAMESPACE, typeof GraphType.Entity> =>
  defineComposite({
    namespace: GRAPH_NAMESPACE,
    type: GraphType.Entity,
    schema: EntitySchema,
    expand: (source, context) => {
      const entity = resolveEntity(source, options);
      const appearance = resolveEntityAppearance(entity, { ...options, theme: context.theme });
      return { children: [lowerEntity(entity, appearance)] };
    },
  });

/** 创建使用指定 Graph definitions 的独立 Entity Composite Definition */
export const createEntityDefinition = (
  options: GraphDefinitionOptions = {},
): ExpandCompositeDefinition<IRGraphEntity, typeof GRAPH_NAMESPACE, typeof GraphType.Entity> =>
  createEntityDefinitionFromOptions(resolveGraphDefinitionOptions(options));

/** 使用内置 Graph definitions 的默认 Entity Composite Definition */
export const EntityDefinition = createEntityDefinition();

/** Entity Composite provider 的公开完整 key */
export const EntityProviderKey: CompositeCoreProviderKey = Object.freeze({
  capability: 'composite',
  namespace: GRAPH_NAMESPACE,
  type: GraphType.Entity,
});

/** 使用当前 provider key 已合并的 runtime datasets 创建唯一 Entity Definition */
const makeEntityDefinition: CoreDependencyProvider['makeDefinition'] = datasets =>
  createEntityDefinitionFromOptions(resolveGraphRuntimeOptions(datasets));

/** 创建携带当前 Graph definition options 的 Entity provider */
export const createEntityProvider = (options: GraphDefinitionOptions = {}): CoreDependencyProvider =>
  Object.freeze({
    key: EntityProviderKey,
    dependencies: Object.freeze([HexagonShapeProvider.key, EllipticCapsuleShapeProvider.key]),
    datasets: createGraphRuntimeDatasets(options),
    makeDefinition: makeEntityDefinition,
  });

/** 使用内置 Graph registries 的默认 Entity provider */
export const EntityProvider = createEntityProvider();
