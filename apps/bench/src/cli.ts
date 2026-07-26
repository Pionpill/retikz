import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { BrowserRunnerEnvironment } from './browser-runner';
import type { DeterministicBenchmarkBudget, DeterministicBenchmarkResult } from './budget';

import { runBrowserBenchmark } from './browser-runner';
import { compareDeterministicResults, createBaselineCandidate } from './budget';
import { stableHash } from './hash';
import { runCoreWallClockReport } from './report';
import { runCoreDeterministicBenchmarks } from './run';

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
    const browser = await runBrowserBenchmark(environment, {
      warmupRuns: environment.warmupRuns,
      sampleRuns: environment.sampleRuns,
      includeWallClock: true,
    });
    const path = writeResult('wall-clock-report.json', {
      environment: {
        expected: environment,
        actualNode: process.version,
        browser: browser.environment,
        fingerprint: stableHash({ node: process.version, browser: browser.environment }),
      },
      scenarios: [...runCoreWallClockReport(environment.warmupRuns, environment.sampleRuns), ...browser.wallClock],
    });
    console.log(`bench:report wrote ${path}`);
    return;
  }

  if (command === 'update-baseline') {
    const { browserEnvironment, results } = await runDeterministicBenchmarks();
    const path = writeResult('deterministic-baseline.candidate.json', {
      environment: {
        expected: environment,
        actualNode: process.version,
        browser: browserEnvironment,
        fingerprint: stableHash({ node: process.version, browser: browserEnvironment }),
      },
      budgets: createBaselineCandidate(results),
    });
    console.log(`bench:update-baseline wrote candidate ${path}`);
    return;
  }

  throw new Error('bench CLI expects check, report, or update-baseline');
};

await main();
