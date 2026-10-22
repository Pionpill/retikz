import type { ValueOf } from '@retikz/foundation';

/** 编译会话 trace 阶段 */
export const ReconcilerTracePhase = {
  /** 成功提交的编译工作量 */
  Update: 'update',
} as const;

export type ReconcilerTracePhase = ValueOf<typeof ReconcilerTracePhase>;

/** 编译会话 trace 计数单位 */
export const ReconcilerTraceUnit = {
  /** Weave 实际执行的元素编译次数 */
  ElementCompile: 'element-compile',
  /** Composite 场景的完整 Core 编译次数 */
  SceneCompile: 'scene-compile',
} as const;
export type ReconcilerTraceUnit = ValueOf<typeof ReconcilerTraceUnit>;
