import type {
  ConnectorInput,
  DecisionInput,
  JunctionInput,
  LogicFrameInput,
  StageInput,
  TerminalInput,
} from '@retikz/notation';
import type { VanillaEmbedSpec, VanillaTier2Adapter } from '@retikz/vanilla';

import {
  ConnectorDefinition,
  createConnector,
  createDecision,
  createJunction,
  createLogicFrame,
  createStage,
  createTerminal,
  DecisionDefinition,
  JunctionDefinition,
  LogicFrameDefinition,
  StageDefinition,
  TerminalDefinition,
} from '@retikz/notation';

import {
  NotationConnectorVanillaNamespace,
  NotationDecisionVanillaNamespace,
  NotationJunctionVanillaNamespace,
  NotationLogicFrameVanillaNamespace,
  NotationStageVanillaNamespace,
  NotationTerminalVanillaNamespace,
} from './constants';

/** LogicFrame 的 Vanilla 构建器输入，embed id 提供稳定身份 */
export type LogicFrameVanillaInput = Omit<LogicFrameInput, 'id'>;

/** Terminal 的 Vanilla 构建器输入，embed id 提供稳定身份 */
export type TerminalVanillaInput = Omit<TerminalInput, 'id'>;

/** Stage 的 Vanilla 构建器输入，embed id 提供稳定身份 */
export type StageVanillaInput = Omit<StageInput, 'id'>;

/** Decision 的 Vanilla 构建器输入，embed id 提供稳定身份 */
export type DecisionVanillaInput = Omit<DecisionInput, 'id'>;

/** Junction 的 Vanilla 构建器输入，embed id 提供稳定身份 */
export type JunctionVanillaInput = Omit<JunctionInput, 'id'>;

type OmitId<T> = T extends unknown ? Omit<T, 'id'> : never;

/** Connector 的 Vanilla 构建器输入，embed id 提供稳定身份 */
export type ConnectorVanillaInput = OmitId<ConnectorInput>;

const makeLogicFrameComposites = () => [LogicFrameDefinition];
const makeTerminalComposites = () => [TerminalDefinition];
const makeStageComposites = () => [StageDefinition];
const makeDecisionComposites = () => [DecisionDefinition];
const makeJunctionComposites = () => [JunctionDefinition];
const makeConnectorComposites = () => [ConnectorDefinition];

/** 使用 embed id 创建规范 Connector IR */
const createEmbeddedConnector = (id: string, input: ConnectorVanillaInput) => {
  if ('way' in input && input.way !== undefined) {
    return createConnector({ ...input, id, way: input.way });
  }
  return createConnector({ ...input, id, children: input.children });
};

/** Notation LogicFrame 的 Vanilla 适配器 */
export const LogicFrameVanillaAdapter: VanillaTier2Adapter<LogicFrameVanillaInput> = {
  kind: NotationLogicFrameVanillaNamespace,
  namespace: NotationLogicFrameVanillaNamespace,
  lower: (props, context) => ({
    node: createLogicFrame({ ...props, id: `${context.id}/logicFrame` }),
    datasets: {},
    makeComposites: makeLogicFrameComposites,
  }),
};

/** 创建 Notation LogicFrame 的 Vanilla embed 节点 */
export const logicFrame = (id: string, input: LogicFrameVanillaInput): VanillaEmbedSpec<LogicFrameVanillaInput> => ({
  type: 'embed',
  kind: NotationLogicFrameVanillaNamespace,
  id,
  props: input,
});

/** Notation Terminal 的 Vanilla 适配器 */
export const TerminalVanillaAdapter: VanillaTier2Adapter<TerminalVanillaInput> = {
  kind: NotationTerminalVanillaNamespace,
  namespace: NotationTerminalVanillaNamespace,
  lower: (props, context) => ({
    node: createTerminal({ ...props, id: context.id }),
    datasets: {},
    makeComposites: makeTerminalComposites,
  }),
};

/** 创建 Notation Terminal 的 Vanilla embed 节点 */
export const terminal = (id: string, input: TerminalVanillaInput): VanillaEmbedSpec<TerminalVanillaInput> => ({
  type: 'embed',
  kind: NotationTerminalVanillaNamespace,
  id,
  props: input,
});

/** Notation Stage 的 Vanilla 适配器 */
export const StageVanillaAdapter: VanillaTier2Adapter<StageVanillaInput> = {
  kind: NotationStageVanillaNamespace,
  namespace: NotationStageVanillaNamespace,
  lower: (props, context) => ({
    node: createStage({ ...props, id: context.id }),
    datasets: {},
    makeComposites: makeStageComposites,
  }),
};

/** 创建 Notation Stage 的 Vanilla embed 节点 */
export const stage = (id: string, input: StageVanillaInput): VanillaEmbedSpec<StageVanillaInput> => ({
  type: 'embed',
  kind: NotationStageVanillaNamespace,
  id,
  props: input,
});

/** Notation Decision 的 Vanilla 适配器 */
export const DecisionVanillaAdapter: VanillaTier2Adapter<DecisionVanillaInput> = {
  kind: NotationDecisionVanillaNamespace,
  namespace: NotationDecisionVanillaNamespace,
  lower: (props, context) => ({
    node: createDecision({ ...props, id: context.id }),
    datasets: {},
    makeComposites: makeDecisionComposites,
  }),
};

/** 创建 Notation Decision 的 Vanilla embed 节点 */
export const decision = (id: string, input: DecisionVanillaInput): VanillaEmbedSpec<DecisionVanillaInput> => ({
  type: 'embed',
  kind: NotationDecisionVanillaNamespace,
  id,
  props: input,
});

/** Notation Junction 的 Vanilla 适配器 */
export const JunctionVanillaAdapter: VanillaTier2Adapter<JunctionVanillaInput> = {
  kind: NotationJunctionVanillaNamespace,
  namespace: NotationJunctionVanillaNamespace,
  lower: (props, context) => ({
    node: createJunction({ ...props, id: context.id }),
    datasets: {},
    makeComposites: makeJunctionComposites,
  }),
};

/** 创建 Notation Junction 的 Vanilla embed 节点 */
export const junction = (id: string, input: JunctionVanillaInput): VanillaEmbedSpec<JunctionVanillaInput> => ({
  type: 'embed',
  kind: NotationJunctionVanillaNamespace,
  id,
  props: input,
});

/** Notation Connector 的 Vanilla 适配器 */
export const ConnectorVanillaAdapter: VanillaTier2Adapter<ConnectorVanillaInput> = {
  kind: NotationConnectorVanillaNamespace,
  namespace: NotationConnectorVanillaNamespace,
  lower: (props, context) => ({
    node: createEmbeddedConnector(context.id, props),
    datasets: {},
    makeComposites: makeConnectorComposites,
  }),
};

/** 创建 Notation Connector 的 Vanilla embed 节点 */
export const connector = (id: string, input: ConnectorVanillaInput): VanillaEmbedSpec<ConnectorVanillaInput> => ({
  type: 'embed',
  kind: NotationConnectorVanillaNamespace,
  id,
  props: input,
});
