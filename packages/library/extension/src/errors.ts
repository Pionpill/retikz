import type { ValueOf } from '@retikz/foundation';
import { RetikzError } from '@retikz/foundation';

/** Extension 包结构化错误码 */
export const RetikzExtensionErrorCode = {
  AuthoringInvalid: 'EXTENSION_AUTHORING_INVALID',
  GeometryInvalid: 'EXTENSION_GEOMETRY_INVALID',
  PipelineInvariant: 'EXTENSION_PIPELINE_INVARIANT',
  RegistryConflict: 'EXTENSION_REGISTRY_CONFLICT',
  ResolutionInvalid: 'EXTENSION_RESOLUTION_INVALID',
  SchemaInvariant: 'EXTENSION_SCHEMA_INVARIANT',
} as const;

/** Extension 包结构化错误码取值 */
export type RetikzExtensionErrorCodeValue = ValueOf<typeof RetikzExtensionErrorCode>;

/** Extension 包错误的结构化详情 */
export type RetikzExtensionErrorDetails = Readonly<Record<string, unknown>>;

/** Extension 包错误的构造参数 */
export type RetikzExtensionErrorOptions = Readonly<{
  /** 机器可判定的错误码 */
  code: RetikzExtensionErrorCodeValue;
  /** 面向调用方的错误消息 */
  message: string;
  /** 与错误码关联的结构化详情 */
  details: RetikzExtensionErrorDetails;
  /** 导致当前错误的原始异常或值 */
  cause?: unknown;
}>;

/** Extension 包在 authoring、几何和 lowering 阶段报告的结构化错误 */
export class RetikzExtensionError extends RetikzError<RetikzExtensionErrorCodeValue, RetikzExtensionErrorDetails> {
  /** 创建 Extension 包结构化错误 */
  constructor(options: RetikzExtensionErrorOptions) {
    super(options);
  }
}
