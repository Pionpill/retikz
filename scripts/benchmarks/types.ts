/** 单次工作负载的耗时摘要，单位为毫秒 */
export type LatencySummary = {
  samples: number;
  mean: number;
  p50: number;
  p90: number;
  p99: number;
};

/** 可比较的执行环境，不包含待比较的算法源码版本 */
export type BenchmarkEnvironment = {
  runnerId: string;
  node: string;
  platform: string;
  architecture: string;
  cpuModels: Array<string>;
  logicalCpuCount: number;
  totalMemoryBytes: number;
  vitest: string;
  lockHash: string;
  /** 用例与加载配置的摘要，防止输入或测量方式改变后误用基线 */
  fixtureHash: string;
  artifact: 'native-esm' | 'vite-source';
  /** 实际执行隔离与并行设置，区分命令行覆盖后的运行环境 */
  pool: string;
  maxWorkers: number;
  isolate: boolean;
  sampling: { time: number; iterations: number; warmupTime: number; warmupIterations: number };
};

/** 稳定标识与模块定义的有序维度值；维度不参与基线匹配 */
export type BenchmarkIdentity = {
  /** 使用万级限次策略的被测实体数，不从报告标签推断 */
  workloadSize?: number;
  id: string;
  dimensions: ReadonlyArray<string>;
};

/** 单元基准的实际执行事实 */
export type BenchmarkScenario = Omit<BenchmarkIdentity, 'dimensions'> & {
  /** 未执行或未注册元数据的用例可能没有维度 */
  dimensions?: ReadonlyArray<string>;
  execution: 'passed' | 'failed' | 'skipped' | 'pending';
  errors: Array<string>;
  statistics?: LatencySummary;
  /** 正式测量的原始毫秒样本，不包含预热 */
  samplesMs?: ReadonlyArray<number>;
  measurement?: BenchmarkMeasurement;
  /** 独立分配阶段的采样事实，不含 worker 背景堆占用 */
  allocation?: BenchmarkAllocation;
};

/** 场景实际采用的采样参数与包含预热在内的执行次数 */
export type BenchmarkMeasurement = {
  mode: 'normal' | 'reference';
  sampling: { time: number; iterations: number; warmupTime: number; warmupIterations: number; warmup?: boolean };
  calls: number;
  /** 与正式调用配对的阶段样本（毫秒），保持执行顺序 */
  sampleTimingsMs?: ReadonlyArray<Readonly<Record<string, number>>>;
  /** 计时外独立核验的工作量，不是计时样本或缓存命中率 */
  observations?: Readonly<Record<string, number>>;
};

declare module 'vitest' {
  interface ProvidedContext {
    benchmarkMemory?: boolean;
    benchmarkPhase?: 'latency' | 'allocation';
  }
  interface TaskMeta {
    benchmarkDimensions?: ReadonlyArray<string>;
    measurement?: BenchmarkMeasurement;
    benchmarkPhase?: 'latency' | 'allocation';
    allocation?: BenchmarkAllocation;
  }
}

/** 人工选择的性能预算；未配置时只输出报告 */
export type BenchmarkBudget = {
  metric: 'mean' | 'p50' | 'p90' | 'p99';
  /** 是否将预算超限或无法评估作为进程失败；业务观察默认不阻断 */
  blocking?: boolean;
} & (
  | { kind: 'workload'; warningMs: number; errorMs: number; rationale: string }
  | ({ severity: 'warn' | 'error' } & (
      | { kind: 'absolute'; environment: BenchmarkEnvironment; maxMs: number }
      | { kind: 'relative'; maxRatio: number }
    ))
);

/** 与执行成功分离的性能验收结果 */
export type BudgetAssessment = {
  status: 'report-only' | 'passed' | 'exceeded' | 'not-comparable' | 'execution-failed';
  reason?: string;
  severity?: 'warn' | 'error';
  metric?: BenchmarkBudget['metric'];
  actualMs?: number;
  limitMs?: number;
  warningMs?: number;
  errorMs?: number;
  rationale?: string;
  blocking?: boolean;
};

/** V8 分配采样的原始统计；平均 B/op 由估算总量除以 calls 按需计算 */
export type BenchmarkAllocation = {
  /** 正式分配阶段实际执行次数，不包含预热 */
  calls: number;
  warmupCalls: number;
  /** 位于被测操作调用栈内的原始分配样本数 */
  sampleCount: number;
  /** 正式采样的平均间隔，单位为字节 */
  samplingInterval: number;
  reason?: string;
} & (
  | { status: 'measured'; estimatedTotalBytes: number }
  | { status: 'insufficient'; estimatedTotalBytes?: number }
  | { status: 'unavailable'; estimatedTotalBytes?: number }
  | { status: 'skipped'; estimatedTotalBytes?: number }
);

/** 单次分配量的非阻断观察线 */
export type BenchmarkAllocationPolicy = {
  warningBytesPerOp: number;
  /** 观察线依据，不从首次实测倒推 */
  rationale: string;
};

/** 本机报告，同时可由人工选择为相对预算的只读基线 */
export type BenchmarkReport = {
  version: 5;
  /** 本次是否请求独立分配阶段，与观察线及采样是否成功无关 */
  allocationEnabled: boolean;
  /** 模块提供的维度列名，按层级由父到子排列 */
  dimensionLabels: ReadonlyArray<string>;
  createdAt: string;
  environment: BenchmarkEnvironment;
  source: { commit: string; dirty: boolean; sourceHash: string };
  errors: Array<string>;
  allocationPolicy?: BenchmarkAllocationPolicy;
  scenarios: Array<BenchmarkScenario & { assessment: BudgetAssessment }>;
};

/** 包级基准接入配置，路径相对被测包根目录 */
export type BenchmarkReporterOptions = {
  /** 实际加载方式，默认使用原生 ESM 构建产物 */
  artifact?: BenchmarkEnvironment['artifact'];
  /** 报告标题 */
  title: string;
  /** 模块提供的维度列名，数量不限；用例按同一顺序提供值 */
  dimensionLabels: ReadonlyArray<string>;
  /** 场景性能预算 */
  budgets: Readonly<Record<string, BenchmarkBudget>> | ((scenario: BenchmarkScenario) => BenchmarkBudget | undefined);
  /** 人工指定的基线报告路径 */
  baselinePath?: string;
  /** 稳定 runner 标识，省略时使用 hostname */
  runnerId?: string;
  /** 纳入源码摘要的目录 */
  sourceDirectory: string;
  /** 相对包根、实际参与执行并纳入源码摘要的依赖源码目录 */
  sourceDependencies?: ReadonlyArray<string>;
  /** 影响构建与加载的配置文件 */
  configFiles: ReadonlyArray<string>;
  /** 包专属对比表与测量说明，追加在同一份报告中 */
  appendix?: (report: BenchmarkReport) => string;
};
