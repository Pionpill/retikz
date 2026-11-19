import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { parseBaseline } from '../scripts/benchmarks/baseline';
import { parseBenchmarkCommand } from '../scripts/benchmarks/command';

const execute = promisify(execFile);
const repository = resolve(import.meta.dirname, '..');
let workspace = '';

describe('共享基准命令', () => {
  beforeAll(async () => {
    await mkdir(join(repository, 'notes', 'plans'), { recursive: true });
    workspace = await mkdtemp(join(repository, 'notes', 'plans', 'benchmark-command-'));
    await mkdir(join(workspace, 'benchmarks'));
    await mkdir(join(workspace, 'src'));
    await writeFile(join(workspace, 'src', 'index.ts'), 'export {};\n', 'utf8');
    await writeFile(join(workspace, 'package.json'), '{"type":"module"}\n', 'utf8');
    const script = (file: string): string =>
      JSON.stringify(join(repository, 'scripts', 'benchmarks', file).replaceAll('\\', '/'));
    await writeFile(
      join(workspace, 'vitest.bench.config.ts'),
      `
import { defineConfig } from 'vitest/config';
import { BenchmarkReporter } from ${script('reporter.ts')};
export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    benchmark: { include: ['benchmarks/**/*.bench.ts'], retainSamples: true },
    reporters: [new BenchmarkReporter({
      title: '命令契约夹具', dimensionLabels: ['场景'], budgets: {},
      sourceDirectory: 'src', configFiles: ['vitest.bench.config.ts'],
    })],
    pool: 'threads',
  },
});
`,
      'utf8',
    );
    for (const name of ['first', 'second']) {
      await writeFile(
        join(workspace, 'benchmarks', `${name}.bench.ts`),
        `
import { appendFileSync } from 'node:fs';
import { expect, inject } from 'vitest';
import { defineBenchmark } from ${script('scenario.ts')};
defineBenchmark({ id: '${name}', dimensions: ['${name}'] }, () => {
  appendFileSync(${JSON.stringify(join(workspace, 'phases.txt'))}, inject('benchmarkPhase') + '\\n', 'utf8');
  return { run: () => new Array(4096).fill(7), verify: result => expect(result[0]).toBe(7) };
});
defineBenchmark({ id: '${name}-reference', dimensions: ['参考档'] }, () => ({
  run: () => 7, verify: result => expect(result).toBe(7),
}), true);
`,
        'utf8',
      );
    }
    await writeFile(
      join(workspace, 'forbidden.test.ts'),
      "throw new Error('Functional tests must not run through the benchmark command');\n",
      'utf8',
    );
  });

  afterAll(async () => {
    if (workspace) {
      expect(relative(join(repository, 'notes', 'plans'), workspace)).toMatch(/^benchmark-command-[^\\/]+$/);
      await rm(workspace, { recursive: true, force: true });
    }
  });

  it('帮助与非法参数不会启动测量，工作区必须提供基准配置', () => {
    expect(parseBenchmarkCommand(['--help'], repository)).toEqual({ help: true });
    expect(() => parseBenchmarkCommand([], repository)).toThrow('workspace');
    expect(() => parseBenchmarkCommand(['--workspace', '..'], repository)).toThrow();
    expect(() => parseBenchmarkCommand(['--workspace', '.'], repository)).toThrow('vitest.bench.config.ts');
    expect(() => parseBenchmarkCommand(['--workspace', workspace, '--memroy'], repository)).toThrow();
  });

  it('同一无内存配置默认仅耗时，--memory 追加全局串行分配阶段并记录真实模式', async () => {
    const reports = join(workspace, '_notes', 'reports', 'benchmarks');
    for (const memory of [false, true]) {
      await writeFile(join(workspace, 'phases.txt'), '', 'utf8');
      await execute(
        process.execPath,
        [
          '--experimental-strip-types',
          join(repository, 'scripts', 'benchmarks', 'run.ts'),
          '--workspace',
          relative(repository, workspace),
          ...(memory ? ['--memory'] : []),
        ],
        { cwd: repository, timeout: 60_000 },
      );
      const directories = (await readdir(reports)).sort();
      const directory = join(reports, directories.at(-1)!);
      const report = parseBaseline(await readFile(join(directory, 'report.json'), 'utf8'));
      const markdown = await readFile(join(directory, 'report.md'), 'utf8');
      const phases = (await readFile(join(workspace, 'phases.txt'), 'utf8')).trim().split('\n');
      expect(report.errors).toEqual([]);
      expect(report.allocationEnabled).toBe(memory);
      expect(report.scenarios).toHaveLength(4);
      expect(phases).toEqual(memory ? ['latency', 'latency', 'allocation', 'allocation'] : ['latency', 'latency']);
      for (const scenario of report.scenarios) {
        expect(scenario.execution).toBe('passed');
        expect(scenario.measurement?.calls).toBe(scenario.id.includes('reference') ? 3 : 110);
        if (memory) {
          expect(scenario.allocation?.status).toBe(scenario.id.includes('reference') ? 'skipped' : 'measured');
        } else expect(scenario.allocation).toBeUndefined();
      }
      expect(Boolean(report.allocationPolicy)).toBe(memory);
      expect(markdown.includes('估算单次分配')).toBe(memory);
    }
  }, 120_000);

  it('请求内存但未产生分配元数据时失败，不静默生成成功报告；空过滤也失败', async () => {
    await writeFile(
      join(workspace, 'benchmarks', 'broken.bench.ts'),
      `
import { inject, test } from 'vitest';
test('missing allocation metadata', async ({ bench, task }) => {
  task.meta.benchmarkPhase = inject('benchmarkPhase');
  if (task.meta.benchmarkPhase === 'allocation') return;
  await bench('value', { async: false }, () => 7).run({ time: 0, iterations: 3, warmup: false });
});
`,
      'utf8',
    );
    const argumentsList = [
      '--experimental-strip-types',
      join(repository, 'scripts', 'benchmarks', 'run.ts'),
      '--workspace',
      relative(repository, workspace),
      '--memory',
    ];
    await expect(
      execute(process.execPath, [...argumentsList, 'broken'], {
        cwd: repository,
        timeout: 60_000,
      }),
    ).rejects.toMatchObject({ code: 1 });
    const reports = join(workspace, '_notes', 'reports', 'benchmarks');
    const directory = join(reports, (await readdir(reports)).sort().at(-1)!);
    const report = parseBaseline(await readFile(join(directory, 'report.json'), 'utf8'));
    expect(report.allocationEnabled).toBe(true);
    expect(report.errors).toContain(
      'Configured allocation phase did not produce metadata for every passed latency scenario',
    );
    await expect(
      execute(process.execPath, [...argumentsList, 'does-not-exist'], {
        cwd: repository,
        timeout: 60_000,
      }),
    ).rejects.toMatchObject({ code: 1 });
  }, 120_000);
});
