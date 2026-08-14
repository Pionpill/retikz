import type {
  ConnectorInput,
  DecisionInput,
  IRConnector,
  JunctionInput,
  LogicFrameInput,
  LogicFrameRegionInput,
  LogicFrameSectionInput,
  StageInput,
  TerminalInput,
} from '@retikz/notation';
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
  ConnectorProvider,
  createConnector,
  createDecision,
  createJunction,
  createLogicFrame,
  createStage,
  createTerminal,
  DecisionProvider,
  JunctionProvider,
  LogicFrameProvider,
  StageProvider,
  TerminalProvider,
} from '@retikz/notation';

import {
  NotationConnectorEmbedKind,
  NotationDecisionEmbedKind,
  NotationJunctionEmbedKind,
  NotationLogicFrameEmbedKind,
  NotationStageEmbedKind,
  NotationTerminalEmbedKind,
} from './constants';

/** LogicFrame region 的 framework-neutral authoring 输入 */
export type InputLogicFrameRegion = Omit<LogicFrameRegionInput, 'child'> & {
  child: InputChild;
};

/** LogicFrame section 的 framework-neutral authoring 输入 */
export type InputLogicFrameSection = Omit<LogicFrameSectionInput, 'child'> & {
  child: InputChild;
};

/** LogicFrame 的 authoring 输入可显式指定稳定身份，省略时由 embed id 派生 */
export type InputLogicFrame = Omit<LogicFrameInput, 'id' | 'header' | 'sections'> & {
  /** 要持久化到 LogicFrame IR 的显式身份 */
  id?: string;
  header?: InputLogicFrameRegion;
  sections?: ReadonlyArray<InputLogicFrameSection>;
};

/** Terminal 的 authoring 输入，embed id 提供稳定身份 */
export type InputTerminal = Omit<TerminalInput, 'id'> & {
  /** 由框架 adapter 收集、等待 Vanilla 归一化的 Core Node 输入 */
  authoringNode?: InputNode;
};

/** Stage 的 authoring 输入，embed id 提供稳定身份 */
export type InputStage = Omit<StageInput, 'id'> & {
  /** 由框架 adapter 收集、等待 Vanilla 归一化的 Core Node 输入 */
  authoringNode?: InputNode;
};

/** Decision 的 authoring 输入，embed id 提供稳定身份 */
export type InputDecision = Omit<DecisionInput, 'id'> & {
  /** 由框架 adapter 收集、等待 Vanilla 归一化的 Core Node 输入 */
  authoringNode?: InputNode;
};

/** Junction 的 authoring 输入，embed id 提供稳定身份 */
export type InputJunction = Omit<JunctionInput, 'id'> & {
  /** 由框架 adapter 收集、等待 Vanilla 归一化的 Core Node 输入 */
  authoringNode?: InputNode;
};

type OmitId<T> = T extends unknown ? Omit<T, 'id'> : never;
type ConnectorAuthoringInput = Omit<Extract<ConnectorInput, { way: unknown }>, 'id' | 'way'> & {
  authoringPath: InputPath;
};

/** Connector 的 authoring 输入，embed id 提供稳定身份 */
export type InputConnector = OmitId<ConnectorInput> | ConnectorAuthoringInput;

type CollectedInputDependencies = Readonly<{
  roots: Array<InputEmbedContribution['providerDependencies']['roots'][number]>;
  providers: Array<InputEmbedContribution['providerDependencies']['providers'][number]>;
  authoringSites: Array<NonNullable<InputEmbedContribution['authoringSites']>[number]>;
}>;

