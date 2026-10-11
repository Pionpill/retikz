import type { ValueOf } from '@retikz/foundation';

/** Core 编译与增量执行的 trace 阶段词汇 */
export const CoreTracePhase = {
  /** 独立完整编译入口 */
  Compile: 'compile',
  /** Core Computation 的初始化与更新执行 */
  Update: 'update',
} as const;

/** Core trace 阶段名称 */
export type CoreTracePhase = ValueOf<typeof CoreTracePhase>;

/** Core IR 与 Scene 的 trace 计数单位，供领域编译和后端执行共同使用 */
export const CoreTraceUnit = {
  /** 实际访问的 IR child occurrence */
  IrChild: 'ir-child',
  /** 实际访问的 Scene primitive occurrence */
  ScenePrimitive: 'scene-primitive',
  /** 实际处理的 Scene patch operation */
  SceneChange: 'scene-change',
} as const;

/** Core IR / Scene trace 计数单位名称 */
export type CoreTraceUnit = ValueOf<typeof CoreTraceUnit>;
