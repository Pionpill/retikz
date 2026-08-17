import type {
  ContainerCreateOptions,
  ContainerRegion,
  ContainerSection,
  EntityCreateOptions,
  GraphCreateOptions,
  GraphDefinitionOptions,
  IRRelation,
  RelationCreateOptions,
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
  ContainerProvider,
  createContainer,
  createEntity,
  createGraph,
  createGraphProviders,
  createRelation,
  EntityProvider,
  GraphProvider,
  RelationProvider,
} from '@retikz/graph';

import { ContainerEmbedKind, EntityEmbedKind, GraphEmbedKind, RelationEmbedKind } from './constants';

type GraphCompositeProvider = ReturnType<typeof createGraphProviders>[number];

const DEFAULT_GRAPH_PROVIDERS = createGraphProviders();

const sameProviderKey = (left: GraphCompositeProvider['key'], right: GraphCompositeProvider['key']): boolean =>
  left.capability === 'composite' &&
  right.capability === 'composite' &&
  left.namespace === right.namespace &&
  left.type === right.type;

/** 收集一个 Graph provider 根节点的完整可达 catalog */
const providerClosure = (
  root: GraphCompositeProvider,
  providers: ReadonlyArray<GraphCompositeProvider>,
): Array<GraphCompositeProvider> => {
  const output: Array<GraphCompositeProvider> = [];
  const visited = new Set<GraphCompositeProvider>();
  const visit = (provider: GraphCompositeProvider): void => {
    if (visited.has(provider)) return;
    visited.add(provider);
    output.push(provider);
    for (const dependency of provider.dependencies) {
      const candidate = providers.find(entry => sameProviderKey(entry.key, dependency));
      if (candidate === undefined) {
        throw new Error(`Graph provider catalog is missing dependency '${dependency.capability}'.`);
      }
      visit(candidate);
    }
  };
  visit(root);
  return output;
};

/** Container region 的 framework-neutral authoring 输入 */
export type InputContainerRegion = Omit<ContainerRegion, 'child'> & {
  child: InputChild;
};

/** Container section 的 framework-neutral authoring 输入 */
export type InputContainerSection = Omit<ContainerSection, 'child'> & {
  child: InputChild;
};

/** Container 的 authoring 输入可显式指定稳定身份，省略时由 embed id 派生 */
export type InputContainer = Omit<ContainerCreateOptions, 'id' | 'header' | 'sections'> & {
  /** 要持久化到 Container IR 的显式身份 */
  id?: string;
  header?: InputContainerRegion;
  sections?: ReadonlyArray<InputContainerSection>;
};

/** Graph presentation root 的 framework-neutral authoring 输入 */
export type InputGraph = Omit<GraphCreateOptions, 'id' | 'children'> & {
  /** 当前 Graph authoring assembly 使用的 Entity role definitions */
  entityRoles?: GraphDefinitionOptions['entityRoles'];
  /** 当前 Graph authoring assembly 使用的 Entity variant definitions */
  entityVariants?: GraphDefinitionOptions['entityVariants'];
  /** 当前 Graph authoring assembly 使用的 Graph Theme style definitions */
  graphThemeStyles?: GraphDefinitionOptions['graphThemeStyles'];
  /** 按 authored 顺序归一化的 Graph / Core children */
  children: ReadonlyArray<InputChild>;
};

/** Entity 的 authoring 输入，embed id 提供稳定身份 */
export type InputEntity = Omit<EntityCreateOptions, 'id'> & {
  /** 由框架 adapter 收集、等待 Vanilla 归一化的 Core Node 输入 */
  authoringNode?: InputNode;
};

type OmitId<T> = T extends unknown ? Omit<T, 'id'> : never;
type RelationAuthoringInput = Omit<Extract<RelationCreateOptions, { way: unknown }>, 'id' | 'way'> & {
  authoringPath: InputPath;
};

/** Relation 的 authoring 输入，embed id 提供稳定身份 */
export type InputRelation = OmitId<RelationCreateOptions> | RelationAuthoringInput;

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

