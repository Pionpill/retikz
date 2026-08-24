import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Chart React 包稳定错误码 */
export const RetikzChartReactErrorCode = {
  /** 未被更精确分类覆盖的 Chart React 错误 */
  Default: 'CHART_REACT_ERROR',
} as const;

/** Chart React 包稳定错误码取值 */
export type RetikzChartReactErrorCodeValue = ValueOf<typeof RetikzChartReactErrorCode>;

/** Chart React 包运行时错误的可选构造参数 */
type RetikzChartReactErrorOptions = Readonly<{
  /** 导致当前错误的原始异常或值 */
  cause?: unknown;
}>;

/** Chart React 包未细分领域错误的统一结构化错误 */
export class RetikzChartReactError extends RetikzError<RetikzChartReactErrorCodeValue, Readonly<{ message: string }>> {
  /** 创建保留原始消息与 cause 的 Chart React 包错误 */
  constructor(message: string, options?: RetikzChartReactErrorOptions) {
    super({
      code: RetikzChartReactErrorCode.Default,
      message,
      details: { message },
      cause: options?.cause,
    });
  }
}
