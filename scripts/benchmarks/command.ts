import { existsSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';

/** 共享命令只负责选择工作区、场景过滤及是否追加分配阶段，不改变包的构建与加载策略 */
export const parseBenchmarkCommand = (
  argumentsList: Array<string>,
  repository: string,
): { help: true } | { help: false; root: string; config: string; memory: boolean; filters: Array<string> } => {
  const { values, positionals } = parseArgs({
    args: argumentsList,
    options: {
      workspace: { type: 'string' },
      memory: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });
  if (values.help) return { help: true };
  if (!values.workspace) throw new Error('Missing --workspace <repository-relative-directory>');
  const repositoryRoot = realpathSync(repository);
  const root = realpathSync(resolve(repositoryRoot, values.workspace));
  const path = relative(repositoryRoot, root);
  if (path === '..' || path.startsWith(`..\\`) || path.startsWith('../') || isAbsolute(path)) {
    throw new Error('Benchmark workspace must be inside the repository');
  }
  const config = join(root, 'vitest.bench.config.ts');
  if (!existsSync(config)) throw new Error(`Missing benchmark config: ${config}`);
  return { help: false, root, config, memory: values.memory, filters: positionals };
};
