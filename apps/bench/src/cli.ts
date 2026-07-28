import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { BrowserRunnerEnvironment } from './browser-runner';
import type { DeterministicBenchmarkBudget, DeterministicBenchmarkResult } from './budget';
import type { TimingBaseline } from './timing';

import { runBrowserBenchmark } from './browser-runner';
import { compareDeterministicResults, createBaselineCandidate } from './budget';
import { runCoreWallClockReport } from './report';
import { runCoreDeterministicBenchmarks } from './run';
import { readTimingRunnerEnvironment } from './runner-environment';
import {
  assertTimingGatePassed,
  createTimingBaselineCandidate,
  createTimingEnvironmentFingerprint,
  runTimingGateAttempts,
} from './timing';

type BenchEnvironment = BrowserRunnerEnvironment &
  Readonly<{
    node: string;
    warmupRuns: number;
    sampleRuns: number;
  }>;

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const environment = JSON.parse(readFileSync(resolve(appRoot, 'bench-environment.json'), 'utf8')) as BenchEnvironment;
const baseline = JSON.parse(
  readFileSync(resolve(appRoot, 'deterministic-baseline.json'), 'utf8'),
) as ReadonlyArray<DeterministicBenchmarkBudget>;
const runnerEnvironment = readTimingRunnerEnvironment();

/** 校验 Node 与采样次数是否符合冻结的 benchmark 环境 */
const assertEnvironment = (): void => {
  const expectedMajor = environment.node.replace('.x', '');
  if (process.versions.node.split('.')[0] !== expectedMajor) {
    throw new Error(`bench environment mismatch: expected Node ${environment.node}, received ${process.version}`);
  }
  if (
    !Number.isSafeInteger(environment.warmupRuns) ||
    environment.warmupRuns < 0 ||
    !Number.isSafeInteger(environment.sampleRuns) ||
    environment.sampleRuns <= 0
  ) {
    throw new Error('bench environment requires nonnegative warmupRuns and positive sampleRuns');
  }
};

/** 把 benchmark 产物写入 ignored results 目录 */
const writeResult = (name: string, value: unknown): string => {
  const resultPath = resolve(appRoot, 'results', name);
  mkdirSync(dirname(resultPath), { recursive: true });
  writeFileSync(resultPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return resultPath;
};

/** 组合 Node Core 与真实 Chromium renderer 的确定性结果 */
const runDeterministicBenchmarks = async (): Promise<
  Readonly<{
    browserEnvironment: Awaited<ReturnType<typeof runBrowserBenchmark>>['environment'];
    results: ReadonlyArray<DeterministicBenchmarkResult>;
  }>
> => {
  const browser = await runBrowserBenchmark(environment, {
    warmupRuns: environment.warmupRuns,
    sampleRuns: environment.sampleRuns,
    includeWallClock: false,
  });
  return Object.freeze({
    browserEnvironment: browser.environment,
    results: Object.freeze([...runCoreDeterministicBenchmarks(), ...browser.deterministic]),
  });
};

type WallClockAttempt = Readonly<{
  fingerprint: string;
  environment: Awaited<ReturnType<typeof runBrowserBenchmark>>['environment'];
  scenarios: ReturnType<typeof runCoreWallClockReport>;
}>;

/** 完整运行一次 Node Core + Chromium renderer wall-clock 场景 */
const runWallClockAttempt = async (): Promise<WallClockAttempt> => {
  const browser = await runBrowserBenchmark(environment, {
    warmupRuns: environment.warmupRuns,
    sampleRuns: environment.sampleRuns,
    includeWallClock: true,
  });
  return Object.freeze({
    fingerprint: createTimingEnvironmentFingerprint(
      environment,
      process.version,
      browser.environment,
      runnerEnvironment,
    ),
    environment: browser.environment,
    scenarios: Object.freeze([
      ...runCoreWallClockReport(environment.warmupRuns, environment.sampleRuns),
      ...browser.wallClock,
    ]),
  });
};

/** 按完整 fingerprint 读取 tracked timing baseline，不做近似环境匹配 */
const readTimingBaseline = (fingerprint: string): TimingBaseline | undefined => {
  const path = resolve(appRoot, 'timing-baselines', `${fingerprint}.json`);
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, 'utf8')) as TimingBaseline;
};

/** 执行一个 bench CLI 子命令 */
const main = async (): Promise<void> => {
  const command = process.argv[2];
  assertEnvironment();

  if (command === 'check') {
    const { results } = await runDeterministicBenchmarks();
    const errors = compareDeterministicResults(results, baseline);
    if (errors.length > 0) throw new Error(`deterministic benchmark failed:\n${errors.join('\n')}`);
    console.log(`bench:check passed (${baseline.length} deterministic budgets)`);
    return;
  }

  if (command === 'report') {
    const compareBaseline = process.argv.includes('--compare-timing-baseline');
    const first = await runWallClockAttempt();
    const baselineForFirst = compareBaseline ? readTimingBaseline(first.fingerprint) : undefined;
    const gateRun = compareBaseline
      ? await runTimingGateAttempts(
          { fingerprint: first.fingerprint, reports: first.scenarios },
          baselineForFirst,
          async () => {
            const attempt = await runWallClockAttempt();
            return { fingerprint: attempt.fingerprint, reports: attempt.scenarios };
          },
        )
      : undefined;
    const finalComparison = gateRun?.finalComparison;
    const path = writeResult('wall-clock-report.json', {
      environment: {
        expected: environment,
        actualNode: process.version,
        runner: runnerEnvironment,
        browser: first.environment,
        fingerprint: first.fingerprint,
      },
      attempts:
        gateRun === undefined
          ? [{ scenarios: first.scenarios }]
          : gateRun.attempts.map(({ attempt, comparison }) => ({
              scenarios: attempt.reports,
              gate: comparison,
            })),
    });
    console.log(`bench:report wrote ${path}`);
    if (finalComparison?.status === 'skipped') {
      console.log(`timing gate skipped: ${finalComparison.errors.join('; ')}`);
    }
    if (finalComparison?.status === 'passed') console.log('timing gate passed');
    if (finalComparison !== undefined) assertTimingGatePassed(finalComparison);
    return;
  }

  if (command === 'update-baseline') {
    const { browserEnvironment, results } = await runDeterministicBenchmarks();
    const deterministicPath = writeResult('deterministic-baseline.candidate.json', {
      environment: {
        expected: environment,
        actualNode: process.version,
        browser: browserEnvironment,
        runner: runnerEnvironment,
        fingerprint: createTimingEnvironmentFingerprint(
          environment,
          process.version,
          browserEnvironment,
          runnerEnvironment,
        ),
      },
      budgets: createBaselineCandidate(results),
    });
    const timing = await runWallClockAttempt();
    const timingPath = writeResult(
      `timing-baseline.${timing.fingerprint}.candidate.json`,
      createTimingBaselineCandidate(timing.fingerprint, timing.scenarios),
    );
    console.log(`bench:update-baseline wrote candidates ${deterministicPath} and ${timingPath}`);
    return;
  }

  throw new Error('bench CLI expects check, report, or update-baseline');
};

await main();
