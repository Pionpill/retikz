import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Graph React package 的稳定错误码 */
export const RetikzGraphReactErrorCode = {
  /** Entity children 超出 Node-compatible text */
  EntityChildInvalid: 'GRAPH_REACT_ENTITY_CHILD_INVALID',
  /** Entity canonical props 与 JSX sugar 冲突 */
  EntityInputInvalid: 'GRAPH_REACT_ENTITY_INPUT_INVALID',
  /** Relation route / way 与 JSX sugar 无效或冲突 */
  RelationInputInvalid: 'GRAPH_REACT_RELATION_INPUT_INVALID',
  /** embedded Graph 错误接收 standalone Layout 宿主属性 */
  GraphHostPropsInvalid: 'GRAPH_REACT_GRAPH_HOST_PROPS_INVALID',
  /** Block 组合结构或单 child slot 无效 */
  BlockStructureInvalid: 'GRAPH_REACT_BLOCK_STRUCTURE_INVALID',
} as const;

/** Graph React package 稳定错误码取值 */
export type RetikzGraphReactErrorCodeValue = ValueOf<typeof RetikzGraphReactErrorCode>;

/** Graph React package 错误的结构化详情 */
export type RetikzGraphReactErrorDetails = Readonly<{
  /** 发生错误的 authoring slot 或 marker */
  label?: string;
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
