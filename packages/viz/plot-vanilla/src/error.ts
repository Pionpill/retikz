import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Plot Vanilla 包稳定错误码 */
export const RetikzPlotVanillaErrorCode = {
  /** 未被更精确分类覆盖的 Plot Vanilla 错误 */
  Default: 'PLOT_VANILLA_ERROR',
} as const;

/** Plot Vanilla 包稳定错误码取值 */
export type RetikzPlotVanillaErrorCodeValue = ValueOf<typeof RetikzPlotVanillaErrorCode>;

/** Plot Vanilla 包运行时错误的可选构造参数 */
type RetikzPlotVanillaErrorOptions = Readonly<{
  /** 导致当前错误的原始异常或值 */
  cause?: unknown;
}>;

/** Plot Vanilla 包未细分领域错误的统一结构化错误 */
export class RetikzPlotVanillaError extends RetikzError<
  RetikzPlotVanillaErrorCodeValue,
  Readonly<{ message: string }>
> {
  /** 创建保留原始消息与 cause 的 Plot Vanilla 包错误 */
  constructor(message: string, options?: RetikzPlotVanillaErrorOptions) {
    super({
      code: RetikzPlotVanillaErrorCode.Default,
      message,
      details: { message },
      cause: options?.cause,
    });
  }
}
