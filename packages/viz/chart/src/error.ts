import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Chart 包稳定错误码 */
export const RetikzChartErrorCode = {
  /** 未被更精确分类覆盖的 Chart 错误 */
  Default: 'CHART_ERROR',
} as const;

/** Chart 包稳定错误码取值 */
export type RetikzChartErrorCodeValue = ValueOf<typeof RetikzChartErrorCode>;

/** Chart 包运行时错误的可选构造参数 */
type RetikzChartErrorOptions = Readonly<{
  /** 导致当前错误的原始异常或值 */
  cause?: unknown;
}>;

/** Chart 包未细分领域错误的统一结构化错误 */
export class RetikzChartError extends RetikzError<RetikzChartErrorCodeValue, Readonly<{ message: string }>> {
  /** 创建保留原始消息与 cause 的 Chart 包错误 */
  constructor(message: string, options?: RetikzChartErrorOptions) {
    super({
      code: RetikzChartErrorCode.Default,
      message,
      details: { message },
      cause: options?.cause,
    });
  }
}
