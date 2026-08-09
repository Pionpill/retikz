import type { ValueOf } from '@retikz/foundation';

/** 性能 trace 的执行阶段常量 */
export const PerformanceTracePhase = {
  /** 完整编译阶段 */
  Compile: 'compile',
  /** Scene 图元提交阶段 */
  Commit: 'commit',
  /** 增量更新阶段 */
  Update: 'update',
} as const;

/** 性能 trace 的执行阶段取值类型 */
export type PerformanceTracePhaseValue = ValueOf<typeof PerformanceTracePhase>;

/** 性能 trace 的计数单位常量 */
export const PerformanceTraceUnit = {
  /** IR 子节点计数单位 */
  IrChild: 'ir-child',
  /** Scene 图元计数单位 */
  ScenePrimitive: 'scene-primitive',
  /** Program 计数单位 */
  Program: 'program',
  /** Scene 变更计数单位 */
  SceneChange: 'scene-change',
} as const;

/** 性能 trace 的计数单位取值类型 */
export type PerformanceTraceUnitValue = ValueOf<typeof PerformanceTraceUnit>;

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
export type PerformanceTraceOutcomeValue = ValueOf<typeof PerformanceTraceOutcome>;
