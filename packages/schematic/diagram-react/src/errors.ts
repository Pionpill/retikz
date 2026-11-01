import type { ValueOf } from '@retikz/foundation';
import { RetikzError } from '@retikz/foundation';

/** Diagram React 按 authoring 模块分类的稳定错误码 */
export const RetikzDiagramReactErrorCode = {
  /** Branch JSX child 不属于当前允许的语义位置 */
  BranchChildInvalid: 'DIAGRAM_REACT_BRANCH_CHILD_INVALID',
  /** embedded BranchDiagram 错误接收 standalone Layout 宿主属性 */
  BranchHostPropsInvalid: 'DIAGRAM_REACT_BRANCH_HOST_PROPS_INVALID',
  /** Flow JSX child 不属于当前允许的语义位置 */
  FlowChildInvalid: 'DIAGRAM_REACT_FLOW_CHILD_INVALID',
  /** embedded FlowDiagram 错误接收 standalone Layout 宿主属性 */
  FlowHostPropsInvalid: 'DIAGRAM_REACT_FLOW_HOST_PROPS_INVALID',
} as const;

export type RetikzDiagramReactErrorCode = ValueOf<typeof RetikzDiagramReactErrorCode>;

/** Diagram React authoring 错误的结构化详情 */
export type RetikzDiagramReactErrorDetails = Readonly<{
  /** 发生错误的 authoring slot */
  label: string;
  /** 违反的输入约束 */
  reason: string;
  /** 实际收到的 JSX child 或宿主字段 */
  received?: ReadonlyArray<string>;
}>;

/** 创建 Diagram React 错误所需的参数 */
export type RetikzDiagramReactErrorOptions = Readonly<{
  /** 稳定错误码 */
  code: RetikzDiagramReactErrorCode;
  /** 面向调用方的错误消息 */
  message: string;
  /** 与错误码关联的结构化详情 */
  details: RetikzDiagramReactErrorDetails;
  /** 导致当前错误的原始异常或值 */
  cause?: unknown;
}>;

/** Diagram React authoring 的统一结构化错误 */
export class RetikzDiagramReactError extends RetikzError<RetikzDiagramReactErrorCode, RetikzDiagramReactErrorDetails> {
  /** 创建 authoring 错误，保留失败详情与原始异常 */
  constructor(options: RetikzDiagramReactErrorOptions) {
    super(options);
    this.name = 'RetikzDiagramReactError';
  }
}
