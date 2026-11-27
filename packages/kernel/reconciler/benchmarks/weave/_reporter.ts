import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { SerializedError } from 'vitest';
import type { Reporter, TestCase, TestModule, TestRunEndReason, Vitest } from 'vitest/node';

import { sampling, summarizeLatency } from '../../../../../scripts/benchmarks';
import type { BenchmarkEnvironment, BenchmarkMeasurement } from '../../../../../scripts/benchmarks';
import { captureBenchmarkContext } from '../../../../../scripts/benchmarks/environment';

/** 各输入情况的耗时与正确性状态，不推算内部缓存命中率 */
type WeaveTimingResult = {
  dimensions: ReadonlyArray<string>;
  state: string;
  errors: Array<string>;
  measurement?: BenchmarkMeasurement;
  samplesMs: Array<number>;
  statistics?: { samples: number; mean: number; p50: number };
};

/** 哈希参与执行的跨包源码、配置和配方，包含未提交文件 */
const snapshotSources = (root: string) => {
  const repository = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8' }).trim();
  const files = execFileSync(
    'git',
    [
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard',
      '--',
      'packages/kernel/core/src',
      'packages/kernel/foundation/src',
      'packages/kernel/math/src',
      'packages/kernel/reconciler/src',
      'packages/kernel/reconciler/benchmarks/weave',
      'packages/kernel/reconciler/benchmarks/reconcile/_execution.ts',
      'packages/kernel/reconciler/vitest.weave.config.ts',
      'packages/kernel/reconciler/package.json',
      'packages/kernel/reconciler/tsconfig.json',
      'config/vite/dev-plugin.ts',
      'scripts/benchmarks',
      'pnpm-lock.yaml',
    ],
    { cwd: repository, encoding: 'utf8' },
  )
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .sort();
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file);
    hash.update('\0');
    hash.update(readFileSync(join(repository, file)));
    hash.update('\0');
  }
  return {
    head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim(),
    status: execFileSync('git', ['status', '--short'], { cwd: repository, encoding: 'utf8' }).trim(),
    hash: hash.digest('hex'),
    files,
  };
};

/** 根据原始毫秒值选择展示单位 */
const formatLatency = (value: number | undefined): string => {
  if (value === undefined) return '—';
  if (value < 1) return `${(value * 1000).toFixed(1)} μs`;
  if (value < 1000) return `${value.toFixed(1)} ms`;
  return `${(value / 1000).toFixed(1)} s`;
};

/** 仅报告各情况均值和 P50，保留原始样本，不设置时间门槛 */
export class WeaveTimingReporter implements Reporter {
  private root = '';
  private source?: ReturnType<typeof snapshotSources>;
  private environment?: BenchmarkEnvironment;

  /** 在计时前固定执行环境与实际源码身份 */
  onInit(context: Vitest): void {
    this.root = context.config.root;
    this.source = snapshotSources(this.root);
    this.environment = captureBenchmarkContext(
      this.root,
      sampling,
      {
        title: 'Weave 更新耗时观察',
        dimensionLabels: ['元素', '输入情况', '更新'],
        budgets: {},
        artifact: 'vite-source',
        sourceDirectory: 'src',
        configFiles: ['vitest.weave.config.ts', 'package.json', 'tsconfig.json', '../../../config/vite/dev-plugin.ts'],
      },
      { pool: context.config.pool, maxWorkers: context.config.maxWorkers, isolate: context.config.isolate },
    ).environment;
  }

  /** 读取真实 Tinybench 样本和调用数，不读取测试运行器 duration */
  private readTiming(test: TestCase): WeaveTimingResult {
    const tasks = test.benchmarks().flatMap(group => group.tasks);
    const samplesMs = tasks.length === 1 ? [...(tasks[0].latency.samples ?? [])] : [];
    const summary = samplesMs.length > 0 ? summarizeLatency(samplesMs) : undefined;
    const errors = (test.result().errors ?? []).map(error => error.message);
    const measurement = test.meta().measurement;
    if (
      test.result().state === 'passed' &&
      (tasks.length !== 1 ||
        samplesMs.length !== sampling.iterations ||
        measurement?.calls !== sampling.iterations + sampling.warmupIterations)
    )
      errors.push('采样结果不符合 10 次预热、100 次正式测量、110 次调用协议');
    return {
      dimensions: test.meta().benchmarkDimensions ?? [],
      state: errors.length ? 'failed' : test.result().state,
      errors,
      measurement,
      samplesMs,
      statistics:
        summary === undefined ? undefined : { samples: summary.samples, mean: summary.mean, p50: summary.p50 },
    };
  }

