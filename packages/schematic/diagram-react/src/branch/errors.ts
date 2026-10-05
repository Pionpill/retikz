import type { ValueOf } from '@retikz/foundation';
import { RetikzError } from '@retikz/foundation';

/** Diagram React Branch authoring 的稳定错误码 */
export const RetikzDiagramReactBranchErrorCode = {
  /** Branch JSX child 不属于当前允许的语义位置 */
  ChildInvalid: 'DIAGRAM_REACT_BRANCH_CHILD_INVALID',
  /** embedded BranchDiagram 错误接收 standalone Layout 宿主属性 */
  HostPropsInvalid: 'DIAGRAM_REACT_BRANCH_HOST_PROPS_INVALID',
} as const;

/** Diagram React Branch 稳定错误码取值 */
export type RetikzDiagramReactBranchErrorCodeValue = ValueOf<typeof RetikzDiagramReactBranchErrorCode>;

/** Diagram React Branch 错误的结构化详情 */
export type RetikzDiagramReactBranchErrorDetails = Readonly<{
  /** 发生错误的 authoring slot */
  label: string;
  /** 违反的输入约束 */
  reason: string;
  /** 实际收到的 JSX child 或宿主字段 */
  received?: ReadonlyArray<string>;
}>;

/** 创建 Diagram React Branch 错误所需的参数 */
export type RetikzDiagramReactBranchErrorOptions = Readonly<{
  /** 稳定错误码 */
  code: RetikzDiagramReactBranchErrorCodeValue;
  /** 面向调用方的错误消息 */
  message: string;
  /** 与错误码关联的结构化详情 */
  details: RetikzDiagramReactBranchErrorDetails;
  /** 导致当前错误的原始异常或值 */
  cause?: unknown;
}>;

/** Diagram React Branch authoring 的统一结构化错误 */
export class RetikzDiagramReactBranchError extends RetikzError<
  RetikzDiagramReactBranchErrorCodeValue,
  RetikzDiagramReactBranchErrorDetails
> {
  /** 稳定错误码 */
  readonly code: RetikzDiagramReactBranchErrorCodeValue;
  /** 与错误码关联的结构化详情 */
  readonly details: RetikzDiagramReactBranchErrorDetails;
  /** 原始错误或无效输入 */
  override readonly cause: unknown;

  /** 创建 Diagram React Branch authoring 错误 */
  constructor(options: RetikzDiagramReactBranchErrorOptions) {
    super(options);
    this.name = 'RetikzDiagramReactBranchError';
    this.code = options.code;
    this.details = options.details;
    this.cause = options.cause;
  }
}
