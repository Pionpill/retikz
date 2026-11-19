import { appendFile, readFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

import type { SerializedError } from 'vitest';
import type { Reporter, TestCase, TestModule, TestRunEndReason, Vitest } from 'vitest/node';

import { captureBenchmarkContext } from './environment';
import { evaluateBudget, parseBaseline, shouldFailReport, summarizeLatency, writeReport } from './index';
import { allocationPolicy } from './policy';
import { sampling } from './sampling';
import type { BenchmarkReport, BenchmarkReporterOptions, BenchmarkScenario } from './types';

/** 单元性能报告适配器，采样仍由 Vitest/Tinybench 执行 */
export class BenchmarkReporter implements Reporter {
  private root = '';
  private context?: Pick<BenchmarkReport, 'environment' | 'source'>;
  private readonly scenarios = new Map<string, BenchmarkScenario>();
  private readonly collected = new Set<string>();
  private allocationStarted = false;
  private allocationEnabled = false;
  private readonly phaseErrors: Array<string> = [];

  /** 接收被测包的环境与预算配置 */
  constructor(private readonly options: BenchmarkReporterOptions) {}

  /** 记录真实运行环境，不把 git、文件读取或报告生成计入采样 */
  onInit(context: Vitest): void {
    this.root = context.config.root;
    this.allocationEnabled = context.getProvidedContext().benchmarkMemory === true;
    this.context = captureBenchmarkContext(this.root, sampling, this.options, {
      pool: context.config.pool,
      maxWorkers: context.config.maxWorkers,
      isolate: context.config.isolate,
    });
    this.scenarios.clear();
    this.collected.clear();
    this.phaseErrors.length = 0;
    this.allocationStarted = false;
  }

  /** 每个场景只登记一次算法测量，保留失败和跳过状态 */
  onTestCaseResult(test: TestCase): void {
    const result = test.result();
    const id = `${basename(test.module.moduleId)} > ${test.fullName}`;
    this.collected.add(`${test.project.name}:${id}`);
    const previous = this.scenarios.get(id);
    if (test.meta().benchmarkPhase === 'allocation') {
      this.allocationStarted = true;
      if (!previous?.statistics) this.phaseErrors.push(`Allocation phase has no prior latency measurement: ${id}`);
      const scenario: BenchmarkScenario = previous ?? {
        id,
        dimensions: test.meta().benchmarkDimensions,
        execution: result.state,
        errors: [],
      };
      scenario.allocation = test.meta().allocation;
      if (result.state === 'failed') {
        scenario.execution = 'failed';
        scenario.errors.push(...result.errors.map(error => error.message));
      }
      this.scenarios.set(id, scenario);
      return;
    }
    if (this.allocationStarted) this.phaseErrors.push(`Latency ran after allocation profiling started: ${id}`);
    const scenario: BenchmarkScenario = {
      id: `${basename(test.module.moduleId)} > ${test.fullName}`,
      dimensions: test.meta().benchmarkDimensions,
      execution: result.state,
      errors: (result.errors ?? []).map(error => error.message),
      measurement: test.meta().measurement,
      allocation: previous?.allocation,
    };
    if (scenario.dimensions && scenario.dimensions.length !== this.options.dimensionLabels.length) {
      scenario.execution = 'failed';
      scenario.errors.push('Scenario dimension count does not match module dimension labels');
    }
    const tasks = test.benchmarks().flatMap(group => group.tasks);
    if (tasks.length === 1 && tasks[0].latency.samples?.length) {
      scenario.samplesMs = [...tasks[0].latency.samples];
      scenario.statistics = summarizeLatency(scenario.samplesMs);
    } else if (result.state === 'passed') {
      scenario.execution = 'failed';
      scenario.errors.push('Expected exactly one benchmark with retained latency samples');
    }
    this.scenarios.set(scenario.id, scenario);
  }

  /** 先保存报告，再设置门禁退出状态；baseline 始终只读 */
  async onTestRunEnd(
    modules: ReadonlyArray<TestModule>,
    unhandledErrors: ReadonlyArray<SerializedError>,
    reason: TestRunEndReason,
  ): Promise<void> {
    if (!this.context) throw new Error('Benchmark context unavailable');
    const context = this.context;
    const errors = unhandledErrors.map(error => error.message);
    const completedContext = captureBenchmarkContext(this.root, sampling, this.options, {
      pool: context.environment.pool,
      maxWorkers: context.environment.maxWorkers,
      isolate: context.environment.isolate,
    });
    if (
      completedContext.source.sourceHash !== context.source.sourceHash ||
      completedContext.environment.fixtureHash !== context.environment.fixtureHash ||
      completedContext.environment.lockHash !== context.environment.lockHash
    )
      errors.push('Source, fixture or configuration changed during measurement; results cannot form a baseline');
    for (const module of modules) {
      for (const error of module.errors()) errors.push(`${module.relativeModuleId}: ${error.message}`);
      for (const suite of module.children.allSuites()) {
        for (const error of suite.errors()) errors.push(`${suite.fullName}: ${error.message}`);
      }
      for (const test of module.children.allTests()) {
        const id = `${basename(module.moduleId)} > ${test.fullName}`;
        if (!this.collected.has(`${test.project.name}:${id}`)) this.onTestCaseResult(test);
      }
    }
    if (reason !== 'passed' && errors.length === 0) errors.push(`Vitest run ended: ${reason}`);
    if (this.scenarios.size === 0) errors.push('No benchmark scenarios collected');
    errors.push(...this.phaseErrors);

    let baseline: BenchmarkReport | undefined;
    const baselinePath = this.options.baselinePath;
    if (baselinePath) {
      try {
        baseline = parseBaseline(await readFile(resolve(this.root, baselinePath), 'utf8'));
      } catch (error) {
        errors.push(`Cannot load baseline: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    const scenarios = [...this.scenarios.values()].sort((left, right) => left.id.localeCompare(right.id, 'en'));
    if (this.allocationEnabled && scenarios.some(scenario => !scenario.allocation && scenario.execution === 'passed'))
      errors.push('Configured allocation phase did not produce metadata for every passed latency scenario');
    for (const id of Object.keys(typeof this.options.budgets === 'function' ? {} : this.options.budgets)) {
      if (!this.scenarios.has(id)) {
        scenarios.push({ id, execution: 'pending', errors: [] });
      }
    }
    const report: BenchmarkReport = {
      version: 5,
      allocationEnabled: this.allocationEnabled,
      dimensionLabels: this.options.dimensionLabels,
      createdAt: new Date().toISOString(),
      ...context,
      errors,
      allocationPolicy: this.allocationEnabled ? allocationPolicy : undefined,
      scenarios: scenarios.map(scenario => ({
        ...scenario,
        assessment: evaluateBudget(
          scenario,
          context.environment,
          typeof this.options.budgets === 'function'
            ? this.options.budgets(scenario)
            : this.options.budgets[scenario.id],
          baseline,
        ),
      })),
    };
    const directory = await writeReport(join(this.root, '_notes', 'reports', 'benchmarks'), report, this.options.title);
    if (this.options.appendix) await appendFile(join(directory, 'report.md'), this.options.appendix(report), 'utf8');
    console.log(`Benchmark reports: ${directory}`);
    for (const { id, assessment } of report.scenarios) {
      if (assessment.status === 'exceeded' || assessment.status === 'not-comparable') {
        console.warn(`${id}: ${assessment.status} (${assessment.severity ?? 'report'}) ${assessment.reason ?? ''}`);
      }
    }
    if (shouldFailReport(report)) process.exitCode = 1;
  }
}
