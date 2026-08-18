import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Table React 包稳定错误码 */
export const RetikzTableReactErrorCode = {
  /** 未被更精确分类覆盖的 Table React 错误 */
  Default: 'TABLE_REACT_ERROR',
} as const;

/** Table React 包稳定错误码取值 */
export type RetikzTableReactErrorCodeValue = ValueOf<typeof RetikzTableReactErrorCode>;

/** Table React 包运行时错误的可选构造参数 */
type RetikzTableReactErrorOptions = Readonly<{
  /** 导致当前错误的原始异常或值 */
  cause?: unknown;
}>;

/** Table React 包未细分领域错误的统一结构化错误 */
export class RetikzTableReactError extends RetikzError<RetikzTableReactErrorCodeValue, Readonly<{ message: string }>> {
  /** 创建保留原始消息与 cause 的 Table React 包错误 */
  constructor(message: string, options?: RetikzTableReactErrorOptions) {
    super({
      code: RetikzTableReactErrorCode.Default,
      message,
      details: { message },
      cause: options?.cause,
    });
  }
}