/** 在当前根 Scene traversal 中归一化一个 Notation slot */
const normalizeNotationChild = (
  child: InputChild,
  label: string,
  context: InputEmbedContext,
  collected: CollectedInputDependencies,
) => {
  const normalizeChildren = context.normalizeChildren;
  if (normalizeChildren === undefined) throw new Error('Notation slot inputs require Kernel Vanilla normalizeScene.');
  const normalized = normalizeChildren([child]);
  if (normalized.children.length !== 1) {
    throw new Error(`${label} must normalize to exactly one Core child.`);
  }
  collected.roots.push(...normalized.providerDependencies.roots);
  collected.providers.push(...normalized.providerDependencies.providers);
  collected.authoringSites.push(...normalized.authoringSites);
  return normalized.children[0];
};

/** 在当前根 Scene traversal 中归一化 LogicFrame region */
const normalizeLogicFrameRegion = (
  input: InputLogicFrameRegion,
  label: string,
  context: InputEmbedContext,
  collected: CollectedInputDependencies,
): LogicFrameRegionInput => ({
  ...input,
  child: normalizeNotationChild(input.child, label, context, collected),
});

/** 在当前根 Scene traversal 中归一化 LogicFrame section */
const normalizeLogicFrameSection = (
  input: InputLogicFrameSection,
  context: InputEmbedContext,
  collected: CollectedInputDependencies,
): LogicFrameSectionInput => ({
  ...input,
  child: normalizeNotationChild(input.child, `LogicFrameSection '${input.key}'`, context, collected),
});

/** 将框架收集的 Core Node 输入收敛为 Notation semantic unit 输入 */
const normalizeSemanticNode = <TInput extends Record<string, unknown>>(
  input: TInput,
  context: InputEmbedContext,
): Omit<TInput, 'authoringNode'> => {
  const { authoringNode, ...base } = input as TInput & { authoringNode?: InputNode };
  if (authoringNode === undefined) return base;
  const normalizeChildren = context.normalizeChildren;
  if (normalizeChildren === undefined)
    throw new Error('Notation semantic inputs require Kernel Vanilla normalizeScene.');
  const normalized = normalizeChildren([authoringNode]);
  if (
    normalized.children.length !== 1 ||
    normalized.children[0].type !== 'node' ||
    'namespace' in normalized.children[0]
  ) {
    throw new Error('Notation semantic unit must normalize to exactly one Core Node.');
  }
  const { type: _type, shape: _shape, id: _id, ...node } = normalized.children[0];
  void _type;
  void _shape;
  void _id;
  return { ...base, ...node };
};

/** 使用 embed id 创建规范 Connector IR */
const createEmbeddedConnector = (id: string, input: InputConnector, context: InputEmbedContext) => {
  if ('authoringPath' in input) {
    const { authoringPath, ...base } = input;
    const normalizeChildren = context.normalizeChildren;
    if (normalizeChildren === undefined)
      throw new Error('Notation Connector inputs require Kernel Vanilla normalizeScene.');
    const normalized = normalizeChildren([authoringPath]);
    if (normalized.children.length !== 1 || normalized.children[0].type !== 'path') {
      throw new Error('Notation Connector must normalize to exactly one Core Path.');
    }
    return createConnector({ ...base, id, children: normalized.children[0].children as IRConnector['children'] });
  }
  if ('way' in input && input.way !== undefined) {
    return createConnector({ ...input, id, way: input.way });
  }
  return createConnector({ ...input, id, children: input.children });
};

/** Notation LogicFrame 的 InputEmbed adapter */
export const LogicFrameInputEmbedAdapter: InputEmbedAdapter<InputLogicFrame> = {
  kind: NotationLogicFrameEmbedKind,
  lower: (props, context) => {
    const { header, sections, id, ...input } = props;
    const collected: CollectedInputDependencies = { roots: [], providers: [], authoringSites: [] };
    return {
      node: createLogicFrame({
        ...input,
        id: id ?? `${context.id}/logicFrame`,
        ...(header === undefined
          ? {}
          : { header: normalizeLogicFrameRegion(header, 'LogicFrameHeader', context, collected) }),
        ...(sections === undefined
          ? {}
          : { sections: sections.map(section => normalizeLogicFrameSection(section, context, collected)) }),
      }),
      providerDependencies: {
        roots: [LogicFrameProvider.key, ...collected.roots],
        providers: [LogicFrameProvider, ...collected.providers],
      },
      ...(collected.authoringSites.length === 0 ? {} : { authoringSites: collected.authoringSites }),
    };
  },
};

