import type { ValueOf } from '@retikz/foundation';

/** Runtime Program 的 candidate 与 commit 执行阶段常量 */
export const RuntimeProgramPhase = {
  /** 初始 session 阶段 */
  Initial: 'initial',
  /** 已有 session 的更新阶段 */
  Update: 'update',
} as const;

/** Runtime Program 执行阶段取值类型 */
export type RuntimeProgramPhaseValue = ValueOf<typeof RuntimeProgramPhase>;

/** Runtime Program callback 结果的 kind 常量 */
export const RuntimeProgramKind = {
  /** 完整执行结果 */
  Full: 'full',
  /** 增量执行结果 */
  Incremental: 'incremental',
  /** 复用已提交 artifact 的结果 */
  Bailout: 'bailout',
  /** 放弃增量路径并回退到完整执行的结果 */
  Fallback: 'fallback',
} as const;

/** Runtime Program callback 结果的 kind 取值类型 */
export type RuntimeProgramKindValue = ValueOf<typeof RuntimeProgramKind>;

/** Runtime Program callback 的实际执行方式常量 */
export const RuntimeProgramExecution = {
  /** 完整执行方式 */
  Full: RuntimeProgramKind.Full,
  /** 增量执行方式 */
  Incremental: RuntimeProgramKind.Incremental,
  /** 从增量路径回退后的完整执行方式 */
  Fallback: RuntimeProgramKind.Fallback,
} as const;

/** Runtime Program callback 的实际执行方式取值类型 */
export type RuntimeProgramExecutionValue = ValueOf<typeof RuntimeProgramExecution>;
