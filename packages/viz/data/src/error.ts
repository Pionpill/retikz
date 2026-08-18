import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Data 包稳定错误码 */
export const RetikzDataErrorCode = {
  /** 未被更精确分类覆盖的 Data 错误 */
  Default: 'DATA_ERROR',
} as const;

/** Data 包稳定错误码取值 */
export type RetikzDataErrorCodeValue = ValueOf<typeof RetikzDataErrorCode>;

/** Data 包运行时错误的可选构造参数 */
type RetikzDataErrorOptions = Readonly<{
  /** 导致当前错误的原始异常或值 */
  cause?: unknown;
}>;

/** Data 包未细分领域错误的统一结构化错误 */
export class RetikzDataError extends RetikzError<RetikzDataErrorCodeValue, Readonly<{ message: string }>> {
  /** 创建保留原始消息与 cause 的 Data 包错误 */
  constructor(message: string, options?: RetikzDataErrorOptions) {
    super({
      code: RetikzDataErrorCode.Default,
      message,
      details: { message },
      cause: options?.cause,
    });
  }
}
