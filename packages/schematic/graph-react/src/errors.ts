import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Graph React package 的稳定错误码 */
export const RetikzGraphReactErrorCode = {
  /** authoring slot 的 child 数量不符合契约 */
  AuthoringChildCountInvalid: 'GRAPH_REACT_AUTHORING_CHILD_COUNT_INVALID',
  /** semantic Entity 未收到唯一 Core Node authoring input */
  SemanticNodeInvalid: 'GRAPH_REACT_SEMANTIC_NODE_INVALID',
  /** Relation children 未收到唯一 Core Path authoring input */
  RelationPathInvalid: 'GRAPH_REACT_RELATION_PATH_INVALID',
  /** ContainerHeader marker 重复 */
  ContainerHeaderDuplicate: 'GRAPH_REACT_CONTAINER_HEADER_DUPLICATE',
  /** Container marker child 类型不受支持 */
  ContainerChildInvalid: 'GRAPH_REACT_CONTAINER_CHILD_INVALID',
  /** Container marker children 与 props 同时提供 */
  ContainerPropsConflict: 'GRAPH_REACT_CONTAINER_PROPS_CONFLICT',
  /** Container marker 未作为直接 child 使用 */
  ContainerMarkerParentRequired: 'GRAPH_REACT_CONTAINER_MARKER_PARENT_REQUIRED',
  /** Relation children 与 way 同时提供 */
  RelationInputInvalid: 'GRAPH_REACT_RELATION_INPUT_INVALID',
} as const;

/** Graph React package 稳定错误码取值 */
export type RetikzGraphReactErrorCodeValue = ValueOf<typeof RetikzGraphReactErrorCode>;

/** Graph React package 错误的结构化详情 */
export type RetikzGraphReactErrorDetails = Readonly<{
  /** 发生错误的 authoring slot 或 marker */
  label?: string;
  /** 关联的 marker 名称 */
  marker?: string;
  /** 期望的 child 类型 */
  expectedType?: string;
  /** 实际收到的 child 类型 */
  receivedType?: string;
  /** 期望的 child 数量 */
  expectedCount?: number;
  /** 实际收到的 child 数量 */
  receivedCount?: number;
  /** 违反的输入约束 */
  reason?: string;
}>;

/** 创建 Graph React package 错误所需的参数 */
export type RetikzGraphReactErrorOptions = Readonly<{
  /** 稳定错误码 */
  code: RetikzGraphReactErrorCodeValue;
  /** 面向调用方的错误消息 */
  message: string;
  /** 与错误码关联的结构化详情 */
  details: RetikzGraphReactErrorDetails;
  /** 导致当前错误的原始异常或值 */
  cause?: unknown;
}>;

/** Graph React package 的统一结构化错误 */
export class RetikzGraphReactError extends RetikzError<RetikzGraphReactErrorCodeValue, RetikzGraphReactErrorDetails> {
  /** 稳定错误码 */
  readonly code: RetikzGraphReactErrorCodeValue;
  /** 与错误码关联的结构化详情 */
  readonly details: RetikzGraphReactErrorDetails;
  /** 原始错误或无效输入 */
  override readonly cause: unknown;

  /** 创建 Graph React package 错误 */
  constructor(options: RetikzGraphReactErrorOptions) {
    super(options);
    this.name = 'RetikzGraphReactError';
    this.code = options.code;
    this.details = options.details;
    this.cause = options.cause;
  }
}
