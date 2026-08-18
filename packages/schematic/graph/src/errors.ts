import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Graph package 的稳定错误码 */
export const RetikzGraphErrorCode = {
  /** Graph definition key 重复 */
  DefinitionDuplicate: 'GRAPH_DEFINITION_DUPLICATE',
  /** 一次 Graph provider assembly 收到不一致的 definition */
  DefinitionConflict: 'GRAPH_DEFINITION_CONFLICT',
  /** Graph definition key 未注册 */
  DefinitionNotRegistered: 'GRAPH_DEFINITION_NOT_REGISTERED',
  /** Graph definition 的用户回调或回调结果无效 */
  DefinitionCallbackFailed: 'GRAPH_DEFINITION_CALLBACK_FAILED',
  /** Graph 编译内部不变量被破坏 */
  CompileInvariant: 'GRAPH_COMPILE_INVARIANT',
  /** Relation authoring input 同时或都未提供来源 */
  RelationInputInvalid: 'GRAPH_RELATION_INPUT_INVALID',
} as const;

/** Graph package 稳定错误码取值 */
export type RetikzGraphErrorCodeValue = ValueOf<typeof RetikzGraphErrorCode>;

/** Graph package 错误的结构化详情 */
export type RetikzGraphErrorDetails = Readonly<{
  /** 发生错误的 Graph capability */
  capability?: string;
  /** 发生错误的公开 key */
  key?: string;
  /** 当前 registry 中可用的 key */
  availableKeys?: ReadonlyArray<string>;
  /** 关联的 Graph IR identity */
  nodeId?: string;
  /** 违反的不变量或输入约束 */
  reason?: string;
}>;

/** 创建 Graph package 错误所需的参数 */
export type RetikzGraphErrorOptions = Readonly<{
  /** 稳定错误码 */
  code: RetikzGraphErrorCodeValue;
  /** 面向调用方的错误消息 */
  message: string;
  /** 与错误码关联的结构化详情 */
  details: RetikzGraphErrorDetails;
  /** 导致当前错误的原始异常或值 */
  cause?: unknown;
}>;

/** Graph package 的统一结构化错误 */
export class RetikzGraphError extends RetikzError<RetikzGraphErrorCodeValue, RetikzGraphErrorDetails> {
  /** 稳定错误码 */
  readonly code: RetikzGraphErrorCodeValue;
  /** 与错误码关联的结构化详情 */
  readonly details: RetikzGraphErrorDetails;
  /** 原始错误或无效输入 */
  override readonly cause: unknown;

  /** 创建 Graph package 错误 */
  constructor(options: RetikzGraphErrorOptions) {
    super(options);
    this.name = 'RetikzGraphError';
    this.code = options.code;
    this.details = options.details;
    this.cause = options.cause;
  }
}
