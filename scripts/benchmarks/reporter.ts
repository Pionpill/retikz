import { readFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

import type { SerializedError } from 'vitest';
import type { Reporter, TestCase, TestModule, TestRunEndReason, Vitest } from 'vitest/node';

import { captureBenchmarkContext } from './environment';
import { evaluateBudget, parseBaseline, shouldFailReport, summarizeLatency, writeReport } from './index';
import { sampling } from './sampling';
import type { BenchmarkReport, BenchmarkReporterOptions, BenchmarkScenario } from './types';

/** 单元性能报告适配器，采样仍由 Vitest/Tinybench 执行 */
export class BenchmarkReporter implements Reporter {
  private root = '';
  private context?: Pick<BenchmarkReport, 'environment' | 'source'>;
  private readonly scenarios = new Map<string, BenchmarkScenario>();

  /** 接收被测包的环境与预算配置 */
  constructor(private readonly options: BenchmarkReporterOptions) {}

  /** 记录真实运行环境，不把 git、文件读取或报告生成计入采样 */
  onInit(context: Vitest): void {
    this.root = context.config.root;
    this.context = captureBenchmarkContext(this.root, sampling, this.options);
    this.scenarios.clear();
  }

  /** 每个场景只登记一次算法测量，保留失败和跳过状态 */
  onTestCaseResult(test: TestCase): void {
    const result = test.result();
    const scenario: BenchmarkScenario = {
      id: `${basename(test.module.moduleId)} > ${test.fullName}`,
      dimensions: test.meta().benchmarkDimensions,
      execution: result.state,
      errors: (result.errors ?? []).map(error => error.message),
      measurement: test.meta().measurement,
    };
    if (scenario.dimensions && scenario.dimensions.length !== this.options.dimensionLabels.length) {
      scenario.execution = 'failed';
      scenario.errors.push('Scenario dimension count does not match module dimension labels');
    }
    const tasks = test.benchmarks().flatMap(group => group.tasks);
    if (tasks.length === 1 && tasks[0].latency.samples?.length) {
      scenario.statistics = summarizeLatency(tasks[0].latency.samples);
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
    for (const module of modules) {
      for (const error of module.errors()) errors.push(`${module.relativeModuleId}: ${error.message}`);
      for (const suite of module.children.allSuites()) {
        for (const error of suite.errors()) errors.push(`${suite.fullName}: ${error.message}`);
      }
      for (const test of module.children.allTests()) {
        const id = `${basename(module.moduleId)} > ${test.fullName}`;
        if (!this.scenarios.has(id)) this.onTestCaseResult(test);
      }
    }
    if (reason !== 'passed' && errors.length === 0) errors.push(`Vitest run ended: ${reason}`);
    if (this.scenarios.size === 0) errors.push('No benchmark scenarios collected');

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
    for (const id of Object.keys(typeof this.options.budgets === 'function' ? {} : this.options.budgets)) {
      if (!this.scenarios.has(id)) {
        scenarios.push({ id, execution: 'pending', errors: [] });
      }
    }
    const report: BenchmarkReport = {
      version: 2,
      dimensionLabels: this.options.dimensionLabels,
      createdAt: new Date().toISOString(),
      ...context,
      errors,
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
    console.log(`Benchmark reports: ${directory}`);
    for (const { id, assessment } of report.scenarios) {
      if (assessment.status === 'exceeded' || assessment.status === 'not-comparable') {
        console.warn(`${id}: ${assessment.status} (${assessment.severity ?? 'report'}) ${assessment.reason ?? ''}`);
      }
    }
    if (shouldFailReport(report)) process.exitCode = 1;
  }
}
