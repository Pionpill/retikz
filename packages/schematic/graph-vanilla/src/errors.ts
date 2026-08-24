import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Graph Vanilla package 的稳定错误码 */
export const RetikzGraphVanillaErrorCode = {
  /** provider catalog 缺少依赖 */
  ProviderDependencyMissing: 'GRAPH_VANILLA_PROVIDER_DEPENDENCY_MISSING',
  /** 当前 adapter 未在 Kernel Vanilla normalizeScene 上下文中运行 */
  NormalizeSceneRequired: 'GRAPH_VANILLA_NORMALIZE_SCENE_REQUIRED',
  /** provider catalog 缺少 Graph 根 provider */
  ProviderMissing: 'GRAPH_VANILLA_PROVIDER_MISSING',
} as const;

/** Graph Vanilla package 稳定错误码取值 */
export type RetikzGraphVanillaErrorCodeValue = ValueOf<typeof RetikzGraphVanillaErrorCode>;

/** Graph Vanilla package 错误的结构化详情 */
export type RetikzGraphVanillaErrorDetails = Readonly<{
  /** 发生错误的 authoring slot 或 provider */
  label?: string;
  /** 缺失的 provider dependency */
  dependency?: string;
  /** 期望的 child 类型 */
  expectedType?: string;
  /** 实际收到的 child 类型 */
  receivedType?: string;
  /** 期望的 child 数量 */
  expectedCount?: number;
  /** 实际收到的 child 数量 */
  receivedCount?: number;
  /** 缺失的 provider 标识 */
  provider?: string;
}>;

/** 创建 Graph Vanilla package 错误所需的参数 */
export type RetikzGraphVanillaErrorOptions = Readonly<{
  /** 稳定错误码 */
  code: RetikzGraphVanillaErrorCodeValue;
  /** 面向调用方的错误消息 */
  message: string;
  /** 与错误码关联的结构化详情 */
  details: RetikzGraphVanillaErrorDetails;
  /** 导致当前错误的原始异常或值 */
  cause?: unknown;
}>;

/** Graph Vanilla package 的统一结构化错误 */
export class RetikzGraphVanillaError extends RetikzError<
  RetikzGraphVanillaErrorCodeValue,
  RetikzGraphVanillaErrorDetails
> {
  /** 稳定错误码 */
  readonly code: RetikzGraphVanillaErrorCodeValue;
  /** 与错误码关联的结构化详情 */
  readonly details: RetikzGraphVanillaErrorDetails;
  /** 原始错误或无效输入 */
  override readonly cause: unknown;

  /** 创建 Graph Vanilla package 错误 */
  constructor(options: RetikzGraphVanillaErrorOptions) {
    super(options);
    this.name = 'RetikzGraphVanillaError';
    this.code = options.code;
    this.details = options.details;
    this.cause = options.cause;
  }
}
