/** 性能 trace 的执行阶段 */
export type PerformanceTracePhase = 'compile' | 'commit' | 'update';

/** 性能 trace 的计数单位 */
export type PerformanceTraceUnit = 'ir-child' | 'scene-primitive' | 'program' | 'scene-change';

/** 性能 trace 的执行结果 */
export type PerformanceTraceOutcome = 'full' | 'incremental' | 'bailout' | 'fallback' | 'commit';

/** 一次 owner 执行阶段的确定性工作量记录 */
export type PerformanceTraceRecord = Readonly<{
  /** 发出记录的 owner */
  owner: string;
  /** 被观测的执行阶段 */
  phase: PerformanceTracePhase;
  /** 阶段使用的计数单位 */
  unit: PerformanceTraceUnit;
  /** 阶段的完成方式 */
  outcome: PerformanceTraceOutcome;
  /** 本阶段访问的实体 occurrence 数 */
  visited: number;
  /** 本阶段复用的实体 occurrence 数 */
  reused: number;
  /** 本阶段发生变化的实体 occurrence 数 */
  changed: number;
}>;

/** 接收已验证性能记录的同步出口 */
export type PerformanceTraceSink = (record: PerformanceTraceRecord) => void;

/** trace reporter 的非致命诊断 */
export type PerformanceTraceDiagnostic = Readonly<{
  /** 诊断类别 */
  code: 'invalid-record' | 'sink-threw' | 'reentrant-report';
  /** reporter 绑定的 owner */
  owner: string;
  /** 触发诊断的执行阶段 */
  phase: PerformanceTracePhase;
}>;

/** owner 允许报告的阶段、单位与结果组合 */
export type RuntimeTracePhaseDefinition = Readonly<{
  /** 阶段名称 */
  phase: PerformanceTracePhase;
  /** 阶段唯一的计数单位 */
  unit: PerformanceTraceUnit;
  /** 阶段允许报告的结果 */
  outcomes: ReadonlyArray<PerformanceTraceOutcome>;
}>;

/** 由 Runtime 固定 owner 的同步 trace reporter */
export type RuntimeTraceReporter = Readonly<{
  /** reporter 绑定的 owner */
  owner: string;
  /** 校验并报告一条不含 owner 的性能记录 */
  report: (record: Omit<PerformanceTraceRecord, 'owner'>) => void;
  /** 返回并清空 reporter-local 诊断 */
  diagnostics: () => ReadonlyArray<PerformanceTraceDiagnostic>;
}>;

/** 创建 trace reporter 的配置 */
export type CreateRuntimeTraceReporterInput = Readonly<{
  /** reporter 固定绑定的 owner */
  owner: string;
  /** owner 可以报告的阶段定义 */
  phases: ReadonlyArray<RuntimeTracePhaseDefinition>;
  /** 接收合法记录的同步回调 */
  sink: PerformanceTraceSink;
}>;
