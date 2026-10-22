import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { cpus, hostname, totalmem } from 'node:os';
import { join, relative, resolve } from 'node:path';

import { version } from 'vitest/node';

import type { BenchmarkEnvironment, BenchmarkReport, BenchmarkReporterOptions } from './types';

/** 对文件内容和相对路径作稳定摘要，区分 fixture 与算法源码变化 */
const hashFiles = (root: string, paths: Array<string>): string => {
  const hash = createHash('sha256');
  for (const path of [...paths].sort()) {
    hash.update(relative(root, path).replaceAll('\\', '/'));
    hash.update('\0');
    hash.update(readFileSync(path));
    hash.update('\0');
  }
  return hash.digest('hex');
};

/** 递归读取源码文件清单，不读取生成目录 */
const listSourceFiles = (root: string): Array<string> =>
  readdirSync(root, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? listSourceFiles(join(root, entry.name)) : [join(root, entry.name)],
  );

/** 在采样前收集环境与源码身份，源码版本不参与环境兼容性比较 */
export const captureBenchmarkContext = (
  root: string,
  sampling: BenchmarkEnvironment['sampling'],
  options: BenchmarkReporterOptions,
): Pick<BenchmarkReport, 'environment' | 'source'> => {
  const repository = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8' }).trim();
  const models = [...new Set(cpus().map(cpu => cpu.model))].sort();
  const fixtures = listSourceFiles(join(root, 'benchmarks'));
  return {
    environment: {
      runnerId: options.runnerId?.trim() || hostname(),
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      cpuModels: models,
      logicalCpuCount: cpus().length,
      totalMemoryBytes: totalmem(),
      vitest: version,
      lockHash: hashFiles(repository, [join(repository, 'pnpm-lock.yaml')]),
      fixtureHash: hashFiles(root, [
        ...fixtures,
        ...options.configFiles.map(path => resolve(root, path)),
        ...listSourceFiles(join(repository, 'scripts', 'benchmarks')),
      ]),
      artifact: 'native-esm',
      sampling,
    },
    source: {
      commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
      dirty: execFileSync('git', ['status', '--porcelain'], { cwd: repository, encoding: 'utf8' }).trim().length > 0,
      sourceHash: hashFiles(root, listSourceFiles(resolve(root, options.sourceDirectory))),
    },
  };
};
