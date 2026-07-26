import type { DeterministicBenchmarkResult } from './budget';
import type { WallClockScenarioReport } from './report';

/** Browser benchmark 的固定环境指纹字段 */
export type BrowserEnvironmentFingerprint = Readonly<{
  browserVersion: string;
  userAgent: string;
  platform: string;
  language: string;
  timezone: string;
  viewport: Readonly<{ width: number; height: number }>;
  devicePixelRatio: number;
  reducedMotion: boolean;
  fontAvailable: boolean;
  fontMetric: number;
}>;

/** Browser benchmark 页面返回给 Node runner 的结构化结果 */
export type BrowserBenchmarkResult = Readonly<{
  environment: BrowserEnvironmentFingerprint;
  deterministic: ReadonlyArray<DeterministicBenchmarkResult>;
  wallClock: ReadonlyArray<WallClockScenarioReport>;
}>;

/** Browser benchmark 页面公开的单次执行参数 */
export type BrowserBenchmarkOptions = Readonly<{
  browserVersion: string;
  warmupRuns: number;
  sampleRuns: number;
  includeWallClock: boolean;
}>;

/** 挂载 browser benchmark 入口后的 Window 类型 */
export type RetikzBenchWindow = Window & {
  retikzBench?: Readonly<{
    run: (options: BrowserBenchmarkOptions) => Promise<BrowserBenchmarkResult>;
  }>;
};
