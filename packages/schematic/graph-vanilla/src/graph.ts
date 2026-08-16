import type {
  GraphConnectorCreateOptions,
  GraphFrameCreateOptions,
  GraphFrameRegionCreateOptions,
  GraphFrameSectionCreateOptions,
  GraphNodeCreateOptions,
  IRGraphConnector,
} from '@retikz/graph';
import type {
  InputChild,
  InputEmbed,
  InputEmbedAdapter,
  InputEmbedContext,
  InputEmbedContribution,
  InputNode,
  InputPath,
} from '@retikz/vanilla';

import {
  createGraphConnector,
  createGraphFrame,
  createGraphNode,
  createGraphProviders,
  GraphConnectorProvider,
  GraphFrameProvider,
  GraphNodeProvider,
} from '@retikz/graph';

import { GraphConnectorEmbedKind, GraphFrameEmbedKind, GraphNodeEmbedKind } from './constants';

/** GraphFrame region 的 framework-neutral authoring 输入 */
export type InputGraphFrameRegion = Omit<GraphFrameRegionCreateOptions, 'child'> & {
  child: InputChild;
};

/** GraphFrame section 的 framework-neutral authoring 输入 */
export type InputGraphFrameSection = Omit<GraphFrameSectionCreateOptions, 'child'> & {
  child: InputChild;
};

/** GraphFrame 的 authoring 输入可显式指定稳定身份，省略时由 embed id 派生 */
export type InputGraphFrame = Omit<GraphFrameCreateOptions, 'id' | 'header' | 'sections'> & {
  /** 要持久化到 GraphFrame IR 的显式身份 */
  id?: string;
  header?: InputGraphFrameRegion;
  sections?: ReadonlyArray<InputGraphFrameSection>;
};

/** GraphNode 的 authoring 输入，embed id 提供稳定身份 */
export type InputGraphNode = Omit<GraphNodeCreateOptions, 'id'> & {
  /** 由框架 adapter 收集、等待 Vanilla 归一化的 Core Node 输入 */
  authoringNode?: InputNode;
};

type OmitId<T> = T extends unknown ? Omit<T, 'id'> : never;
type GraphConnectorAuthoringInput = Omit<Extract<GraphConnectorCreateOptions, { way: unknown }>, 'id' | 'way'> & {
  authoringPath: InputPath;
};

/** GraphConnector 的 authoring 输入，embed id 提供稳定身份 */
export type InputGraphConnector = OmitId<GraphConnectorCreateOptions> | GraphConnectorAuthoringInput;

type CollectedInputDependencies = Readonly<{
  roots: Array<InputEmbedContribution['providerDependencies']['roots'][number]>;
  providers: Array<InputEmbedContribution['providerDependencies']['providers'][number]>;
  authoringSites: Array<NonNullable<InputEmbedContribution['authoringSites']>[number]>;
}>;

/** 在当前根 Scene traversal 中归一化一个 Graph slot */
const normalizeGraphChild = (
  child: InputChild,
  label: string,
  context: InputEmbedContext,
  collected: CollectedInputDependencies,
) => {
  const normalizeChildren = context.normalizeChildren;
  if (normalizeChildren === undefined) throw new Error('Graph slot inputs require Kernel Vanilla normalizeScene.');
  const normalized = normalizeChildren([child]);
  if (normalized.children.length !== 1) {
    throw new Error(`${label} must normalize to exactly one Core child.`);
  }
  collected.roots.push(...normalized.providerDependencies.roots);
  collected.providers.push(...normalized.providerDependencies.providers);
  collected.authoringSites.push(...normalized.authoringSites);
  return normalized.children[0];
};

/** 在当前根 Scene traversal 中归一化 GraphFrame region */
const normalizeGraphFrameRegion = (
  input: InputGraphFrameRegion,
  label: string,
  context: InputEmbedContext,
  collected: CollectedInputDependencies,
): GraphFrameRegionCreateOptions => ({
  ...input,
  child: normalizeGraphChild(input.child, label, context, collected),
});

/** 在当前根 Scene traversal 中归一化 GraphFrame section */
const normalizeGraphFrameSection = (
  input: InputGraphFrameSection,
  context: InputEmbedContext,
  collected: CollectedInputDependencies,
): GraphFrameSectionCreateOptions => ({
  ...input,
  child: normalizeGraphChild(input.child, `GraphFrameSection '${input.key}'`, context, collected),
});

/** 将框架收集的 Core Node 输入收敛为 GraphNode 输入 */
const normalizeGraphNode = <TInput extends Record<string, unknown>>(
  input: TInput,
  context: InputEmbedContext,
): Omit<TInput, 'authoringNode'> => {
  const { authoringNode, ...base } = input as TInput & { authoringNode?: InputNode };
  if (authoringNode === undefined) return base;
  const normalizeChildren = context.normalizeChildren;
  if (normalizeChildren === undefined) throw new Error('GraphNode inputs require Kernel Vanilla normalizeScene.');
  const normalized = normalizeChildren([authoringNode]);
  if (
    normalized.children.length !== 1 ||
    normalized.children[0].type !== 'node' ||
    'namespace' in normalized.children[0]
  ) {
    throw new Error('GraphNode must normalize to exactly one Core Node.');
  }
  const { type: _type, id: _id, ...node } = normalized.children[0];
  void _type;
  void _id;
  return { ...base, ...node };
};

