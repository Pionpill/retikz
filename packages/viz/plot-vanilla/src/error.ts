import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Plot Vanilla 包稳定错误码 */
export const RetikzPlotVanillaErrorCode = {
  /** 未被更精确分类覆盖的 Plot Vanilla 错误 */
  Default: 'PLOT_VANILLA_ERROR',
  /** Extension 包含不可序列化声明 */
  NonSerializableExtension: 'non-serializable-extension',
  /** Chart extension child 不受支持 */
  UnsupportedChartChild: 'unsupported-chart-child',
  /** 声明来源重复 */
  DuplicateDeclarationSource: 'duplicate-declaration-source',
} as const;

/** Plot Vanilla 包稳定错误码取值 */
export type RetikzPlotVanillaErrorCodeValue = ValueOf<typeof RetikzPlotVanillaErrorCode>;

/** Plot Vanilla 包运行时错误的可选构造参数 */
export type RetikzPlotVanillaErrorOptions = Readonly<{
  /** 稳定错误码 */
  code: RetikzPlotVanillaErrorCodeValue;
  /** 面向调用方的错误消息 */
  message?: string;
  /** 失败上下文的结构化详情 */
  details?: Readonly<Record<string, unknown>>;
  /** 导致当前错误的原始异常或值 */
  cause?: unknown;
}>;

type RetikzPlotVanillaErrorCauseOptions = Readonly<Pick<RetikzPlotVanillaErrorOptions, 'cause'>>;

/** Plot Vanilla 包统一的结构化错误 */
export class RetikzPlotVanillaError extends RetikzError<
  RetikzPlotVanillaErrorCodeValue,
  Readonly<Record<string, unknown>>
> {
  /** 使用默认错误码创建 Plot Vanilla 错误 */
  constructor(message: string, options?: RetikzPlotVanillaErrorCauseOptions);
  /** 使用结构化参数创建 Plot Vanilla 错误 */
  constructor(options: RetikzPlotVanillaErrorOptions);
  constructor(
    optionsOrMessage: RetikzPlotVanillaErrorOptions | string,
    causeOptions: RetikzPlotVanillaErrorCauseOptions = {},
  ) {
    const options: RetikzPlotVanillaErrorOptions =
      typeof optionsOrMessage === 'string'
        ? {
            code: RetikzPlotVanillaErrorCode.Default,
            message: optionsOrMessage,
            details: { message: optionsOrMessage },
            ...causeOptions,
          }
        : optionsOrMessage;
    super({
      code: options.code,
      message: options.message ?? options.code,
      details: options.details ?? Object.freeze({}),
      cause: options.cause,
    });
  }
}
