import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Diagram React Flow authoring 的稳定错误码 */
export const RetikzDiagramReactFlowErrorCode = {
  /** Flow JSX child 不属于当前允许的语义位置 */
  ChildInvalid: 'DIAGRAM_REACT_FLOW_CHILD_INVALID',
  /** embedded FlowDiagram 错误接收 standalone Layout 宿主属性 */
  HostPropsInvalid: 'DIAGRAM_REACT_FLOW_HOST_PROPS_INVALID',
} as const;

/** Diagram React Flow 稳定错误码取值 */
export type RetikzDiagramReactFlowErrorCodeValue = ValueOf<typeof RetikzDiagramReactFlowErrorCode>;

/** Diagram React Flow 错误的结构化详情 */
export type RetikzDiagramReactFlowErrorDetails = Readonly<{
  /** 发生错误的 authoring slot */
  label: string;
  /** 违反的输入约束 */
  reason: string;
  /** 实际收到的 JSX child 或宿主字段 */
  received?: ReadonlyArray<string>;
}>;

/** 创建 Diagram React Flow 错误所需的参数 */
export type RetikzDiagramReactFlowErrorOptions = Readonly<{
  /** 稳定错误码 */
  code: RetikzDiagramReactFlowErrorCodeValue;
  /** 面向调用方的错误消息 */
  message: string;
  /** 与错误码关联的结构化详情 */
  details: RetikzDiagramReactFlowErrorDetails;
  /** 导致当前错误的原始异常或值 */
  cause?: unknown;
}>;

/** Diagram React Flow authoring 的统一结构化错误 */
export class RetikzDiagramReactFlowError extends RetikzError<
  RetikzDiagramReactFlowErrorCodeValue,
  RetikzDiagramReactFlowErrorDetails
> {
  /** 稳定错误码 */
  readonly code: RetikzDiagramReactFlowErrorCodeValue;
  /** 与错误码关联的结构化详情 */
  readonly details: RetikzDiagramReactFlowErrorDetails;
  /** 原始错误或无效输入 */
  override readonly cause: unknown;

  /** 创建 Diagram React Flow authoring 错误 */
  constructor(options: RetikzDiagramReactFlowErrorOptions) {
    super(options);
    this.name = 'RetikzDiagramReactFlowError';
    this.code = options.code;
    this.details = options.details;
    this.cause = options.cause;
  }
}