/** 在当前根 Scene traversal 中归一化 Container region */
const normalizeContainerRegion = (
  input: InputContainerRegion,
  label: string,
  context: InputEmbedContext,
  collected: CollectedInputDependencies,
): ContainerRegion => ({
  ...input,
  child: normalizeGraphChild(input.child, label, context, collected),
});

/** 在当前根 Scene traversal 中归一化 Container section */
const normalizeContainerSection = (
  input: InputContainerSection,
  context: InputEmbedContext,
  collected: CollectedInputDependencies,
): ContainerSection => ({
  ...input,
  child: normalizeGraphChild(input.child, `ContainerSection '${input.key}'`, context, collected),
});

/** Graph presentation root 的 InputEmbed adapter */
export const GraphInputEmbedAdapter: InputEmbedAdapter<InputGraph> = {
  kind: GraphEmbedKind,
  lower: (props, context) => {
    const normalizeChildren = context.normalizeChildren;
    if (normalizeChildren === undefined) throw new Error('Graph inputs require Kernel Vanilla normalizeScene.');
    const { entityRoles, entityVariants, graphThemeStyles, children, ...input } = props;
    const hasCustomOptions =
      entityRoles !== undefined || entityVariants !== undefined || graphThemeStyles !== undefined;
    const configuredProviders = hasCustomOptions
      ? createGraphProviders({ entityRoles, entityVariants, graphThemeStyles })
      : DEFAULT_GRAPH_PROVIDERS;
    const provider = configuredProviders.find(candidate => sameProviderKey(candidate.key, GraphProvider.key));
    if (provider === undefined) throw new Error('Graph provider catalog is missing the Graph provider.');
    const normalized = normalizeChildren(children);
    const providers = normalized.providerDependencies.providers.map(candidate => {
      const defaultProvider = DEFAULT_GRAPH_PROVIDERS.find(entry => sameProviderKey(entry.key, candidate.key));
      const configuredProvider = configuredProviders.find(entry => sameProviderKey(entry.key, candidate.key));
      return candidate === defaultProvider && configuredProvider !== undefined ? configuredProvider : candidate;
    });
    return {
      node: createGraph({ ...input, id: context.id, children: [...normalized.children] }),
      providerDependencies: {
        roots: [provider.key, ...normalized.providerDependencies.roots],
        providers: [...providerClosure(provider, configuredProviders), ...providers],
      },
      ...(normalized.authoringSites.length === 0 ? {} : { authoringSites: normalized.authoringSites }),
    };
  },
};

/** 创建 Graph presentation root 的 authoring embed 节点 */
export const graph = (id: string, input: InputGraph): InputEmbed<InputGraph> => ({
  type: 'embed',
  kind: GraphEmbedKind,
  id,
  props: input,
});

/** 将框架收集的 Core Node 输入收敛为 Entity 输入 */
const normalizeEntity = <TInput extends Record<string, unknown>>(
  input: TInput,
  context: InputEmbedContext,
): Omit<TInput, 'authoringNode'> => {
  const { authoringNode, ...base } = input as TInput & { authoringNode?: InputNode };
  if (authoringNode === undefined) return base;
  const normalizeChildren = context.normalizeChildren;
  if (normalizeChildren === undefined) throw new Error('Entity inputs require Kernel Vanilla normalizeScene.');
  const normalized = normalizeChildren([authoringNode]);
  if (
    normalized.children.length !== 1 ||
    normalized.children[0].type !== 'node' ||
    'namespace' in normalized.children[0]
  ) {
    throw new Error('Entity must normalize to exactly one Core Node.');
  }
  const { type: _type, id: _id, ...node } = normalized.children[0];
  void _type;
  void _id;
  return { ...base, ...node };
};

