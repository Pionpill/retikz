import type { ValueOf } from '@retikz/foundation';

/** Chart 包公开的编译 warning code */
export const ChartWarningCode = {
  /** authored mark 请求覆盖但当前 recipe 没有同 kind 内建 semantic mark group */
  MarkOverrideTargetNotFound: 'CHART_MARK_OVERRIDE_TARGET_NOT_FOUND',
} as const;

/** Chart 包公开的编译 warning code 取值 */
export type ChartWarningCodeValue = ValueOf<typeof ChartWarningCode>;
