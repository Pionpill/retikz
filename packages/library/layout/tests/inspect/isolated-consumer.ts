import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** 隔离 consumer 中一次模块导入的进程结果 */
export type IsolatedImportResult = Readonly<{
  status: number | null;
  stdout: string;
  stderr: string;
}>;

/** Layout 发布包的隔离 consumer 三态结果 */
export type LayoutPackageBoundaryResult = Readonly<{
  rootWithoutPeer: IsolatedImportResult;
  inspectWithoutPeer: IsolatedImportResult;
  inspectWithPeer: IsolatedImportResult;
}>;

type RuntimeImport = Readonly<{
  specifier: string;
  bindings: ReadonlySet<string>;
}>;

const IMPORT_PATTERN = /import\s+(?:(.*?)\s+from\s+)?['"]([^'"]+)['"];?/gs;

/** 收集发布产物中的 JavaScript 文件 */
const collectJavaScriptFiles = (directory: string): Array<string> => {
  const files: Array<string> = [];
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      files.push(...collectJavaScriptFiles(path));
    } else if (name.endsWith('.js')) {
      files.push(path);
    }
  }
  return files;
};

/** 读取单条静态 import 使用的导出名 */
const importBindingsOf = (clause: string | undefined): ReadonlySet<string> => {
  const bindings = new Set<string>();
  if (clause === undefined) return bindings;
  const trimmed = clause.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('*')) bindings.add('default');
  const named = trimmed.match(/\{([^}]*)\}/s)?.[1];
  if (named !== undefined) {
    for (const entry of named.split(',')) {
      const imported = entry
        .trim()
        .split(/\s+as\s+/u)[0]
        ?.trim();
      if (imported) bindings.add(imported);
    }
  }
  return bindings;
};

/** 扫描发布产物引用的外部模块及其静态导出名 */
const collectRuntimeImports = (dist: string): Array<RuntimeImport> => {
  const bindingsBySpecifier = new Map<string, Set<string>>();
  for (const file of collectJavaScriptFiles(dist)) {
    const source = readFileSync(file, 'utf8');
    IMPORT_PATTERN.lastIndex = 0;
    for (const match of source.matchAll(IMPORT_PATTERN)) {
      const specifier = match[2];
      if (specifier.startsWith('.') || specifier.startsWith('/')) continue;
      const bindings = bindingsBySpecifier.get(specifier) ?? new Set<string>();
      importBindingsOf(match[1]).forEach(binding => bindings.add(binding));
      bindingsBySpecifier.set(specifier, bindings);
    }
  }
  return Array.from(bindingsBySpecifier, ([specifier, bindings]) => ({ specifier, bindings }));
};

/** 将模块 specifier 拆成包名与 exports 子路径 */
const packageTargetOf = (specifier: string): Readonly<{ name: string; subpath: string }> => {
  const parts = specifier.split('/');
  const scoped = specifier.startsWith('@');
  const name = scoped ? `${parts[0]}/${parts[1]}` : parts[0];
  const remainder = parts.slice(scoped ? 2 : 1);
  return { name, subpath: remainder.length === 0 ? '.' : `./${remainder.join('/')}` };
};

