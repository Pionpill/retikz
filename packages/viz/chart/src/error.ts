import type { ValueOf } from '@retikz/foundation';
import { RetikzError } from '@retikz/foundation';

/** Chart 包稳定错误码 */
export const RetikzChartErrorCode = {
  /** 未被更精确分类覆盖的 Chart 错误 */
  Default: 'CHART_ERROR',

  /** Chart type 未知 */
  ProviderTypeUnknown: 'CHART_PROVIDER_TYPE_UNKNOWN',
  /** Chart family / chartType / mark Definition registry 冲突 */
  ProviderRegistryInvalid: 'CHART_PROVIDER_REGISTRY_INVALID',
  /** Definition key 重复 */
  ProviderDefinitionDuplicate: 'CHART_PROVIDER_DEFINITION_DUPLICATE',
  /** Definition 依赖缺失 */
  ProviderDependencyMissing: 'CHART_PROVIDER_DEPENDENCY_MISSING',
  /** Theme base 继承环 */
  ProviderThemeCycle: 'CHART_PROVIDER_THEME_CYCLE',
  /** Source family 与 recipe family 不匹配 */
  ProviderFamilyMismatch: 'CHART_PROVIDER_FAMILY_MISMATCH',
  /** Source 中未知 recipe / mark / theme key */
  ProviderDefinitionUnknown: 'CHART_PROVIDER_DEFINITION_UNKNOWN',

  /** Chart Source IR 无效 */
  ResolveInputInvalid: 'CHART_RESOLVE_INPUT_INVALID',
  /** Chart 解析后的 Plot 无效 */
  ResolvePlotInvalid: 'CHART_RESOLVE_PLOT_INVALID',
} as const;

/** Chart 包稳定错误码取值 */
export type RetikzChartErrorCode = ValueOf<typeof RetikzChartErrorCode>;

/** Chart 包运行时错误的可选构造参数 */
export type RetikzChartErrorOptions = Readonly<{
  /** 稳定错误码 */
  code: RetikzChartErrorCode;
  /** 面向调用方的错误消息 */
  message?: string;
  /** 失败上下文的结构化详情 */
  details?: Readonly<Record<string, unknown>>;
  /** 导致当前错误的原始异常或值 */
  cause?: unknown;
}>;

type RetikzChartErrorCauseOptions = Readonly<Pick<RetikzChartErrorOptions, 'cause'>>;

/** Chart 包统一的结构化错误 */
export class RetikzChartError extends RetikzError<RetikzChartErrorCode, Readonly<Record<string, unknown>>> {
  /** 使用默认错误码创建 Chart 错误 */
  constructor(message: string, options?: RetikzChartErrorCauseOptions);
  /** 使用结构化参数创建 Chart 错误 */
  constructor(options: RetikzChartErrorOptions);
  constructor(optionsOrMessage: RetikzChartErrorOptions | string, causeOptions: RetikzChartErrorCauseOptions = {}) {
    const options: RetikzChartErrorOptions =
      typeof optionsOrMessage === 'string'
        ? {
            code: RetikzChartErrorCode.Default,
            message: optionsOrMessage,
            details: { message: optionsOrMessage },
            ...causeOptions,
          }
        : optionsOrMessage;
    super({
      code: options.code,
      message: options.message ?? `Chart resolution failed: ${options.code}`,
      details: options.details ?? Object.freeze({}),
      cause: options.cause,
    });
  }
}