/** 创建 Notation LogicFrame 的 authoring embed 节点 */
export const logicFrame = (id: string, input: InputLogicFrame): InputEmbed<InputLogicFrame> => ({
  type: 'embed',
  kind: NotationLogicFrameEmbedKind,
  id,
  props: input,
});

/** Notation Terminal 的 InputEmbed adapter */
export const TerminalInputEmbedAdapter: InputEmbedAdapter<InputTerminal> = {
  kind: NotationTerminalEmbedKind,
  lower: (props, context) => ({
    node: createTerminal({ ...normalizeSemanticNode(props, context), id: context.id }),
    providerDependencies: { roots: [TerminalProvider.key], providers: [TerminalProvider] },
  }),
};

/** 创建 Notation Terminal 的 authoring embed 节点 */
export const terminal = (id: string, input: InputTerminal): InputEmbed<InputTerminal> => ({
  type: 'embed',
  kind: NotationTerminalEmbedKind,
  id,
  props: input,
});

/** Notation Stage 的 InputEmbed adapter */
export const StageInputEmbedAdapter: InputEmbedAdapter<InputStage> = {
  kind: NotationStageEmbedKind,
  lower: (props, context) => ({
    node: createStage({ ...normalizeSemanticNode(props, context), id: context.id }),
    providerDependencies: { roots: [StageProvider.key], providers: [StageProvider] },
  }),
};

/** 创建 Notation Stage 的 authoring embed 节点 */
export const stage = (id: string, input: InputStage): InputEmbed<InputStage> => ({
  type: 'embed',
  kind: NotationStageEmbedKind,
  id,
  props: input,
});

/** Notation Decision 的 InputEmbed adapter */
export const DecisionInputEmbedAdapter: InputEmbedAdapter<InputDecision> = {
  kind: NotationDecisionEmbedKind,
  lower: (props, context) => ({
    node: createDecision({ ...normalizeSemanticNode(props, context), id: context.id }),
    providerDependencies: { roots: [DecisionProvider.key], providers: [DecisionProvider] },
  }),
};

/** 创建 Notation Decision 的 authoring embed 节点 */
export const decision = (id: string, input: InputDecision): InputEmbed<InputDecision> => ({
  type: 'embed',
  kind: NotationDecisionEmbedKind,
  id,
  props: input,
});

/** Notation Junction 的 InputEmbed adapter */
export const JunctionInputEmbedAdapter: InputEmbedAdapter<InputJunction> = {
  kind: NotationJunctionEmbedKind,
  lower: (props, context) => ({
    node: createJunction({ ...normalizeSemanticNode(props, context), id: context.id }),
    providerDependencies: { roots: [JunctionProvider.key], providers: [JunctionProvider] },
  }),
};

/** 创建 Notation Junction 的 authoring embed 节点 */
export const junction = (id: string, input: InputJunction): InputEmbed<InputJunction> => ({
  type: 'embed',
  kind: NotationJunctionEmbedKind,
  id,
  props: input,
});

/** Notation Connector 的 InputEmbed adapter */
export const ConnectorInputEmbedAdapter: InputEmbedAdapter<InputConnector> = {
  kind: NotationConnectorEmbedKind,
  lower: (props, context) => ({
    node: createEmbeddedConnector(context.id, props, context),
    providerDependencies: { roots: [ConnectorProvider.key], providers: [ConnectorProvider] },
  }),
};

/** 创建 Notation Connector 的 authoring embed 节点 */
export const connector = (id: string, input: InputConnector): InputEmbed<InputConnector> => ({
  type: 'embed',
  kind: NotationConnectorEmbedKind,
  id,
  props: input,
});
