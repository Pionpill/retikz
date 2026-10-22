import type { ValueOf } from '@retikz/foundation';

/** 增量编译 trace 阶段 */
export const ReconcilerTracePhase = {
  /** 候选结果计算 */
  Update: 'update',
} as const;

export type ReconcilerTracePhase = ValueOf<typeof ReconcilerTracePhase>;

/** 增量编译 trace 计数单位 */
export const ReconcilerTraceUnit = {
  /** 输入对象 */
  IrChild: 'ir-child',
  /** Scene 更新操作 */
  SceneChange: 'scene-change',
} as const;
export type ReconcilerTraceUnit = ValueOf<typeof ReconcilerTraceUnit>;
