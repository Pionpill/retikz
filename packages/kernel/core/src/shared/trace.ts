import type { ValueOf } from '@retikz/foundation';

/** Core 静态编译的 trace 阶段词汇 */
export const CoreTracePhase = {
  /** 独立完整编译入口 */
  Compile: 'compile',
} as const;

/** Core trace 阶段名称 */
export type CoreTracePhase = ValueOf<typeof CoreTracePhase>;

/** Core IR 与 Scene 的 trace 计数单位，供领域编译和后端执行共同使用 */
export const CoreTraceUnit = {
  /** 实际访问的 IR child occurrence */
  IrChild: 'ir-child',
  /** 实际访问的 Scene primitive occurrence */
  ScenePrimitive: 'scene-primitive',
} as const;

/** Core IR / Scene trace 计数单位名称 */
export type CoreTraceUnit = ValueOf<typeof CoreTraceUnit>;

/** 单次静态编译产生的工作量记录 */
export type CoreCompileTraceRecord = Readonly<{
  /** 编译阶段 */
  phase: 'compile';
  /** 访问单位 */
  unit: 'ir-child';
  /** 本次为完整编译 */
  outcome: 'full';
  /** 访问数量 */
  visited: number;
  /** 复用数量 */
  reused: number;
  /** 计算数量 */
  changed: number;
}>;
/** 静态编译的可选观测出口，出口失败不影响编译 */
export type CoreCompileTraceReporter = Readonly<{
  /** 接收编译工作量记录 */
  report: (record: CoreCompileTraceRecord) => void;
}>;
