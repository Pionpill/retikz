import type { ValueOf } from '@retikz/foundation';

/** Runtime Computation 的 candidate 与 commit 执行阶段常量 */
export const RuntimeComputationPhase = {
  /** 初始 runtime 阶段 */
  Initial: 'initial',
  /** 已有 runtime 的更新阶段 */
  Update: 'update',
} as const;

/** Runtime Computation 执行阶段取值类型 */
export type RuntimeComputationPhaseValue = ValueOf<typeof RuntimeComputationPhase>;

/** Runtime Computation callback 结果的 kind 常量 */
export const RuntimeComputationKind = {
  /** 完整执行结果 */
  Full: 'full',
  /** 增量执行结果 */
  Incremental: 'incremental',
  /** 复用已提交 artifact 的结果 */
  Bailout: 'bailout',
  /** 放弃增量路径并回退到完整执行的结果 */
  Fallback: 'fallback',
} as const;

/** Runtime Computation callback 结果的 kind 取值类型 */
export type RuntimeComputationKindValue = ValueOf<typeof RuntimeComputationKind>;

/** Runtime Computation callback 的实际执行方式常量 */
export const RuntimeComputationExecution = {
  /** 完整执行方式 */
  Full: RuntimeComputationKind.Full,
  /** 增量执行方式 */
  Incremental: RuntimeComputationKind.Incremental,
  /** 从增量路径回退后的完整执行方式 */
  Fallback: RuntimeComputationKind.Fallback,
} as const;

/** Runtime Computation callback 的实际执行方式取值类型 */
export type RuntimeComputationExecutionValue = ValueOf<typeof RuntimeComputationExecution>;
