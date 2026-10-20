/** 单次算法调用的耗时摘要，单位为毫秒 */
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
  artifact: 'native-esm';
  sampling: { time: number; iterations: number; warmupTime: number; warmupIterations: number };
};

/** 单元基准的实际执行事实 */
export type BenchmarkScenario = {
  id: string;
  execution: 'passed' | 'failed' | 'skipped' | 'pending';
  errors: Array<string>;
  statistics?: LatencySummary;
};

/** 人工选择的性能预算；未配置时只输出报告 */
export type BenchmarkBudget = {
  metric: 'mean' | 'p50' | 'p90' | 'p99';
  severity: 'warn' | 'error';
} & ({ kind: 'absolute'; environment: BenchmarkEnvironment; maxMs: number } | { kind: 'relative'; maxRatio: number });

/** 与执行成功分离的性能验收结果 */
export type BudgetAssessment = {
  status: 'report-only' | 'passed' | 'exceeded' | 'not-comparable' | 'execution-failed';
  reason?: string;
  severity?: 'warn' | 'error';
  metric?: BenchmarkBudget['metric'];
  actualMs?: number;
  limitMs?: number;
};

/** 本机报告，同时可由人工选择为相对预算的只读基线 */
export type BenchmarkReport = {
  version: 1;
  createdAt: string;
  environment: BenchmarkEnvironment;
  source: { commit: string; dirty: boolean; sourceHash: string };
  errors: Array<string>;
  scenarios: Array<BenchmarkScenario & { assessment: BudgetAssessment }>;
};

/** 包级基准接入配置，路径相对被测包根目录 */
export type BenchmarkReporterOptions = {
  /** 报告标题 */
  title: string;
  /** 场景性能预算 */
  budgets: Readonly<Record<string, BenchmarkBudget>>;
  /** 人工指定的基线报告路径 */
  baselinePath?: string;
  /** 稳定 runner 标识，省略时使用 hostname */
  runnerId?: string;
  /** 纳入源码摘要的目录 */
  sourceDirectory: string;
  /** 影响构建与加载的配置文件 */
  configFiles: ReadonlyArray<string>;
};
