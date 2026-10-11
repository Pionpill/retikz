import type { ValueOf } from '@retikz/foundation';

/** 性能 trace 的执行结果常量 */
export const PerformanceTraceOutcome = {
  /** 完整执行结果 */
  Full: 'full',
  /** 增量执行结果 */
  Incremental: 'incremental',
  /** 增量路径主动放弃结果 */
  Bailout: 'bailout',
  /** 回退到完整执行结果 */
  Fallback: 'fallback',
  /** 提交结果 */
  Commit: 'commit',
} as const;

/** 性能 trace 的执行结果取值类型 */
export type PerformanceTraceOutcome = ValueOf<typeof PerformanceTraceOutcome>;
