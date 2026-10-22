/** 一次 owner 执行阶段的确定性工作量记录 */
export type PerformanceTraceRecord = Readonly<{
  /** 发出记录的 owner */
  owner: string;
  /** 被观测的执行阶段 */
  phase: string;
  /** 阶段使用的计数单位 */
  unit: string;
  /** 阶段的完成方式 */
  outcome: string;
  /** 本阶段访问的实体 occurrence 数 */
  visited: number;
  /** 本阶段复用的实体 occurrence 数 */
  reused: number;
  /** 本阶段发生变化的实体 occurrence 数 */
  changed: number;
}>;

/**
 * 接收 owner 性能记录的同步出口
 * @param record 携带 owner 的性能记录
 * @returns 无返回值；异常由调用方隔离
 */
export type PerformanceTraceSink = (record: PerformanceTraceRecord) => void;
