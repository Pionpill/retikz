import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Standard 包结构化错误码 */
export const RetikzStandardErrorCode = {
  AuthoringInvalid: 'STANDARD_AUTHORING_INVALID',
  GeometryInvalid: 'STANDARD_GEOMETRY_INVALID',
  PipelineInvariant: 'STANDARD_PIPELINE_INVARIANT',
  RegistryConflict: 'STANDARD_REGISTRY_CONFLICT',
  ResolutionInvalid: 'STANDARD_RESOLUTION_INVALID',
  SchemaInvariant: 'STANDARD_SCHEMA_INVARIANT',
} as const;

/** Standard 包结构化错误码取值 */
export type RetikzStandardErrorCodeValue = ValueOf<typeof RetikzStandardErrorCode>;

/** Standard 包错误的结构化详情 */
export type RetikzStandardErrorDetails = Readonly<Record<string, unknown>>;

/** Standard 包错误的构造参数 */
export type RetikzStandardErrorOptions = Readonly<{
  /** 机器可判定的错误码 */
  code: RetikzStandardErrorCodeValue;
  /** 面向调用方的错误消息 */
  message: string;
  /** 与错误码关联的结构化详情 */
  details: RetikzStandardErrorDetails;
  /** 导致当前错误的原始异常或值 */
  cause?: unknown;
}>;

/** Standard 包在 authoring、几何和 lowering 阶段报告的结构化错误 */
export class RetikzStandardError extends RetikzError<RetikzStandardErrorCodeValue, RetikzStandardErrorDetails> {
  /** 创建 Standard 包结构化错误 */
  constructor(options: RetikzStandardErrorOptions) {
    super(options);
  }
}
