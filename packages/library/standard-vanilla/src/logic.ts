import type {
  CalloutInput,
  ConnectorInput,
  DecisionInput,
  IRTerminal,
  JunctionInput,
  LogicFrameInput,
  StageInput,
  TerminalInput,
} from '@retikz/standard';
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
} from '@retikz/standard';

import {
  StandardCalloutVanillaNamespace,
  StandardConnectorVanillaNamespace,
  StandardDecisionVanillaNamespace,
  StandardJunctionVanillaNamespace,
  StandardLogicFrameVanillaNamespace,
  StandardStageVanillaNamespace,
  StandardTerminalVanillaNamespace,
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

/** Standard LogicFrame 的 Vanilla 适配器 */
export const LogicFrameVanillaAdapter: VanillaTier2Adapter<LogicFrameVanillaInput> = {
  kind: StandardLogicFrameVanillaNamespace,
  namespace: StandardLogicFrameVanillaNamespace,
  lower: (props, context) => ({
    node: createLogicFrame({ ...props, id: `${context.id}/logicFrame` }),
    datasets: {},
    makeComposites: makeLogicFrameComposites,
  }),
};

/** 创建 Standard LogicFrame 的 Vanilla embed 节点 */
export const logicFrame = (id: string, input: LogicFrameVanillaInput): VanillaEmbedSpec<LogicFrameVanillaInput> => ({
  type: 'embed',
  kind: StandardLogicFrameVanillaNamespace,
  id,
  props: input,
});

/** Standard Terminal 的 Vanilla 适配器 */
export const TerminalVanillaAdapter: VanillaTier2Adapter<TerminalVanillaInput> = {
  kind: StandardTerminalVanillaNamespace,
  namespace: StandardTerminalVanillaNamespace,
  lower: (props, context) => ({
    node: createTerminal({ ...props, id: context.id }),
    datasets: {},
    makeComposites: makeTerminalComposites,
  }),
};

/** 创建 Standard Terminal 的 Vanilla embed 节点 */
export const terminal = (id: string, input: TerminalVanillaInput): IRTerminal => createTerminal({ ...input, id });

/** Standard Stage 的 Vanilla 适配器 */
export const StageVanillaAdapter: VanillaTier2Adapter<StageVanillaInput> = {
  kind: StandardStageVanillaNamespace,
  namespace: StandardStageVanillaNamespace,
  lower: (props, context) => ({
    node: createStage({ ...props, id: context.id }),
    datasets: {},
    makeComposites: makeStageComposites,
  }),
};

/** 创建 Standard Stage 的 Vanilla embed 节点 */
export const stage = (id: string, input: StageVanillaInput): IRTerminal => createStage({ ...input, id });

/** Standard Decision 的 Vanilla 适配器 */
export const DecisionVanillaAdapter: VanillaTier2Adapter<DecisionVanillaInput> = {
  kind: StandardDecisionVanillaNamespace,
  namespace: StandardDecisionVanillaNamespace,
  lower: (props, context) => ({
    node: createDecision({ ...props, id: context.id }),
    datasets: {},
    makeComposites: makeDecisionComposites,
  }),
};

/** 创建 Standard Decision 的 Vanilla embed 节点 */
export const decision = (id: string, input: DecisionVanillaInput): IRTerminal => createDecision({ ...input, id });

/** Standard Junction 的 Vanilla 适配器 */
export const JunctionVanillaAdapter: VanillaTier2Adapter<JunctionVanillaInput> = {
  kind: StandardJunctionVanillaNamespace,
  namespace: StandardJunctionVanillaNamespace,
  lower: (props, context) => ({
    node: createJunction({ ...props, id: context.id }),
    datasets: {},
    makeComposites: makeJunctionComposites,
  }),
};

/** 创建 Standard Junction 的 Vanilla embed 节点 */
export const junction = (id: string, input: JunctionVanillaInput): IRTerminal => createJunction({ ...input, id });

/** Standard Connector 的 Vanilla 适配器 */
export const ConnectorVanillaAdapter: VanillaTier2Adapter<ConnectorVanillaInput> = {
  kind: StandardConnectorVanillaNamespace,
  namespace: StandardConnectorVanillaNamespace,
  lower: (props, context) => ({
    node: createConnector({ ...props, id: `${context.id}/connector` }),
    datasets: {},
    makeComposites: makeConnectorComposites,
  }),
};

/** 创建 Standard Connector 的 Vanilla embed 节点 */
export const connector = (id: string, input: ConnectorVanillaInput): VanillaEmbedSpec<ConnectorVanillaInput> => ({
  type: 'embed',
  kind: StandardConnectorVanillaNamespace,
  id,
  props: input,
});

/** Standard Callout 的 Vanilla 适配器 */
export const CalloutVanillaAdapter: VanillaTier2Adapter<CalloutVanillaInput> = {
  kind: StandardCalloutVanillaNamespace,
  namespace: StandardCalloutVanillaNamespace,
  lower: (props, context) => ({
    node: createCallout({ ...props, id: `${context.id}/callout` }),
    datasets: {},
    makeComposites: makeCalloutComposites,
  }),
};

/** 创建 Standard Callout 的 Vanilla embed 节点 */
export const callout = (id: string, input: CalloutVanillaInput): VanillaEmbedSpec<CalloutVanillaInput> => ({
  type: 'embed',
  kind: StandardCalloutVanillaNamespace,
  id,
  props: input,
});
