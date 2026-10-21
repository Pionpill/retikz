/** Render 完整绘制的工作量记录 */
export type RenderTraceRecord = Readonly<{
  /** 绘制阶段 */
  phase: 'commit';
  /** 访问的 Scene 图元单位 */
  unit: 'scene-primitive';
  /** 完整绘制 */
  outcome: 'full';
  /** 访问数量 */
  visited: number;
  /** 复用数量 */
  reused: number;
  /** 更新数量 */
  changed: number;
}>;

/** Render 观测出口，回调异常不影响绘制结果 */
export type RenderTraceReporter = Readonly<{
  /** 接收本次绘制工作量 */
  report: (record: RenderTraceRecord) => void;
}>;
