import { fileURLToPath } from 'node:url';

import { createVitest } from 'vitest/node';

import { parseBenchmarkCommand } from './command.ts';
import { createBenchmarkProjects } from './projects.ts';

try {
  const command = parseBenchmarkCommand(process.argv.slice(2), fileURLToPath(new URL('../../', import.meta.url)));
  if (command.help) {
    console.log(
      'Usage: pnpm bench --workspace <directory> [--memory] [file filters...]\n默认仅测耗时；--memory 在全部耗时场景完成后追加独立 JS 堆分配采样。\n构建由包现有流程负责，运行前须准备当前源码所需产物。',
    );
  } else {
    const vitest = await createVitest({
      root: command.root,
      config: command.config,
      run: true,
      watch: false,
      fileParallelism: false,
      maxWorkers: 1,
      benchmark: { enabled: true },
      provide: { benchmarkMemory: command.memory },
      projects: createBenchmarkProjects(command.memory),
    });
    try {
      await vitest.start(command.filters);
    } finally {
      await vitest.close();
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
