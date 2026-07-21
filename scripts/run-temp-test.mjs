import { existsSync, realpathSync } from 'node:fs';
import { rm, rmdir } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), '..');

/** 判断目标是否位于指定目录内，且不是目录自身。 */
const isDescendant = (directory, target) => {
  const relative = path.relative(directory, target);
  return (
    relative.length > 0 && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative)
  );
};

/** 解析存在路径的真实位置，并保留可操作的不存在诊断。 */
const resolveRealPath = (candidatePath, label) => {
  try {
    return realpathSync.native(candidatePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`${label} does not exist: ${candidatePath}`);
    }

    throw error;
  }
};

/** 解析并校验临时测试文件位置。 */
export const resolveTemporaryTest = ({ repositoryRoot: root, workspace, file }) => {
  if (!workspace || path.isAbsolute(workspace)) {
    throw new Error('--workspace must be a repository-relative workspace directory');
  }

  if (!file || path.isAbsolute(file)) {
    throw new Error('--file must be a workspace-relative temporary test path');
  }

  const repositoryRoot = resolveRealPath(root, 'Repository root');
  const workspacePath = path.resolve(repositoryRoot, workspace);

  if (!isDescendant(repositoryRoot, workspacePath)) {
    throw new Error('--workspace must stay inside the repository root');
  }

  const workspaceRoot = resolveRealPath(workspacePath, 'Workspace directory');

  if (!isDescendant(repositoryRoot, workspaceRoot)) {
    throw new Error('--workspace resolves outside the repository root');
  }

  const scratchPath = path.join(workspaceRoot, 'tests', '_scratch');
  const filePath = path.resolve(workspaceRoot, file);

  if (!isDescendant(scratchPath, filePath)) {
    throw new Error('--file must be located below tests/_scratch/');
  }

  const scratchRoot = resolveRealPath(scratchPath, 'Temporary scratch directory');

  if (!isDescendant(workspaceRoot, scratchRoot)) {
    throw new Error('--file resolves outside the workspace through tests/_scratch/');
  }

  const realFilePath = resolveRealPath(filePath, 'Temporary test file');

  if (!isDescendant(scratchRoot, realFilePath)) {
    throw new Error('--file resolves outside tests/_scratch/');
  }

  return {
    workspaceRoot,
    scratchRoot,
    filePath: realFilePath,
    testFile: path.relative(workspaceRoot, realFilePath).replaceAll(path.sep, '/'),
  };
};

/** 删除临时测试，并仅向上删除已为空的 `_scratch` 父目录。 */
const removeTemporaryTest = async ({ filePath, scratchRoot }) => {
  await rm(filePath, { force: true });

  let directory = path.dirname(filePath);

  while (directory === scratchRoot || isDescendant(scratchRoot, directory)) {
    try {
      await rmdir(directory);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTEMPTY') {
        return;
      }

      throw error;
    }

    directory = path.dirname(directory);
  }
};

/** 在临时测试生命周期内运行传入的验证函数。 */
export const runTemporaryTest = async ({ repositoryRoot: root, workspace, file, keep = false, run }) => {
  const temporaryTest = resolveTemporaryTest({
    repositoryRoot: root,
    workspace,
    file,
  });

  if (!existsSync(temporaryTest.filePath)) {
    throw new Error(`Temporary test file does not exist: ${temporaryTest.filePath}`);
  }

  try {
    return await run(temporaryTest);
  } finally {
    if (!keep) {
      await removeTemporaryTest(temporaryTest);
    }
  }
};

/** 使用目标 workspace 的 Vitest 环境运行临时测试。 */
const runVitest = ({ workspaceRoot, testFile }) =>
  new Promise((resolve, reject) => {
    const command = process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'pnpm';
    const args =
      process.platform === 'win32'
        ? ['/d', '/s', '/c', 'pnpm.cmd', '--dir', workspaceRoot, 'exec', 'vitest', 'run', testFile]
        : ['--dir', workspaceRoot, 'exec', 'vitest', 'run', testFile];
    const child = spawn(command, args, {
      cwd: repositoryRoot,
      shell: false,
      stdio: 'inherit',
    });

    child.once('error', reject);
    child.once('exit', code => resolve(code ?? 1));
  });

/** 解析 CLI 参数。 */
const parseArguments = argumentsList => {
  const options = {
    keep: false,
  };

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];

    if (argument === '--keep') {
      options.keep = true;
      continue;
    }

    if (argument === '--workspace' || argument === '--file') {
      const value = argumentsList[index + 1];

      if (!value || value.startsWith('--')) {
        throw new Error(`${argument} requires a value`);
      }

      options[argument.slice(2)] = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  if (!options.workspace || !options.file) {
    throw new Error('Usage: pnpm temp:test -- --workspace <directory> --file <tests/_scratch/*.test.ts> [--keep]');
  }

  return options;
};

const main = async () => {
  const options = parseArguments(process.argv.slice(2));
  const exitCode = await runTemporaryTest({
    repositoryRoot,
    workspace: options.workspace,
    file: options.file,
    keep: options.keep,
    run: runVitest,
  });

  process.exitCode = exitCode;
};

if (process.argv[1] === scriptPath) {
  await main();
}