/** 使用 embed id 创建规范 GraphConnector IR */
const createEmbeddedGraphConnector = (id: string, input: InputGraphConnector, context: InputEmbedContext) => {
  if ('authoringPath' in input) {
    const { authoringPath, ...base } = input;
    const normalizeChildren = context.normalizeChildren;
    if (normalizeChildren === undefined)
      throw new Error('GraphConnector inputs require Kernel Vanilla normalizeScene.');
    const normalized = normalizeChildren([authoringPath]);
    if (normalized.children.length !== 1 || normalized.children[0].type !== 'path') {
      throw new Error('GraphConnector must normalize to exactly one Core Path.');
    }
    return createGraphConnector({
      ...base,
      id,
      children: normalized.children[0].children as IRGraphConnector['children'],
    });
  }
  if ('way' in input && input.way !== undefined) {
    return createGraphConnector({ ...input, id, way: input.way });
  }
  return createGraphConnector({ ...input, id, children: input.children });
};

/** GraphFrame 的 InputEmbed adapter */
export const GraphFrameInputEmbedAdapter: InputEmbedAdapter<InputGraphFrame> = {
  kind: GraphFrameEmbedKind,
  lower: (props, context) => {
    const { header, sections, id, ...input } = props;
    const collected: CollectedInputDependencies = { roots: [], providers: [], authoringSites: [] };
    return {
      node: createGraphFrame({
        ...input,
        id: id ?? `${context.id}/graphFrame`,
        ...(header === undefined
          ? {}
          : { header: normalizeGraphFrameRegion(header, 'GraphFrameHeader', context, collected) }),
        ...(sections === undefined
          ? {}
          : { sections: sections.map(section => normalizeGraphFrameSection(section, context, collected)) }),
      }),
      providerDependencies: {
        roots: [GraphFrameProvider.key, ...collected.roots],
        providers: [GraphFrameProvider, ...collected.providers],
      },
      ...(collected.authoringSites.length === 0 ? {} : { authoringSites: collected.authoringSites }),
    };
  },
};

/** 创建 GraphFrame 的 authoring embed 节点 */
export const graphFrame = (id: string, input: InputGraphFrame): InputEmbed<InputGraphFrame> => ({
  type: 'embed',
  kind: GraphFrameEmbedKind,
  id,
  props: input,
});

/** GraphNode 的 InputEmbed adapter */
export const GraphNodeInputEmbedAdapter: InputEmbedAdapter<InputGraphNode> = {
  kind: GraphNodeEmbedKind,
  lower: (props, context) => ({
    node: createGraphNode({ ...normalizeGraphNode(props, context), id: context.id }),
    providerDependencies: { roots: [GraphNodeProvider.key], providers: [GraphNodeProvider] },
  }),
};

/** 创建 GraphNode 的 authoring embed 节点 */
export const graphNode = (id: string, input: InputGraphNode): InputEmbed<InputGraphNode> => ({
  type: 'embed',
  kind: GraphNodeEmbedKind,
  id,
  props: input,
});

/** GraphConnector 的 InputEmbed adapter */
export const GraphConnectorInputEmbedAdapter: InputEmbedAdapter<InputGraphConnector> = {
  kind: GraphConnectorEmbedKind,
  lower: (props, context) => ({
    node: createEmbeddedGraphConnector(context.id, props, context),
    providerDependencies: { roots: [GraphConnectorProvider.key], providers: [GraphConnectorProvider] },
  }),
};

/** 创建 GraphConnector 的 authoring embed 节点 */
export const graphConnector = (id: string, input: InputGraphConnector): InputEmbed<InputGraphConnector> => ({
  type: 'embed',
  kind: GraphConnectorEmbedKind,
  id,
  props: input,
});

type GraphCompositeProvider = ReturnType<typeof createGraphProviders>[number];

/** 用指定 composite provider 配置并擦除一个 Vanilla adapter 的具体 props 类型 */
const configureVanillaAdapter = <TProps>(
  adapter: InputEmbedAdapter<TProps>,
  provider: GraphCompositeProvider,
): InputEmbedAdapter<unknown> => ({
  kind: adapter.kind,
  lower: (props, context) => {
    const contribution = adapter.lower(props as TProps, context);
    return {
      ...contribution,
      providerDependencies: {
        roots: [provider.key, ...contribution.providerDependencies.roots.slice(1)],
        providers: [provider, ...contribution.providerDependencies.providers.slice(1)],
      },
    };
  },
});

/** 创建可一次性传给 Vanilla normalize 的完整 Graph adapter 集合 */
export const createGraphVanillaAdapters = (): Array<InputEmbedAdapter<unknown>> => {
  const [graphFrameProvider, graphNodeProvider, graphConnectorProvider] = createGraphProviders();
  return [
    configureVanillaAdapter(GraphFrameInputEmbedAdapter, graphFrameProvider),
    configureVanillaAdapter(GraphNodeInputEmbedAdapter, graphNodeProvider),
    configureVanillaAdapter(GraphConnectorInputEmbedAdapter, graphConnectorProvider),
  ];
};
