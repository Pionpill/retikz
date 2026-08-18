import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Table Vanilla 包稳定错误码 */
export const RetikzTableVanillaErrorCode = {
  /** 未被更精确分类覆盖的 Table Vanilla 错误 */
  Default: 'TABLE_VANILLA_ERROR',
} as const;

/** Table Vanilla 包稳定错误码取值 */
export type RetikzTableVanillaErrorCodeValue = ValueOf<typeof RetikzTableVanillaErrorCode>;

/** Table Vanilla 包运行时错误的可选构造参数 */
type RetikzTableVanillaErrorOptions = Readonly<{
  /** 导致当前错误的原始异常或值 */
  cause?: unknown;
}>;

/** Table Vanilla 包未细分领域错误的统一结构化错误 */
export class RetikzTableVanillaError extends RetikzError<
  RetikzTableVanillaErrorCodeValue,
  Readonly<{ message: string }>
> {
  /** 创建保留原始消息与 cause 的 Table Vanilla 包错误 */
  constructor(message: string, options?: RetikzTableVanillaErrorOptions) {
    super({
      code: RetikzTableVanillaErrorCode.Default,
      message,
      details: { message },
      cause: options?.cause,
    });
  }
}
