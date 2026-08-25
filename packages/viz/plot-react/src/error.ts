import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Plot React 包稳定错误码 */
export const RetikzPlotReactErrorCode = {
  /** 未被更精确分类覆盖的 Plot React 错误 */
  Default: 'PLOT_REACT_ERROR',
} as const;

/** Plot React 包稳定错误码取值 */
export type RetikzPlotReactErrorCodeValue = ValueOf<typeof RetikzPlotReactErrorCode>;

/** Plot React 包运行时错误的可选构造参数 */
type RetikzPlotReactErrorOptions = Readonly<{
  /** 导致当前错误的原始异常或值 */
  cause?: unknown;
}>;

/** Plot React 包未细分领域错误的统一结构化错误 */
export class RetikzPlotReactError extends RetikzError<RetikzPlotReactErrorCodeValue, Readonly<{ message: string }>> {
  /** 创建保留原始消息与 cause 的 Plot React 包错误 */
  constructor(message: string, options?: RetikzPlotReactErrorOptions) {
    super({
      code: RetikzPlotReactErrorCode.Default,
      message,
      details: { message },
      cause: options?.cause,
    });
  }
}
