import type { ValueOf } from '@retikz/foundation';

/** Kernel 编译产物的 Runtime owner key */
export const CORE_SOURCE_KEY = 'kernel' as const;

/** 会话是否保留可供后续批次复用的编译状态，不表示当前调用的实际计算量 */
export const ReconcilerMode = {
  /** 完整编译，不跨次保留 Weave 缓存 */
  Full: 'full',
  /** 保留 Weave 缓存并允许批次更新，首次编译与完整替换仍完整计算 */
  Incremental: 'incremental',
} as const;

export type ReconcilerMode = ValueOf<typeof ReconcilerMode>;

/** 增量会话的批次计算策略 */
export const ReconcilerUpdateStrategy = {
  /** 复用仍有效的编译结果，重算失效部分 */
  Auto: 'auto',
  /** 在同一执行链路中强制重新计算 */
  Full: 'full',
} as const;

export type ReconcilerUpdateStrategy = ValueOf<typeof ReconcilerUpdateStrategy>;

/** 整个 Reconciler 会话的生命周期阶段，不表示内部计算步骤或单条内容操作 */
export const ReconcilerLifecyclePhase = {
  /** 首次建立会话的计算与输出关系 */
  Mount: 'mount',
  /** 对已建立的会话执行后续更新 */
  Update: 'update',
  /** 结束会话并清理其持有的资源 */
  Unmount: 'unmount',
} as const;

export type ReconcilerLifecyclePhase = ValueOf<typeof ReconcilerLifecyclePhase>;

/** 会话内部的执行与恢复状态 */
export const ReconcilerStatus = {
  /** 没有正在执行的操作，允许接受下一次合法调用 */
  Idle: 'idle',
  /** 准备候选编译与输出，尚未发布 */
  Preparing: 'preparing',
  /** 提交候选计算状态与输出目标，禁止重入 */
  Committing: 'committing',
  /** 提交后的恢复失败，只允许清理 */
  Broken: 'broken',
  /** 会话已终止；未成功完成的资源清理仍可重试 */
  Disposed: 'disposed',
} as const;

export type ReconcilerStatus = ValueOf<typeof ReconcilerStatus>;

/** 编译会话 trace 计数单位 */
export const ReconcilerTraceUnit = {
  /** Weave 实际执行的元素编译次数 */
  ElementCompile: 'element-compile',
  /** 非增量模式下的整场景编译次数 */
  SceneCompile: 'scene-compile',
  /** 成功完成清理的已挂载会话数 */
  Session: 'session',
} as const;

export type ReconcilerTraceUnit = ValueOf<typeof ReconcilerTraceUnit>;