/** 写入可满足静态链接的通用外部模块，不承载被测包逻辑 */
const writeExternalStubs = (
  nodeModules: string,
  imports: ReadonlyArray<RuntimeImport>,
  targetPackage: string,
  includeInspect: boolean,
): void => {
  const packages = new Map<string, Map<string, Set<string>>>();
  for (const runtimeImport of imports) {
    const target = packageTargetOf(runtimeImport.specifier);
    if (target.name === targetPackage || (!includeInspect && target.name === '@retikz/inspect')) continue;
    const entries = packages.get(target.name) ?? new Map<string, Set<string>>();
    const bindings = entries.get(target.subpath) ?? new Set<string>();
    runtimeImport.bindings.forEach(binding => bindings.add(binding));
    entries.set(target.subpath, bindings);
    packages.set(target.name, entries);
  }

  for (const [name, entries] of packages) {
    const packageDirectory = join(nodeModules, ...name.split('/'));
    mkdirSync(packageDirectory, { recursive: true });
    const exports: Record<string, string> = {};
    for (const [subpath, bindings] of entries) {
      const filename = subpath === '.' ? 'index.js' : `${subpath.slice(2).replaceAll('/', '-')}.js`;
      exports[subpath] = `./${filename}`;
      const named = Array.from(bindings)
        .filter(binding => binding !== 'default')
        .map(binding => `export { universal as ${binding} };`)
        .join('\n');
      const defaultExport = bindings.has('default') ? '\nexport default universal;' : '';
      writeFileSync(
        join(packageDirectory, filename),
        `const universal = new Proxy(function () { return universal; }, {
  get(_target, property) {
    if (property === 'then') return undefined;
    if (property === Symbol.iterator) return function* () {};
    return universal;
  },
  construct() {
    return universal;
  },
});
${named}${defaultExport}
`,
        'utf8',
      );
    }
    writeFileSync(
      join(packageDirectory, 'package.json'),
      JSON.stringify({ name, type: 'module', exports }, null, 2),
      'utf8',
    );
  }
};

/** 创建只含被测发布产物与静态外部替身的隔离 consumer */
const createConsumer = (
  packageRoot: string,
  packageName: string,
  includeInspect: boolean,
): Readonly<{ root: string; imports: ReadonlyArray<RuntimeImport> }> => {
  const root = mkdtempSync(join(tmpdir(), 'retikz-layout-consumer-'));
  const nodeModules = join(root, 'node_modules');
  const targetDirectory = join(nodeModules, ...packageName.split('/'));
  const dist = join(packageRoot, 'dist');
  mkdirSync(targetDirectory, { recursive: true });
  cpSync(dist, join(targetDirectory, 'dist'), {
    recursive: true,
    filter: source => !source.includes(`${join('dist', 'types')}`),
  });
  writeFileSync(
    join(targetDirectory, 'package.json'),
    JSON.stringify(
      {
        name: packageName,
        type: 'module',
        exports: {
          '.': './dist/index.js',
          './inspect': './dist/inspect/index.js',
        },
      },
      null,
      2,
    ),
    'utf8',
  );
  writeFileSync(join(root, 'package.json'), JSON.stringify({ private: true, type: 'module' }), 'utf8');
  const imports = collectRuntimeImports(dist);
  writeExternalStubs(nodeModules, imports, packageName, includeInspect);
  return { root, imports };
};

/** 在隔离 consumer 中执行一次模块导入 */
const runImport = (root: string, specifier: string, call: string): IsolatedImportResult => {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', `const imported = await import('${specifier}'); ${call}`],
    { cwd: root, encoding: 'utf8' },
  );
  return Object.freeze({
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  });
};

/** 验证根入口、缺失 peer 的 Inspect 入口和安装 peer 后的 Inspect 入口 */
export const runLayoutPackageBoundary = (
  packageRoot: string,
  packageName: string,
  call: string,
): LayoutPackageBoundaryResult => {
  const dist = join(packageRoot, 'dist');
  if (!existsSync(join(dist, 'index.js')) || !existsSync(join(dist, 'inspect', 'index.js'))) {
    throw new Error(`${packageName} package-boundary test requires build output`);
  }

  const withoutPeer = createConsumer(packageRoot, packageName, false);
  const withPeer = createConsumer(packageRoot, packageName, true);
  try {
    return Object.freeze({
      rootWithoutPeer: runImport(withoutPeer.root, packageName, ''),
      inspectWithoutPeer: runImport(withoutPeer.root, `${packageName}/inspect`, ''),
      inspectWithPeer: runImport(withPeer.root, `${packageName}/inspect`, call),
    });
  } finally {
    rmSync(withoutPeer.root, { recursive: true, force: true });
    rmSync(withPeer.root, { recursive: true, force: true });
  }
};
