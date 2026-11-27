import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

/** 可审阅包的源码入口 */
interface PackageScope {
  name: string;
  directory: string;
  /** package.json 的原始 exports，在读取边界解析 */
  exports?: unknown;
}

/** 显式公开入口，不以源码目录或通配符猜测公共面 */
interface PublicEntry {
  package: string;
  subpath: string;
  file: string;
}

/** 当前静态入口枚举无法覆盖的公开映射 */
interface UnclassifiedExport {
  package: string;
  subpath: string;
  reason: string;
}

/** 源码中的一处位置 */
interface Location {
  file: string;
  line: number;
  column: number;
}

/** 符号的证据记录；零引用不是删除结论 */
interface Member {
  id: string;
  name: string;
  kind: string;
  package: string;
  declaration: Location;
  references: Array<Location>;
  selfReferences: Array<Location>;
  forwarding: Array<Location>;
}

/** 内存源码或仓库源码的统一分析输入 */
interface AnalysisInput {
  root: string;
  packages: Array<PackageScope>;
  selected: Array<string>;
  sources: Record<string, string>;
  compilerOptions?: ts.CompilerOptions;
}

const slash = (value: string) => value.replaceAll('\\', '/');
const excludedDirectories = new Set([
  'tests',
  'test',
  '__tests__',
  '__mocks__',
  'evals',
  'eval',
  'benchmarks',
  'benchmark',
  'bench',
  'docs',
  'node_modules',
  'dist',
  'coverage',
  '_notes',
]);
const isExcluded = (file: string) =>
  slash(file)
    .split('/')
    .some(part => excludedDirectories.has(part)) || /\.(?:test|spec|bench|benchmark|eval)\.[cm]?[jt]sx?$/.test(file);
const isSource = (file: string) => /\.[cm]?tsx?$/.test(file) && !/\.d\.[cm]?ts$/.test(file);

/** 解析外部 package.json exports，条件分支合并枚举并去重，不展开通配符 */
const collectPublicEntries = (packages: Array<PackageScope>) => {
  const entries: Array<PublicEntry> = [];
  const unclassified: Array<UnclassifiedExport> = [];
  for (const pkg of packages) {
    const report = (subpath: string, reason: string) => unclassified.push({ package: pkg.name, subpath, reason });
    const visit = (subpath: string, value: unknown): void => {
      if (value === null) return;
      if (subpath.includes('*')) {
        report(subpath, '通配符公开映射需人工确定稳定入口');
      } else if (typeof value === 'string') {
        const file = path.posix.normalize(`${pkg.directory}/${value}`);
        if (
          !value.startsWith('./') ||
          !file.startsWith(`${pkg.directory}/`) ||
          value.includes('*') ||
          !isSource(file)
        ) {
          report(subpath, `非明确包内 TypeScript 源码入口：${value}`);
        } else if (
          !entries.some(entry => entry.package === pkg.name && entry.subpath === subpath && entry.file === file)
        ) {
          entries.push({ package: pkg.name, subpath, file });
        }
      } else if (Array.isArray(value)) {
        for (const target of value) visit(subpath, target);
      } else if (typeof value === 'object') {
        for (const [condition, target] of Object.entries(value)) {
          if (condition.startsWith('.')) report(subpath, '条件对象内嵌子路径映射，需人工检查');
          else visit(subpath, target);
        }
      } else report(subpath, '未声明或无法识别的 exports 映射，不能推断根入口');
    };
    const mapping = pkg.exports;
    if (
      typeof mapping === 'object' &&
      mapping !== null &&
      !Array.isArray(mapping) &&
      Object.keys(mapping).some(key => key.startsWith('.'))
    ) {
      for (const [subpath, target] of Object.entries(mapping)) {
        if (subpath === '.' || subpath.startsWith('./')) visit(subpath, target);
        else report(subpath, 'exports 混合条件与子路径，需人工检查');
      }
    } else visit('.', mapping);
  }
  return { entries, unclassified };
};

