import { existsSync, realpathSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { readPackageRecords } from './check-release-groups.mjs';
import { releaseGroups } from './release-groups.config.mjs';

const dependencyFields = ['dependencies', 'peerDependencies', 'optionalDependencies'];
const allowedPackedRootFiles = new Set(['LICENSE', 'README.md', 'package.json']);
const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '..');
const limitsPath = path.join(repoRoot, 'scripts', 'publish-artifact-limits.json');

const toPosixPath = value => value.replaceAll('\\', '/');

/** 把 peer 包名转换为 DefinitelyTyped 包名 */
export function peerTypePackageName(peerName) {
  if (peerName.startsWith('@')) {
    const [scope, name] = peerName.slice(1).split('/');
    return `@types/${scope}__${name}`;
  }

  return `@types/${peerName}`;
}

/**
 * 校验单一 ESM runtime 与声明树的 dist 文件布局。
 *
 * @param {string} packageName 包名。
 * @param {Array<string>} relativeFiles 相对 dist 的文件路径。
 * @returns {Array<string>} 布局诊断。
 */
export function validateDistFiles(packageName, relativeFiles) {
  const diagnostics = [];
  const files = relativeFiles.map(file => toPosixPath(file).replace(/^\.\//, ''));

  for (const file of files) {
    if (file === 'es' || file.startsWith('es/')) {
      diagnostics.push(`${packageName} must not contain dist/es: ${file}`);
    }

    if (file === 'lib' || file.startsWith('lib/')) {
      diagnostics.push(`${packageName} must not contain dist/lib: ${file}`);
    }

    if (file.endsWith('.cjs') || file.endsWith('.cjs.map')) {
      diagnostics.push(`${packageName} must not contain .cjs: ${file}`);
    }

    const isDeclaration = file.endsWith('.d.ts') || file.endsWith('.d.ts.map');
    const isRuntime = file.endsWith('.js') || file.endsWith('.js.map');
    const isTypeFile = file.startsWith('types/');

    if (isDeclaration && !isTypeFile) {
      diagnostics.push(`${packageName} declarations must be under dist/types: ${file}`);
    }

    if (isTypeFile && isRuntime) {
      diagnostics.push(`${packageName} dist/types must not contain runtime JavaScript: ${file}`);
    }

    if ((isTypeFile && !isDeclaration) || (!isTypeFile && !isRuntime)) {
      diagnostics.push(`${packageName} has unexpected dist file: ${file}`);
    }
  }

  if (!files.some(file => file.endsWith('.js') && !file.startsWith('types/'))) {
    diagnostics.push(`${packageName} dist must contain ESM runtime JavaScript`);
  }

  if (!files.some(file => file.endsWith('.d.ts') && file.startsWith('types/'))) {
    diagnostics.push(`${packageName} dist/types must contain declarations`);
  }

  return diagnostics;
}

/**
 * 校验 pnpm pack 返回的包根相对文件列表。
 *
 * @param {string} packageName 包名。
 * @param {Array<{path: string}>} packedFiles pnpm pack JSON 中的 files。
 * @returns {Array<string>} 打包文件诊断。
 */
export function validatePackedFiles(packageName, packedFiles) {
  const diagnostics = [];
  const distFiles = [];

  for (const packedFile of packedFiles) {
    const file = toPosixPath(packedFile.path);

    if (file.startsWith('dist/')) {
      distFiles.push(file.slice('dist/'.length));
      continue;
    }

    if (!allowedPackedRootFiles.has(file)) {
      diagnostics.push(`${packageName} has unexpected packed file: ${file}`);
    }
  }

  diagnostics.push(...validateDistFiles(packageName, distFiles));

  return diagnostics;
}

/**
 * 校验 workspace 协议在 packed manifest 中已转换为发布版本范围。
 *
 * @param {{sourceManifest: Record<string, unknown>, packedManifest: Record<string, unknown>, versionsByPackage: Map<string, string>}} options 校验输入。
 * @returns {Array<string>} 依赖范围诊断。
 */
export function validatePackedDependencyRanges({ sourceManifest, packedManifest, versionsByPackage }) {
  const diagnostics = [];

  for (const field of dependencyFields) {
    const sourceDependencies = sourceManifest[field] ?? {};
    const packedDependencies = packedManifest[field] ?? {};

    for (const [dependencyName, packedRange] of Object.entries(packedDependencies)) {
      if (typeof packedRange === 'string' && packedRange.startsWith('workspace:')) {
        diagnostics.push(`${sourceManifest.name} packed ${field}.${dependencyName} still uses ${packedRange}`);
      }
    }

    for (const [dependencyName, sourceRange] of Object.entries(sourceDependencies)) {
      if (sourceRange !== 'workspace:*' && sourceRange !== 'workspace:^') {
        continue;
      }

      const dependencyVersion = versionsByPackage.get(dependencyName);

      if (!dependencyVersion) {
        diagnostics.push(`${sourceManifest.name} cannot resolve packed version for ${dependencyName}`);
        continue;
      }

      const expectedRange = sourceRange === 'workspace:*' ? dependencyVersion : `^${dependencyVersion}`;

      if (packedDependencies[dependencyName] !== expectedRange) {
        diagnostics.push(
          `${sourceManifest.name} packed ${field}.${dependencyName} must be ${expectedRange}; received ${packedDependencies[dependencyName]}`,
        );
      }
    }
  }

  return diagnostics;
}

/**
 * 校验 pnpm 应用 publishConfig 后的 manifest 字段与真实 tarball targets。
 *
 * @param {{sourceManifest: Record<string, unknown>, packedManifest: Record<string, unknown>, packedFiles: Array<{path: string}>}} options 校验输入。
 * @returns {Array<string>} packed manifest 与 target 诊断。
 */
export function validatePackedManifestContract({ sourceManifest, packedManifest, packedFiles }) {
  const diagnostics = [];
  const expectedPublishConfig = sourceManifest.publishConfig;
  const rootFields = ['main', 'module', 'types'];

  for (const field of rootFields) {
    if (packedManifest[field] !== expectedPublishConfig[field]) {
      diagnostics.push(
        `${sourceManifest.name} packed ${field} must be ${expectedPublishConfig[field]}; received ${packedManifest[field]}`,
      );
    }
  }

  if (JSON.stringify(packedManifest.exports) !== JSON.stringify(expectedPublishConfig.exports)) {
    diagnostics.push(`${sourceManifest.name} packed exports must exactly match publishConfig.exports`);
  }

  const packedFilePaths = new Set(packedFiles.map(file => toPosixPath(file.path)));
  const targets = new Set(
    [
      ...rootFields.map(field => packedManifest[field]),
      ...Object.values(packedManifest.exports ?? {}).flatMap(exportTarget =>
        exportTarget && typeof exportTarget === 'object' ? Object.values(exportTarget) : [exportTarget],
      ),
    ].filter(target => typeof target === 'string' && target.startsWith('./')),
  );

  for (const target of targets) {
    const packedPath = target.slice(2);

    if (!packedFilePaths.has(packedPath)) {
      diagnostics.push(`${sourceManifest.name} packed target is missing from tarball: ${target}`);
    }
  }

  return diagnostics;
}

/**
 * 派生 packed manifest 的全部公开 import specifier。
 *
 * @param {{name: string, exports: Record<string, unknown>}} manifest packed manifest。
 * @returns {Array<string>} 根入口与 subpath specifier。
 */
export function exportSpecifiers(manifest) {
  return Object.keys(manifest.exports).map(subpath =>
    subpath === '.' ? manifest.name : `${manifest.name}/${subpath.slice(2)}`,
  );
}

/**
 * 生成 pnpm 11 fixture 使用的 workspace overrides 配置。
 *
 * @param {Record<string, string>} overrides 本地 tarball overrides。
 * @returns {string} 可直接写入 pnpm-workspace.yaml 的内容。
 */
export function renderFixtureWorkspaceYaml(overrides) {
  return [
    'overrides:',
    ...Object.entries(overrides)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([packageName, packageSpec]) => `  ${JSON.stringify(packageName)}: ${JSON.stringify(packageSpec)}`),
    '',
  ].join('\n');
}

/** 按 10% 余量向上取整到 10 个文件。 */
export function nextFileLimit(fileCount) {
  return Math.ceil((fileCount * 11) / 100) * 10;
}

/** 按 15% 余量向上取整到 10 KiB。 */
export function nextPackedByteLimit(byteCount) {
  return Math.ceil((byteCount * 115) / (100 * 10240)) * 10240;
}

/** 按包名稳定排序 artifact limits。 */
export function sortArtifactLimits(limits) {
  return Object.fromEntries(Object.entries(limits).sort(([left], [right]) => left.localeCompare(right)));
}

/**
 * 阻止递归删除系统临时目录或非本任务目录。
 *
 * @param {string} candidatePath 已 realpath 的待删除目录。
 */
export function assertSafeTempPath(candidatePath) {
  const tempRoot = realpathSync(os.tmpdir());
  const resolvedCandidate = path.resolve(candidatePath);
  const isDirectTempChild = path.dirname(resolvedCandidate) === tempRoot;
  const hasTaskPrefix = path.basename(resolvedCandidate).startsWith('retikz-publish-');

  if (!isDirectTempChild || !hasTaskPrefix) {
    throw new Error(`Refusing to delete unsafe publish temp path: ${resolvedCandidate}`);
  }
}

/** 递归列出目录内的文件，并返回 POSIX 风格相对路径。 */
async function listFiles(rootDirectory, currentDirectory = rootDirectory) {
  const files = [];

  for (const entry of await readdir(currentDirectory, { withFileTypes: true })) {
    const entryPath = path.join(currentDirectory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFiles(rootDirectory, entryPath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(toPosixPath(path.relative(rootDirectory, entryPath)));
    }
  }

  return files;
}

/** 运行需要完整错误上下文的子进程。 */
function runCommand(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      CI: '1',
    },
    maxBuffer: 50 * 1024 * 1024,
    shell: false,
  });

  if (result.error || result.status !== 0) {
    throw new Error(
      [
        `Command failed: ${command} ${args.join(' ')}`,
        `cwd: ${cwd}`,
        `status: ${result.status}`,
        result.error ? `error: ${result.error.message}` : '',
        `stdout:\n${result.stdout ?? ''}`,
        `stderr:\n${result.stderr ?? ''}`,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  return result.stdout;
}

/** 使用无 shell 拼接的跨平台 pnpm 子进程。 */
function runPnpm(args, cwd) {
  if (process.platform === 'win32') {
    return runCommand(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', 'pnpm.cmd', ...args], cwd);
  }

  return runCommand('pnpm', args, cwd);
}

/** 读取 JSON 文件。 */
async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

/** 按 release-group 配置顺序读取十个发布包。 */
async function readPublishableRecords() {
  const configuredNames = Object.values(releaseGroups).flatMap(group => group.packages);
  const recordsByName = new Map((await readPackageRecords(repoRoot)).map(record => [record.manifest.name, record]));

  return configuredNames.map(packageName => {
    const record = recordsByName.get(packageName);

    if (!record) {
      throw new Error(`Missing package record for ${packageName}`);
    }

    return {
      ...record,
      directory: path.dirname(path.join(repoRoot, record.path)),
    };
  });
}

/** 校验源码 publish targets 都存在于构建目录。 */
function validateExportTargets(record) {
  const diagnostics = [];
  const targets = new Set(
    Object.values(record.manifest.publishConfig.exports).flatMap(exportTarget => Object.values(exportTarget)),
  );

  for (const target of targets) {
    const targetPath = path.join(record.directory, target.replace(/^\.\//, ''));

    if (!existsSync(targetPath)) {
      diagnostics.push(`${record.manifest.name} export target does not exist: ${target}`);
    }
  }

  return diagnostics;
}

/** 从 workspace 安装结果解析全部 peer 的具体版本。 */
async function collectPeerDependencies(records) {
  const peerDependencies = {};

  for (const record of records) {
    for (const peerName of Object.keys(record.manifest.peerDependencies ?? {})) {
      const peerPackagePath = path.join(record.directory, 'node_modules', ...peerName.split('/'), 'package.json');

      if (!existsSync(peerPackagePath)) {
        throw new Error(`${record.manifest.name} peer ${peerName} is not installed at ${peerPackagePath}`);
      }

      const installedVersion = (await readJson(peerPackagePath)).version;
      const previousVersion = peerDependencies[peerName];

      if (previousVersion && previousVersion !== installedVersion) {
        throw new Error(`Peer ${peerName} has conflicting installed versions: ${previousVersion}, ${installedVersion}`);
      }

      peerDependencies[peerName] = installedVersion;
    }
  }

  return peerDependencies;
}

/** 收集 workspace 中已安装的 peer 类型包，供严格声明消费验证使用 */
async function collectPeerTypeDependencies(records) {
  const peerTypeDependencies = {};

  for (const record of records) {
    for (const peerName of Object.keys(record.manifest.peerDependencies ?? {})) {
      const typePackageName = peerTypePackageName(peerName);
      const typePackagePath = path.join(
        record.directory,
        'node_modules',
        ...typePackageName.split('/'),
        'package.json',
      );

      if (!existsSync(typePackagePath)) continue;

      const installedVersion = (await readJson(typePackagePath)).version;
      const previousVersion = peerTypeDependencies[typePackageName];

      if (previousVersion && previousVersion !== installedVersion) {
        throw new Error(
          `Peer type ${typePackageName} has conflicting installed versions: ${previousVersion}, ${installedVersion}`,
        );
      }

      peerTypeDependencies[typePackageName] = installedVersion;
    }
  }

  return peerTypeDependencies;
}

/** 收集声明消费环境固定提供的 Node 类型 */
async function collectFixtureTypeDependencies() {
  const nodeTypesName = '@types/node';
  const nodeTypesPath = path.join(repoRoot, 'node_modules', ...nodeTypesName.split('/'), 'package.json');

  if (!existsSync(nodeTypesPath)) {
    throw new Error(`Publish type smoke requires ${nodeTypesName} at ${nodeTypesPath}`);
  }

  return { [nodeTypesName]: (await readJson(nodeTypesPath)).version };
}

/** 写入离线 consumer 并返回安装后的 packed manifests。 */
async function installPackedFixture({ records, tarballsByName, taskDirectory }) {
  const fixtureDirectory = path.join(taskDirectory, 'fixture');
  const tarballDependencies = Object.fromEntries(
    records.map(record => [record.manifest.name, `file:${toPosixPath(tarballsByName.get(record.manifest.name))}`]),
  );
  const peerDependencies = await collectPeerDependencies(records);
  const peerTypeDependencies = await collectPeerTypeDependencies(records);
  const fixtureTypeDependencies = await collectFixtureTypeDependencies();
  const fixtureManifest = {
    name: 'retikz-esm-publish-smoke',
    private: true,
    type: 'module',
    engines: {
      node: '>=24',
    },
    dependencies: {
      ...tarballDependencies,
      ...peerDependencies,
      ...peerTypeDependencies,
      ...fixtureTypeDependencies,
    },
  };

  await mkdir(fixtureDirectory, { recursive: true });
  await writeFile(path.join(fixtureDirectory, 'package.json'), `${JSON.stringify(fixtureManifest, null, 2)}\n`, 'utf8');
  await writeFile(
    path.join(fixtureDirectory, 'pnpm-workspace.yaml'),
    renderFixtureWorkspaceYaml(tarballDependencies),
    'utf8',
  );

  runPnpm(['install', '--offline', '--ignore-scripts'], fixtureDirectory);

  const packedManifests = new Map();

  for (const record of records) {
    const installedManifestPath = path.join(
      fixtureDirectory,
      'node_modules',
      ...record.manifest.name.split('/'),
      'package.json',
    );
    packedManifests.set(record.manifest.name, await readJson(installedManifestPath));
  }

  return { fixtureDirectory, packedManifests };
}

/** 用严格 Bundler 配置消费全部公开声明入口 */
async function runPackedTypeSmoke(fixtureDirectory, specifiers) {
  const typeSmokePath = path.join(fixtureDirectory, 'type-smoke.ts');
  const typeSmokeConfigPath = path.join(fixtureDirectory, 'tsconfig.json');
  const typeSmokeSource = specifiers
    .map((specifier, index) => `export type Package${index} = typeof import(${JSON.stringify(specifier)});`)
    .join('\n');

  await writeFile(typeSmokePath, `${typeSmokeSource}\n`, 'utf8');
  await writeFile(
    typeSmokeConfigPath,
    `${JSON.stringify(
      {
        compilerOptions: {
          module: 'ESNext',
          moduleResolution: 'Bundler',
          noEmit: true,
          skipLibCheck: false,
          strict: true,
          target: 'ESNext',
          types: ['node'],
        },
        files: ['./type-smoke.ts'],
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  runCommand(
    process.execPath,
    [path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc'), '--project', '.'],
    fixtureDirectory,
  );
}

/** 原子更新 reviewed artifact limits。 */
async function writeLimitsAtomically(limits) {
  const temporaryPath = `${limitsPath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(sortArtifactLimits(limits), null, 2)}\n`, 'utf8');
  await rename(temporaryPath, limitsPath);
}

async function main() {
  const updateLimits = process.argv.includes('--update-limits');
  const nodeMajor = Number(process.versions.node.split('.')[0]);

  if (nodeMajor !== 24) {
    throw new Error(`Publish artifact checks require Node 24; received ${process.version}`);
  }

  const records = await readPublishableRecords();
  const versionsByPackage = new Map(records.map(record => [record.manifest.name, record.manifest.version]));
  const diagnostics = [];

  for (const record of records) {
    const distDirectory = path.join(record.directory, 'dist');

    if (!existsSync(distDirectory)) {
      diagnostics.push(`${record.manifest.name} is missing dist; run pnpm run build first`);
      continue;
    }

    diagnostics.push(
      ...validateDistFiles(record.manifest.name, await listFiles(distDirectory)),
      ...validateExportTargets(record),
    );
  }

  if (diagnostics.length > 0) {
    throw new Error(`Publish dist validation failed:\n${diagnostics.map(item => `- ${item}`).join('\n')}`);
  }

  let taskDirectory;

  try {
    taskDirectory = await mkdtemp(path.join(os.tmpdir(), 'retikz-publish-'));
    const tarballsDirectory = path.join(taskDirectory, 'tarballs');
    const packResults = new Map();
    const tarballsByName = new Map();
    const candidateLimits = {};

    await mkdir(tarballsDirectory, { recursive: true });

    for (const record of records) {
      const packOutput = runPnpm(['pack', '--json', '--pack-destination', tarballsDirectory], record.directory);
      const packResult = JSON.parse(packOutput);
      const tarballPath = path.resolve(packResult.filename);
      const packedBytes = (await stat(tarballPath)).size;
      const packDiagnostics = validatePackedFiles(record.manifest.name, packResult.files);

      if (packDiagnostics.length > 0) {
        throw new Error(`Packed file validation failed:\n${packDiagnostics.map(item => `- ${item}`).join('\n')}`);
      }

      packResults.set(record.manifest.name, { ...packResult, packedBytes });
      tarballsByName.set(record.manifest.name, tarballPath);
      candidateLimits[record.manifest.name] = {
        maxFiles: nextFileLimit(packResult.files.length),
        maxPackedBytes: nextPackedByteLimit(packedBytes),
      };
    }

    const { fixtureDirectory, packedManifests } = await installPackedFixture({
      records,
      tarballsByName,
      taskDirectory,
    });
    const packedDiagnostics = [];
    const specifiers = [];

    for (const record of records) {
      const packedManifest = packedManifests.get(record.manifest.name);
      const packResult = packResults.get(record.manifest.name);

      packedDiagnostics.push(
        ...validatePackedManifestContract({
          sourceManifest: record.manifest,
          packedManifest,
          packedFiles: packResult.files,
        }),
        ...validatePackedDependencyRanges({
          sourceManifest: record.manifest,
          packedManifest,
          versionsByPackage,
        }),
      );
      specifiers.push(...exportSpecifiers(packedManifest));
    }

    if (packedDiagnostics.length > 0) {
      throw new Error(`Packed manifest validation failed:\n${packedDiagnostics.map(item => `- ${item}`).join('\n')}`);
    }

    const smokeSource = `const specifiers = ${JSON.stringify(specifiers)}; await Promise.all(specifiers.map(specifier => import(specifier)));`;
    runCommand(process.execPath, ['--input-type=module', '--eval', smokeSource], fixtureDirectory);
    await runPackedTypeSmoke(fixtureDirectory, specifiers);

    if (updateLimits) {
      await writeLimitsAtomically(candidateLimits);
    } else {
      if (!existsSync(limitsPath)) {
        throw new Error('Missing scripts/publish-artifact-limits.json; run pnpm run update:publish-artifact-limits');
      }

      const limits = await readJson(limitsPath);
      const limitDiagnostics = [];

      for (const record of records) {
        const packageName = record.manifest.name;
        const result = packResults.get(packageName);
        const limit = limits[packageName];

        if (!limit) {
          limitDiagnostics.push(`${packageName} is missing artifact limits`);
          continue;
        }

        if (result.files.length > limit.maxFiles) {
          limitDiagnostics.push(`${packageName} packed ${result.files.length} files; limit is ${limit.maxFiles}`);
        }

        if (result.packedBytes > limit.maxPackedBytes) {
          limitDiagnostics.push(`${packageName} packed ${result.packedBytes} bytes; limit is ${limit.maxPackedBytes}`);
        }
      }

      for (const packageName of Object.keys(limits)) {
        if (!versionsByPackage.has(packageName)) {
          limitDiagnostics.push(`Artifact limits contain unknown package ${packageName}`);
        }
      }

      if (limitDiagnostics.length > 0) {
        throw new Error(`Artifact limit validation failed:\n${limitDiagnostics.map(item => `- ${item}`).join('\n')}`);
      }
    }

    for (const record of records) {
      const result = packResults.get(record.manifest.name);
      console.log(`${record.manifest.name}: ${result.files.length} files, ${result.packedBytes} bytes`);
    }

    console.log(
      updateLimits
        ? 'Publish artifact limits updated after successful packed ESM smoke tests.'
        : `Publish artifact checks passed for ${records.length} package(s) and ${specifiers.length} public export(s).`,
    );
  } finally {
    if (taskDirectory) {
      const resolvedTaskDirectory = await realpath(taskDirectory);
      assertSafeTempPath(resolvedTaskDirectory);
      await rm(resolvedTaskDirectory, { recursive: true, force: true });
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  await main();
}
