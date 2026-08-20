import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RuntimeTypeMarkerPattern = /@ts-expect-error|expectTypeOf|toMatchTypeOf|toEqualTypeOf/;

const normalizeRepositoryPath = filePath => filePath.replaceAll('\\', '/');

const isRuntimeTestPath = filePath => /\.(?:test|spec)\.(?:ts|tsx)$/.test(normalizeRepositoryPath(filePath));

const isTypecheckPath = filePath => /\.typecheck\.(?:ts|tsx)$/.test(normalizeRepositoryPath(filePath));

const isScratchPath = filePath => normalizeRepositoryPath(filePath).includes('/tests/_scratch/');

/** 收集正式 runtime、禁止的 typecheck 与 scratch 测试边界诊断 */
export const collectTestBoundaryDiagnostics = files =>
  files.flatMap(file => {
    if (isScratchPath(file.filePath)) {
      return file.tracked
        ? [
            {
              filePath: file.filePath,
              line: 1,
              message: 'tracked files must not be stored below tests/_scratch/',
              rule: 'tracked-scratch',
            },
          ]
        : [];
    }

    if (isTypecheckPath(file.filePath)) {
      return [
        {
          filePath: file.filePath,
          line: 1,
          message: 'standalone typecheck fixtures are not allowed; rely on tsc --noEmit',
          rule: 'standalone-typecheck',
        },
      ];
    }

    const lines = file.content.split(/\r?\n/);

    if (isRuntimeTestPath(file.filePath)) {
      return lines.flatMap((line, index) =>
        RuntimeTypeMarkerPattern.test(line)
          ? [
              {
                filePath: file.filePath,
                line: index + 1,
                message: 'runtime tests must not contain type-only markers',
                rule: 'runtime-type-marker',
              },
            ]
          : [],
      );
    }

    return [];
  });

/** 格式化单条测试边界诊断 */
export const formatTestBoundaryDiagnostic = diagnostic =>
  `${path.normalize(diagnostic.filePath)}:${diagnostic.line}: test boundary: ${diagnostic.message}`;

const splitGitOutput = output => output.split(/\r?\n/).filter(Boolean);

const runGit = (argumentsList, cwd) => splitGitOutput(execFileSync('git', argumentsList, { cwd, encoding: 'utf8' }));

const loadCandidateFiles = cwd => {
  const trackedPaths = runGit(['ls-files', '--cached', '--', 'packages', 'apps'], cwd);
  const untrackedPaths = runGit(['ls-files', '--others', '--exclude-standard', '--', 'packages', 'apps'], cwd);

  return [
    ...trackedPaths.map(filePath => ({ filePath, tracked: true })),
    ...untrackedPaths.map(filePath => ({ filePath, tracked: false })),
  ]
    .filter(file => existsSync(path.resolve(cwd, file.filePath)))
    .map(file => ({
      ...file,
      content: readFileSync(path.resolve(cwd, file.filePath), 'utf8'),
    }));
};

/** 检查仓库测试文件是否遵守 runtime 与 scratch 边界 */
export const runTestBoundaryCheck = ({ cwd = process.cwd() } = {}) => {
  const files = loadCandidateFiles(cwd);
  const diagnostics = collectTestBoundaryDiagnostics(files);

  if (diagnostics.length === 0) {
    console.log(`Test boundaries are valid across ${files.length} candidate file(s).`);
    return 0;
  }

  for (const diagnostic of diagnostics) {
    console.error(formatTestBoundaryDiagnostic(diagnostic));
  }
  console.error(`Found ${diagnostics.length} test boundary violation(s).`);
  return 1;
};

const isMainModule = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  process.exitCode = runTestBoundaryCheck();
}