/** 只收集可具名的声明，不把参数、泛型参数或 import binding 当独立成员 */
const declarationKind = (node: ts.Node): string | undefined => {
  if (ts.isVariableDeclaration(node) || ts.isBindingElement(node)) return 'variable';
  if (ts.isFunctionDeclaration(node)) return 'function';
  if (ts.isClassDeclaration(node)) return 'class';
  if (ts.isInterfaceDeclaration(node)) return 'interface';
  if (ts.isTypeAliasDeclaration(node)) return 'type';
  if (ts.isEnumDeclaration(node)) return 'enum';
  if (ts.isEnumMember(node)) return 'enum-member';
  if (ts.isModuleDeclaration(node)) return 'namespace';
  if (ts.isMethodDeclaration(node) || ts.isMethodSignature(node)) return 'method';
  if (
    ts.isPropertyDeclaration(node) ||
    ts.isPropertySignature(node) ||
    ts.isPropertyAssignment(node) ||
    ts.isShorthandPropertyAssignment(node)
  )
    return 'property';
  if (ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) return 'accessor';
  return undefined;
};

/** 使用符号身份统计引用，生产消费者范围独立于报告包范围 */
export const analyzeMemberUsage = (input: AnalysisInput) => {
  const absolute = (file: string) => slash(path.resolve(input.root, file));
  const relative = (file: string) => slash(path.relative(input.root, file));
  const sources = new Map(Object.entries(input.sources).map(([file, content]) => [absolute(file), content]));
  const publicSurface = collectPublicEntries(input.packages);
  const entryPaths: Record<string, Array<string>> = {};
  for (const entry of publicSurface.entries) {
    const specifier = entry.subpath === '.' ? entry.package : `${entry.package}/${entry.subpath.slice(2)}`;
    (entryPaths[specifier] ??= []).push(absolute(entry.file));
  }
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    ...input.compilerOptions,
    noEmit: true,
    paths: {
      ...input.compilerOptions?.paths,
      ...entryPaths,
    },
  };
  const host = ts.createCompilerHost(options);
  const originalRead = host.readFile;
  const originalExists = host.fileExists;
  const originalDirectoryExists = host.directoryExists;
  const directories = new Set<string>();
  for (const file of sources.keys()) {
    let directory = path.dirname(file);
    while (!directories.has(slash(directory))) {
      directories.add(slash(directory));
      const parent = path.dirname(directory);
      if (parent === directory) break;
      directory = parent;
    }
  }
  host.readFile = file => sources.get(slash(file)) ?? originalRead(file);
  host.fileExists = file => sources.has(slash(file)) || originalExists(file);
  host.directoryExists = directory =>
    directories.has(slash(directory)) || Boolean(originalDirectoryExists?.(directory));
  const rootNames = [...sources.keys()].filter(file => !isExcluded(relative(file)));
  const program = ts.createProgram(rootNames, options, host);
  const checker = program.getTypeChecker();
  const resolveSymbol = (symbol: ts.Symbol | undefined): ts.Symbol | undefined =>
    symbol && (symbol.flags & ts.SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(symbol) : symbol;
  const location = (node: ts.Node): Location => {
    const file = node.getSourceFile();
    const pos = file.getLineAndCharacterOfPosition(node.getStart(file));
    return { file: relative(file.fileName), line: pos.line + 1, column: pos.character + 1 };
  };
  const files = program
    .getSourceFiles()
    .filter(file => sources.has(slash(file.fileName)) && !isExcluded(relative(file.fileName)));
  const records = new Map<ts.Symbol, { member: Member; declarations: Array<ts.Node> }>();
  const declarationNames = new Set<ts.Node>();
  for (const file of files) {
    const pkg = input.packages.find(item => relative(file.fileName).startsWith(`${item.directory}/src/`));
    const visit = (node: ts.Node) => {
      const kind = declarationKind(node);
      if (kind && 'name' in node) {
        const name = (node as ts.NamedDeclaration).name;
        if (
          name &&
          (ts.isIdentifier(name) ||
            ts.isPrivateIdentifier(name) ||
            ts.isStringLiteral(name) ||
            ts.isNumericLiteral(name))
        ) {
          declarationNames.add(name);
          const symbol = resolveSymbol(checker.getSymbolAtLocation(name));
          if (symbol && pkg && input.selected.includes(pkg.name)) {
            const existing = records.get(symbol);
            if (existing) existing.declarations.push(node);
            else {
              const at = location(name);
              records.set(symbol, {
                declarations: [node],
                member: {
                  id: `${at.file}:${at.line}:${at.column}`,
                  name: name.text,
                  kind,
                  package: pkg.name,
                  declaration: at,
                  references: [],
                  selfReferences: [],
                  forwarding: [],
                },
              });
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  const publicExports: Array<{
    package: string;
    name: string;
    entry: string;
    subpath: string;
    target?: string;
    declaration?: Location;
  }> = [];
  const selectedEntries = publicSurface.entries.filter(entry => input.selected.includes(entry.package));
  for (const entry of selectedEntries) {
    const file = program.getSourceFile(absolute(entry.file));
    const moduleSymbol = file && checker.getSymbolAtLocation(file);
    if (!moduleSymbol) continue;
    for (const exported of checker.getExportsOfModule(moduleSymbol)) {
      const symbol = resolveSymbol(exported);
      const declaration = symbol?.declarations?.[0];
      publicExports.push({
        package: entry.package,
        name: exported.name,
        entry: entry.file,
        subpath: entry.subpath,
        target: symbol && records.get(symbol)?.member.id,
        declaration: declaration && location(declaration),
      });
    }
  }
  const unresolvedModules: Array<Location & { specifier: string }> = [];
  const recordReference = (node: ts.Node, symbol: ts.Symbol | undefined, forwarding: boolean) => {
    const resolved = resolveSymbol(symbol);
    const record =
      resolved &&
      (records.get(resolved) ??
        checker
          .getRootSymbols(resolved)
          .map(rootSymbol => records.get(rootSymbol))
          .find(Boolean));
    if (!record) return;
    const self = record.declarations.some(
      declaration =>
        declaration.getSourceFile() === node.getSourceFile() &&
        node.pos >= declaration.pos &&
        node.end <= declaration.end,
    );
    const target = forwarding
      ? record.member.forwarding
      : self
        ? record.member.selfReferences
        : record.member.references;
    const at = location(node);
    if (!target.some(item => item.file === at.file && item.line === at.line && item.column === at.column))
      target.push(at);
  };
  for (const file of files) {
    const visit = (node: ts.Node, forwarding = false) => {
      const isForwarding =
        forwarding ||
        ts.isImportDeclaration(node) ||
        ts.isExportDeclaration(node) ||
        ts.isImportEqualsDeclaration(node) ||
        ts.isExportAssignment(node);
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier) &&
        !checker.getSymbolAtLocation(node.moduleSpecifier)
      ) {
        unresolvedModules.push({ ...location(node.moduleSpecifier), specifier: node.moduleSpecifier.text });
      }
      if (ts.isShorthandPropertyAssignment(node)) {
        recordReference(node.name, checker.getShorthandAssignmentValueSymbol(node), isForwarding);
      } else if (ts.isBindingElement(node) && ts.isObjectBindingPattern(node.parent)) {
        const key = node.propertyName ?? node.name;
        if (ts.isIdentifier(key) || ts.isStringLiteral(key)) {
          recordReference(key, checker.getTypeAtLocation(node.parent).getProperty(key.text), isForwarding);
        }
      }
      if (
        !declarationNames.has(node) &&
        (ts.isIdentifier(node) ||
          ts.isPrivateIdentifier(node) ||
          (ts.isStringLiteral(node) && ts.isElementAccessExpression(node.parent)))
      ) {
        recordReference(node, checker.getSymbolAtLocation(node), isForwarding);
      }
      ts.forEachChild(node, child => visit(child, isForwarding));
    };
    visit(file);
  }
  const members = [...records.values()].map(record => record.member).sort((a, b) => a.id.localeCompare(b.id));
  return {
    selectedPackages: input.selected,
    scannedFiles: files.map(file => relative(file.fileName)).sort(),
    excludedFiles: [...sources.keys()]
      .filter(file => isExcluded(relative(file)))
      .map(relative)
      .sort(),
    excludedDirectories: [...excludedDirectories],
    publicEntries: selectedEntries,
    unclassifiedExports: publicSurface.unclassified.filter(item => input.selected.includes(item.package)),
    missingEntries: [
      ...new Set(
        selectedEntries.filter(entry => !program.getSourceFile(absolute(entry.file))).map(entry => entry.file),
      ),
    ],
    publicExports,
    members,
    unresolvedModules,
    syntaxDiagnostics: program.getSyntacticDiagnostics().map(item => ({
      file: relative(item.file.fileName),
      message: ts.flattenDiagnosticMessageText(item.messageText, '\n'),
    })),
    summary: {
      members: members.length,
      publicExports: publicExports.length,
      zeroReferenceCandidates: members.filter(member => member.references.length === 0).length,
    },
    limitations: [
      '零引用仅为候选，不是删除结论；公开导出及其签名、对象属性、类成员须由 LLM 审阅',
      '统计类型和值的静态引用，不证明可达性；互相引用的死代码仍可能有引用',
      '动态属性、反射、结构类型隐式消费、对象展开及外部用户消费不能完整归因',
      '仅分析已列出的 TypeScript/TSX 源文件；不计声明文件、JS、Vue、生成代码或包外消费者',
      '使用根编译配置和显式 exports 源码映射；包级特殊配置、通配符、构建产物入口及未解析模块须人工复核',
      '公开入口合并枚举所有条件/数组分支，同入口同文件去重；不模拟每个宿主的条件选择或数组回退，引用解析取可解析的首个路径',
      '不执行完整类型检查；存在类型错误、缺失依赖或缺失入口时不能把报告视为完整证据',
    ],
  };
};

/** 显式选择一个包或全部包，避免无参数意外启动全仓扫描 */
export const parseArguments = (args: Array<string>) => {
  const result: { all: boolean; package?: string; output?: string } = { all: false };
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (seen.has(arg)) throw new Error(`重复参数：${arg}`);
    seen.add(arg);
    if (arg === '--all') result.all = true;
    else if (arg === '--package' || arg === '--output') {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error(`${arg} 缺少值`);
      result[arg === '--package' ? 'package' : 'output'] = value;
    } else throw new Error(`未知参数：${arg}`);
  }
  if (result.all === Boolean(result.package)) throw new Error('必须且只能指定 --all 或 --package <包名或目录>');
  return result;
};

/** 按仓库 workspace 布局发现包与生产 app，不跟随符号链接 */
const childDirectories = (directory: string) =>
  existsSync(directory)
    ? readdirSync(directory, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => path.join(directory, entry.name))
    : [];

/** 读取源码；非生产路径在遍历时即排除 */
const readSources = (directory: string, root: string, sources: Record<string, string>) => {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    const relative = slash(path.relative(root, file));
    if (isExcluded(relative)) continue;
    if (entry.isDirectory()) readSources(file, root, sources);
    else if (entry.isFile() && isSource(file)) sources[relative] = readFileSync(file, 'utf8');
  }
};

/** CLI 只写报告，不修改源码，也不自动作出 API 去留决定 */
const main = () => {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') {
    console.log(
      'pnpm review:members --package <包名或目录> | --all [--output notes/reports/member-usage.json]\n单包仍检查全部生产消费者；JSON 写到 stdout 或指定文件；仅在明确授权后用于审计',
    );
    return;
  }
  const parsed = parseArguments(args);
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const packageDirectories = childDirectories(path.join(root, 'packages')).flatMap(childDirectories);
  const packages: Array<PackageScope> = packageDirectories
    .filter(directory => existsSync(path.join(directory, 'package.json')))
    .map(directory => {
      const metadata = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
      return {
        name: String(metadata.name),
        directory: slash(path.relative(root, directory)),
        exports: metadata.exports,
      };
    });
  const selected = parsed.all
    ? packages
    : packages.filter(
        pkg => pkg.name === parsed.package || path.resolve(root, pkg.directory) === path.resolve(parsed.package!),
      );
  if (selected.length === 0) throw new Error(`未找到包：${parsed.package}`);
  const sources: Record<string, string> = {};
  for (const directory of [...packageDirectories, ...childDirectories(path.join(root, 'apps'))])
    readSources(path.join(directory, 'src'), root, sources);
  const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  const compilerConfig = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  if (compilerConfig.errors.length > 0)
    throw new Error(
      compilerConfig.errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('\n'),
    );
  const report = analyzeMemberUsage({
    root,
    packages,
    selected: selected.map(pkg => pkg.name),
    sources,
    compilerOptions: compilerConfig.options,
  });
  const output = `${JSON.stringify(report, null, 2)}\n`;
  if (parsed.output) {
    mkdirSync(path.dirname(path.resolve(parsed.output)), { recursive: true });
    writeFileSync(parsed.output, output, 'utf8');
    console.error(
      `报告已写入 ${parsed.output}；${report.summary.members} 个成员，${report.summary.zeroReferenceCandidates} 个零引用候选（待人工复核）`,
    );
  } else process.stdout.write(output);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
