import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Chart Vanilla 包稳定错误码 */
export const RetikzChartVanillaErrorCode = {
  /** 未被更精确分类覆盖的 Chart Vanilla 错误 */
  Default: 'CHART_VANILLA_ERROR',
} as const;

/** Chart Vanilla 包稳定错误码取值 */
export type RetikzChartVanillaErrorCodeValue = ValueOf<typeof RetikzChartVanillaErrorCode>;

/** Chart Vanilla 包运行时错误的可选构造参数 */
type RetikzChartVanillaErrorOptions = Readonly<{
  /** 导致当前错误的原始异常或值 */
  cause?: unknown;
}>;

/** Chart Vanilla 包未细分领域错误的统一结构化错误 */
export class RetikzChartVanillaError extends RetikzError<
  RetikzChartVanillaErrorCodeValue,
  Readonly<{ message: string }>
> {
  /** 创建保留原始消息与 cause 的 Chart Vanilla 包错误 */
  constructor(message: string, options?: RetikzChartVanillaErrorOptions) {
    super({
      code: RetikzChartVanillaErrorCode.Default,
      message,
      details: { message },
      cause: options?.cause,
    });
  }
}
