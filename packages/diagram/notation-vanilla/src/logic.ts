import type {
  CalloutInput,
  ConnectorInput,
  DecisionInput,
  IRTerminal,
  JunctionInput,
  LogicFrameInput,
  StageInput,
  TerminalInput,
} from '@retikz/notation';
import type { VanillaEmbedSpec, VanillaTier2Adapter } from '@retikz/vanilla';

import {
  CalloutDefinition,
  ConnectorDefinition,
  createCallout,
  createConnector,
  createDecision,
  createJunction,
  createLogicFrame,
  createStage,
  createTerminal,
  LogicFrameDefinition,
} from '@retikz/notation';

import {
  NotationCalloutVanillaNamespace,
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

/** Connector 的 Vanilla 构建器输入，embed id 提供稳定身份 */
export type ConnectorVanillaInput = Omit<ConnectorInput, 'id'>;

/** Callout 的 Vanilla 构建器输入，embed id 提供稳定身份 */
export type CalloutVanillaInput = Omit<CalloutInput, 'id'>;

const makeLogicFrameComposites = () => [LogicFrameDefinition];
const makeTerminalComposites = () => [];
const makeStageComposites = () => [];
const makeDecisionComposites = () => [];
const makeJunctionComposites = () => [];
const makeConnectorComposites = () => [ConnectorDefinition];
const makeCalloutComposites = () => [CalloutDefinition];

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
export const terminal = (id: string, input: TerminalVanillaInput): IRTerminal => createTerminal({ ...input, id });

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
export const stage = (id: string, input: StageVanillaInput): IRTerminal => createStage({ ...input, id });

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
export const decision = (id: string, input: DecisionVanillaInput): IRTerminal => createDecision({ ...input, id });

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
export const junction = (id: string, input: JunctionVanillaInput): IRTerminal => createJunction({ ...input, id });

/** Notation Connector 的 Vanilla 适配器 */
export const ConnectorVanillaAdapter: VanillaTier2Adapter<ConnectorVanillaInput> = {
  kind: NotationConnectorVanillaNamespace,
  namespace: NotationConnectorVanillaNamespace,
  lower: (props, context) => ({
    node: createConnector({ ...props, id: `${context.id}/connector` }),
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

/** Notation Callout 的 Vanilla 适配器 */
export const CalloutVanillaAdapter: VanillaTier2Adapter<CalloutVanillaInput> = {
  kind: NotationCalloutVanillaNamespace,
  namespace: NotationCalloutVanillaNamespace,
  lower: (props, context) => ({
    node: createCallout({ ...props, id: `${context.id}/callout` }),
    datasets: {},
    makeComposites: makeCalloutComposites,
  }),
};

/** 创建 Notation Callout 的 Vanilla embed 节点 */
export const callout = (id: string, input: CalloutVanillaInput): VanillaEmbedSpec<CalloutVanillaInput> => ({
  type: 'embed',
  kind: NotationCalloutVanillaNamespace,
  id,
  props: input,
});
