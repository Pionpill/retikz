import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Plot 包稳定错误码 */
export const RetikzPlotErrorCode = {
  /** 未被更精确分类覆盖的 Plot 错误 */
  Default: 'PLOT_ERROR',
} as const;

/** Plot 包稳定错误码取值 */
export type RetikzPlotErrorCodeValue = ValueOf<typeof RetikzPlotErrorCode>;

/** Plot 包运行时错误的可选构造参数 */
type RetikzPlotErrorOptions = Readonly<{
  /** 导致当前错误的原始异常或值 */
  cause?: unknown;
}>;

/** Plot 包未细分领域错误的统一结构化错误 */
export class RetikzPlotError extends RetikzError<RetikzPlotErrorCodeValue, Readonly<{ message: string }>> {
  /** 创建保留原始消息与 cause 的 Plot 包错误 */
  constructor(message: string, options?: RetikzPlotErrorOptions) {
    super({
      code: RetikzPlotErrorCode.Default,
      message,
      details: { message },
      cause: options?.cause,
    });
  }
}
