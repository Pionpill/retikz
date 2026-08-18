import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Layout 包结构化错误码 */
export const RetikzLayoutErrorCode = {
  AuthoringInvalid: 'LAYOUT_AUTHORING_INVALID',
  GeometryInvalid: 'LAYOUT_GEOMETRY_INVALID',
  PlacementInvalid: 'LAYOUT_PLACEMENT_INVALID',
  PipelineInvariant: 'LAYOUT_PIPELINE_INVARIANT',
  SolverInvariant: 'LAYOUT_SOLVER_INVARIANT',
} as const;

/** Layout 包结构化错误码取值 */
export type RetikzLayoutErrorCodeValue = ValueOf<typeof RetikzLayoutErrorCode>;

/** Layout 包错误的结构化详情 */
export type RetikzLayoutErrorDetails = Readonly<Record<string, unknown>>;

/** Layout 包错误的构造参数 */
export type RetikzLayoutErrorOptions = Readonly<{
  /** 机器可判定的错误码 */
  code: RetikzLayoutErrorCodeValue;
  /** 面向调用方的错误消息 */
  message: string;
  /** 与错误码关联的结构化详情 */
  details: RetikzLayoutErrorDetails;
  /** 导致当前错误的原始异常或值 */
  cause?: unknown;
}>;

/** Layout 包在 authoring、求解和 lowering 阶段报告的结构化错误 */
export class RetikzLayoutError extends RetikzError<RetikzLayoutErrorCodeValue, RetikzLayoutErrorDetails> {
  /** 创建 Layout 包结构化错误 */
  constructor(options: RetikzLayoutErrorOptions) {
    super(options);
  }
}
