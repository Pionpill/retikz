import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Table 包稳定错误码 */
export const RetikzTableErrorCode = {
  /** 未被更精确分类覆盖的 Table 错误 */
  Default: 'TABLE_ERROR',
  /** Table transaction 阶段失败 */
  TransactionStageFailed: 'TABLE_TRANSACTION_STAGE_FAILED',
} as const;

/** Table 包稳定错误码取值 */
export type RetikzTableErrorCodeValue = ValueOf<typeof RetikzTableErrorCode>;

/** Table 包运行时错误的可选构造参数 */
type RetikzTableErrorOptions = Readonly<{
  /** 导致当前错误的原始异常或值 */
  cause?: unknown;
}>;

/** Table 包未细分领域错误的统一结构化错误 */
export class RetikzTableError extends RetikzError<RetikzTableErrorCodeValue, Readonly<{ message: string }>> {
  /** 创建保留原始消息与 cause 的 Table 包错误 */
  constructor(message: string, options?: RetikzTableErrorOptions) {
    super({
      code: RetikzTableErrorCode.Default,
      message,
      details: { message },
      cause: options?.cause,
    });
  }
}
