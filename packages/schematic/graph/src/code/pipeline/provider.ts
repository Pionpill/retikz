import type { CompositeCoreProviderKey, CoreDependencyProvider, CoreProviderContribution } from '@retikz/core';

import type { GraphDefinitionOptions } from '../../contract';
import { createBaseGraphProviders } from '../../pipeline/base-providers';
import { BlockProviderKey } from '../../pipeline/block';
import { createGraphRuntimeDatasets, resolveGraphRuntimeOptions } from '../../providers';
import { GRAPH_NAMESPACE } from '../../shared';
import type { CodeBlockDefinition } from '../contract';
import type { IRCodeBlock } from '../schemas';
import { createCodeBlockContentDefinition, createCodeBlockDefinition } from './definition';

/** 同一 definition 的 maker identity 跨 contribution 保持一致，不承载实体注册或编译结果 */
const makers = new WeakMap<
  object,
  { root: CoreDependencyProvider['makeDefinition']; content: CoreDependencyProvider['makeDefinition'] }
>();

/**
 * 创建代码实体及其完整下层依赖的 Core contribution
 * @template TSource Definition 拥有的领域 Source
 * @param definition 已定义的代码实体，重复使用同一个对象保持 provider identity
 * @param options Graph 定义与主题选项
 * @returns 包含实体根与 Block 下层依赖的贡献；宿主装配时检测冲突
 */
export const createCodeBlockContribution = <TSource extends IRCodeBlock>(
  definition: CodeBlockDefinition<TSource>,
  options: GraphDefinitionOptions = {},
): CoreProviderContribution => {
  const key: CompositeCoreProviderKey = {
    capability: 'composite',
    namespace: definition.namespace,
    type: definition.type,
  };
  const contentKey: CompositeCoreProviderKey = {
    capability: 'composite',
    namespace: GRAPH_NAMESPACE,
    type: `internalCodeBlock:${JSON.stringify([definition.namespace, definition.type])}`,
  };
  let pair = makers.get(definition);
  if (pair === undefined) {
    pair = {
      root: () => createCodeBlockDefinition(definition, contentKey),
      content: datasets =>
        createCodeBlockContentDefinition(definition, contentKey, resolveGraphRuntimeOptions(datasets)),
    };
    makers.set(definition, pair);
  }

  const datasets = createGraphRuntimeDatasets(options);

  return {
    roots: [key],
    providers: [
      { key, dependencies: [contentKey], datasets, makeDefinition: pair.root },
      { key: contentKey, dependencies: [BlockProviderKey], datasets, makeDefinition: pair.content },
      ...createBaseGraphProviders(options),
    ],
  };
};