/** 使用 embed id 创建规范 Relation IR */
const createEmbeddedRelation = (id: string, input: InputRelation, context: InputEmbedContext) => {
  if ('authoringPath' in input) {
    const { authoringPath, ...base } = input;
    const normalizeChildren = context.normalizeChildren;
    if (normalizeChildren === undefined) throw new Error('Relation inputs require Kernel Vanilla normalizeScene.');
    const normalized = normalizeChildren([authoringPath]);
    if (normalized.children.length !== 1 || normalized.children[0].type !== 'path') {
      throw new Error('Relation must normalize to exactly one Core Path.');
    }
    return createRelation({
      ...base,
      id,
      children: normalized.children[0].children as IRRelation['children'],
    });
  }
  if ('way' in input && input.way !== undefined) {
    return createRelation({ ...input, id, way: input.way });
  }
  return createRelation({ ...input, id, children: input.children });
};

/** Container 的 InputEmbed adapter */
export const ContainerInputEmbedAdapter: InputEmbedAdapter<InputContainer> = {
  kind: ContainerEmbedKind,
  lower: (props, context) => {
    const { header, sections, id, ...input } = props;
    const collected: CollectedInputDependencies = { roots: [], providers: [], authoringSites: [] };
    return {
      node: createContainer({
        ...input,
        id: id ?? `${context.id}/container`,
        ...(header === undefined
          ? {}
          : { header: normalizeContainerRegion(header, 'ContainerHeader', context, collected) }),
        ...(sections === undefined
          ? {}
          : { sections: sections.map(section => normalizeContainerSection(section, context, collected)) }),
      }),
      providerDependencies: {
        roots: [ContainerProvider.key, ...collected.roots],
        providers: [...providerClosure(ContainerProvider, DEFAULT_GRAPH_PROVIDERS), ...collected.providers],
      },
      ...(collected.authoringSites.length === 0 ? {} : { authoringSites: collected.authoringSites }),
    };
  },
};

/** 创建 Container 的 authoring embed 节点 */
export const container = (id: string, input: InputContainer): InputEmbed<InputContainer> => ({
  type: 'embed',
  kind: ContainerEmbedKind,
  id,
  props: input,
});

/** Entity 的 InputEmbed adapter */
export const EntityInputEmbedAdapter: InputEmbedAdapter<InputEntity> = {
  kind: EntityEmbedKind,
  lower: (props, context) => ({
    node: createEntity({ ...normalizeEntity(props, context), id: context.id }),
    providerDependencies: {
      roots: [EntityProvider.key],
      providers: providerClosure(EntityProvider, DEFAULT_GRAPH_PROVIDERS),
    },
  }),
};

/** 创建 Entity 的 authoring embed 节点 */
export const entity = (id: string, input: InputEntity): InputEmbed<InputEntity> => ({
  type: 'embed',
  kind: EntityEmbedKind,
  id,
  props: input,
});

/** Relation 的 InputEmbed adapter */
export const RelationInputEmbedAdapter: InputEmbedAdapter<InputRelation> = {
  kind: RelationEmbedKind,
  lower: (props, context) => ({
    node: createEmbeddedRelation(context.id, props, context),
    providerDependencies: {
      roots: [RelationProvider.key],
      providers: providerClosure(RelationProvider, DEFAULT_GRAPH_PROVIDERS),
    },
  }),
};

/** 创建 Relation 的 authoring embed 节点 */
export const relation = (id: string, input: InputRelation): InputEmbed<InputRelation> => ({
  type: 'embed',
  kind: RelationEmbedKind,
  id,
  props: input,
});

/** 擦除一个 Vanilla adapter 的具体 props 类型，供统一 adapter 集合消费 */
const eraseVanillaAdapter = <TProps>(adapter: InputEmbedAdapter<TProps>): InputEmbedAdapter<unknown> => ({
  kind: adapter.kind,
  lower: (props, context) => adapter.lower(props as TProps, context),
});

/** 创建可一次性传给 Vanilla normalize 的完整 Graph adapter 集合 */
export const createGraphVanillaAdapters = (): Array<InputEmbedAdapter<unknown>> => [
  eraseVanillaAdapter(GraphInputEmbedAdapter),
  eraseVanillaAdapter(ContainerInputEmbedAdapter),
  eraseVanillaAdapter(EntityInputEmbedAdapter),
  eraseVanillaAdapter(RelationInputEmbedAdapter),
];
