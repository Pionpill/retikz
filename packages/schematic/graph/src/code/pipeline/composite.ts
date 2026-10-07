import type {
  CompositeCoreProviderKey,
  ExpandCompositeDefinition,
  CoreDependencyProvider,
  CoreProviderContribution,
} from '@retikz/core';
import { defineComposite } from '@retikz/core';
import { literal, strictObject } from 'zod';

import type { GraphDefinitionOptions } from '../../contract';
import { RetikzGraphError, RetikzGraphErrorCode } from '../../errors';
import { createBaseGraphProviders } from '../../pipeline/base-providers';
import { BlockProviderKey } from '../../pipeline/block';
import type { ResolvedGraphDefinitionOptions } from '../../providers';
import { createGraphRuntimeDatasets, resolveGraphRuntimeOptions } from '../../providers';
import { resolveCodeBlockTokens } from '../../resolve/theme';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';
import type { CodeBlockDefinition } from '../contract';
import { resolveCodeBlockSurface } from '../resolve';
import type { IRCodeBlock } from '../schemas';

/**
 * 为实体建立主题边界；领域内容留待边界内展开
 * @template TSource 代码块定义 schema 接受并展开的精确输入类型
 */
const createCodeBlockDefinition = <TSource extends IRCodeBlock>(
  definition: CodeBlockDefinition<TSource>,
  contentKey: CompositeCoreProviderKey,
): ExpandCompositeDefinition<TSource> =>
  defineComposite({
    namespace: definition.namespace,
    type: definition.type,
    schema: definition.schema,
    expand: source => {
      const { theme, ...content } = source;
      const child = { namespace: contentKey.namespace, type: contentKey.type, source: content };
      return { children: theme === undefined ? [child] : [{ type: 'scope', theme, children: [child] }] };
    },
  });

/**
 * 在有效 Core Theme 下组合内容与唯一 Block 根
 * @template TSource 代码块定义 schema 校验后交给内容组合回调的类型
 */
const createCodeBlockContentDefinition = <TSource extends IRCodeBlock>(
  definition: CodeBlockDefinition<TSource>,
  key: CompositeCoreProviderKey,
  options: ResolvedGraphDefinitionOptions,
) =>
  defineComposite({
    namespace: key.namespace,
    type: key.type,
    schema: strictObject({ namespace: literal(key.namespace), type: literal(key.type), source: definition.schema }),
    expand: ({ source }, context) => {
      const codeBlockTokens = resolveCodeBlockTokens(context.theme, options.graphThemeStyles);
      const surface = resolveCodeBlockSurface(source);

      try {
        return {
          children: [
            {
              namespace: GRAPH_NAMESPACE,
              type: GraphType.Block,
              ...surface,
              children: [...definition.compose(source, { theme: context.theme, codeBlockTokens })],
            },
          ],
        };
      } catch (cause) {
        throw new RetikzGraphError({
          code: RetikzGraphErrorCode.DefinitionCallbackFailed,
          message: `Code block '${definition.namespace}.${definition.type}' composition failed.`,
          details: {
            capability: 'code-block-compose',
            key: `${definition.namespace}.${definition.type}`,
            nodeId: source.id,
          },
          cause,
        });
      }
    },
  });

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
