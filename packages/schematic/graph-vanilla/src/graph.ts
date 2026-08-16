import type {
  ContainerCreateOptions,
  ContainerRegionCreateOptions,
  ContainerSectionCreateOptions,
  EntityCreateOptions,
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
  createGraphProviders,
  createRelation,
  EntityProvider,
  RelationProvider,
} from '@retikz/graph';

import { ContainerEmbedKind, EntityEmbedKind,RelationEmbedKind } from './constants';

/** Container region 的 framework-neutral authoring 输入 */
export type InputContainerRegion = Omit<ContainerRegionCreateOptions, 'child'> & {
  child: InputChild;
};

/** Container section 的 framework-neutral authoring 输入 */
export type InputContainerSection = Omit<ContainerSectionCreateOptions, 'child'> & {
  child: InputChild;
};

/** Container 的 authoring 输入可显式指定稳定身份，省略时由 embed id 派生 */
export type InputContainer = Omit<ContainerCreateOptions, 'id' | 'header' | 'sections'> & {
  /** 要持久化到 Container IR 的显式身份 */
  id?: string;
  header?: InputContainerRegion;
  sections?: ReadonlyArray<InputContainerSection>;
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
): ContainerRegionCreateOptions => ({
  ...input,
  child: normalizeGraphChild(input.child, label, context, collected),
});

/** 在当前根 Scene traversal 中归一化 Container section */
const normalizeContainerSection = (
  input: InputContainerSection,
  context: InputEmbedContext,
  collected: CollectedInputDependencies,
): ContainerSectionCreateOptions => ({
  ...input,
  child: normalizeGraphChild(input.child, `ContainerSection '${input.key}'`, context, collected),
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
        providers: [ContainerProvider, ...collected.providers],
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
    providerDependencies: { roots: [EntityProvider.key], providers: [EntityProvider] },
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
    providerDependencies: { roots: [RelationProvider.key], providers: [RelationProvider] },
  }),
};

/** 创建 Relation 的 authoring embed 节点 */
export const relation = (id: string, input: InputRelation): InputEmbed<InputRelation> => ({
  type: 'embed',
  kind: RelationEmbedKind,
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
  const [containerProvider, entityProvider, relationProvider] = createGraphProviders();
  return [
    configureVanillaAdapter(ContainerInputEmbedAdapter, containerProvider),
    configureVanillaAdapter(EntityInputEmbedAdapter, entityProvider),
    configureVanillaAdapter(RelationInputEmbedAdapter, relationProvider),
  ];
};