  /** 失败也保存报告；只有执行、正确性和采样协议错误影响退出状态 */
  onTestRunEnd(
    modules: ReadonlyArray<TestModule>,
    unhandledErrors: ReadonlyArray<SerializedError>,
    reason: TestRunEndReason,
  ): void {
    const timings = modules.flatMap(module => [...module.children.allTests()].map(test => this.readTiming(test)));
    const errors = unhandledErrors.map(error => error.message);
    for (const module of modules) {
      for (const error of module.errors()) errors.push(error.message);
      for (const suite of module.children.allSuites())
        for (const error of suite.errors()) errors.push(`${suite.fullName}: ${error.message}`);
    }
    if (timings.length === 0) errors.push('未收集到 Weave 耗时场景');
    for (const timing of timings)
      for (const error of timing.errors) errors.push(`${timing.dimensions.join('/')}: ${error}`);
    const after = snapshotSources(this.root);
    if (after.hash !== this.source?.hash) errors.push('运行期间源码或配方发生变化');
    const report = {
      version: 3,
      generatedAt: new Date().toISOString(),
      reason: errors.length ? 'failed' : reason,
      environment: this.environment,
      source: this.source,
      sourceUnchanged: after.hash === this.source?.hash,
      errors,
      timings,
    };
    const markdown = [
      '# Weave 更新耗时观察',
      '',
      `执行状态：${report.reason}；计时项：${timings.length}；正式样本：${timings.reduce((sum, timing) => sum + timing.samplesMs.length, 0)}；含预热调用：${timings.reduce((sum, timing) => sum + (timing.measurement?.calls ?? 0), 0)}`,
      '',
      '每项 10 次预热 + 100 次正式测量，计时为当前一次完整 auto 更新，包含编辑、调度、计算、组装及事务提交。每个样本在计时外重建会话、mount 并重放前置步骤；输入构造、输出校验和 dispose 均在计时外。',
      '',
      '缓存命中、失效、局部复用和事务不变量由 tests/weave 功能测试硬断言，不在此入口安装观察包装或统计命中率。表中只描述输入情况，不以配方名称冒充计时样本的实际命中阶段。',
      '',
      '均值/P50 仅使用正式样本，原始毫秒样本保存在 JSON。不设时间预算或耗时警告；passed 仅表示执行及正确性通过，不表示性能达标。Vite 源码加载结果包含加载器开销，不是原生 ESM 或浏览器渲染基线，也不是内部阶段的独占耗时。',
      '',
      `源码：${report.source?.head}；SHA-256：${report.source?.hash}；运行期间源码一致：${report.sourceUnchanged}`,
      '',
      '| 元素 | 输入情况 | 更新 | 样本数 | 均值 | P50 | 状态 |',
      '| --- | --- | --- | ---: | ---: | ---: | --- |',
      ...timings.map(
        timing =>
          `| ${timing.dimensions.map(value => value.replaceAll('|', '\\|').replaceAll('\n', ' ')).join(' | ')} | ${timing.statistics?.samples ?? 0} | ${formatLatency(timing.statistics?.mean)} | ${formatLatency(timing.statistics?.p50)} | ${timing.state} |`,
      ),
      '',
      '## 执行错误',
      '',
      ...(errors.length ? errors.map(error => `- ${error}`) : ['无']),
    ];
    const parent = resolve(this.root, '_notes/reports/weave');
    mkdirSync(parent, { recursive: true });
    const directory = mkdtempSync(join(parent, `${new Date().toISOString().replaceAll(':', '-')}-`));
    writeFileSync(join(directory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    writeFileSync(join(directory, 'report.md'), `${markdown.join('\n')}\n`, 'utf8');
    console.log(`Weave timings: ${timings.length} cases; ${join(directory, 'report.md')}`);
    for (const error of errors) console.error(error);
    if (errors.length > 0) process.exitCode = 1;
  }
}
