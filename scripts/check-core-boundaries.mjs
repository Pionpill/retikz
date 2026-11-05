import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const coreSourcePath = 'packages/kernel/core/src/';

const allowedLayers = {
  shared: new Set(['shared']),
  schemas: new Set(['shared', 'schemas']),
  contract: new Set(['shared', 'schemas', 'contract']),
  providers: new Set(['shared', 'schemas', 'contract', 'providers']),
  resolve: new Set(['shared', 'schemas', 'contract', 'providers', 'resolve']),
  compile: new Set(['shared', 'schemas', 'contract', 'providers', 'resolve', 'compile']),
  parse: new Set(['shared', 'schemas', 'parse']),
};

const allowedExternalModules = new Set(['@retikz/foundation', '@retikz/math', 'zod']);

const normalizePath = filePath => path.posix.normalize(filePath.replaceAll('\\', '/'));

/** 构造仅用于作用域绑定的内存程序，不读取依赖、不执行类型检查 */
const createSourceProgram = sources => {
  const options = { noLib: true, noResolve: true, target: ts.ScriptTarget.Latest };
  const host = ts.createCompilerHost(options);
  host.getSourceFile = fileName => sources.get(normalizePath(fileName));
  host.fileExists = fileName => sources.has(normalizePath(fileName));
  host.readFile = fileName => sources.get(normalizePath(fileName))?.text;
  host.getCurrentDirectory = () => '';
  return ts.createProgram([...sources.keys()], options, host);
};

/** 统一 schema owner，其余稳定二级 owner 由已有 barrel 确定 */
const ownerOf = (filePath, sources) => {
  const [layer, domain, ...parts] = filePath.split('/');
  if (layer === 'schemas') return layer;
  return parts.length > 0 && sources.has(`${layer}/${domain}/index.ts`) ? `${layer}/${domain}` : layer;
};

const resolveTarget = (filePath, specifier, sources) => {
  const target = normalizePath(path.posix.join(path.posix.dirname(filePath), specifier));
  return [target, `${target}.ts`, `${target}/index.ts`, target.replace(/\.js$/, '.ts')].find(candidate =>
    sources.has(candidate),
  );
};

/** 读取实际成员访问，注释与字符串不参与匹配 */
const memberPathOf = node => {
  if (ts.isIdentifier(node)) return { root: node, members: [node.text] };
  if (ts.isParenthesizedExpression(node)) return memberPathOf(node.expression);
  if (ts.isPropertyAccessExpression(node)) {
    const parent = memberPathOf(node.expression);
    return parent && { root: parent.root, members: [...parent.members, node.name.text] };
  }
  if (ts.isElementAccessExpression(node) && node.argumentExpression && ts.isStringLiteral(node.argumentExpression)) {
    const parent = memberPathOf(node.expression);
    return parent && { root: parent.root, members: [...parent.members, node.argumentExpression.text] };
  }
  return undefined;
};

/** 检查 Core 的实际模块依赖与直接非确定性调用，返回具名规则和源码位置 */
export const collectCoreBoundaryDiagnostics = files => {
  const sources = new Map(
    files.map(({ filePath, content }) => {
      const normalized = normalizePath(filePath);
      return [normalized, ts.createSourceFile(normalized, content, ts.ScriptTarget.Latest, true)];
    }),
  );
  const checker = createSourceProgram(sources).getTypeChecker();
  const diagnostics = [];

  for (const [filePath, source] of sources) {
    const layer = filePath.split('/')[0];
    const report = (node, rule, message) => {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source));
      diagnostics.push({ filePath, line: position.line + 1, column: position.character + 1, rule, message });
    };
    const inspectImport = literal => {
      if (!literal || !ts.isStringLiteralLike(literal)) return;
      const specifier = literal.text;
      if (!specifier.startsWith('.')) {
        if (!allowedExternalModules.has(specifier))
          report(literal, 'external-dependency', `Core cannot depend on '${specifier}'.`);
        return;
      }
      if (normalizePath(path.posix.join(path.posix.dirname(filePath), specifier)).startsWith('../')) {
        report(literal, 'external-dependency', 'Core cannot import source outside its package.');
        return;
      }
      const target = resolveTarget(filePath, specifier, sources);
      if (target === undefined) return; // 缺失模块由 tsc 诊断
      if (target === 'error.ts') return; // 各层共享的包级错误边界
      const targetLayer = target.split('/')[0];
      if (allowedLayers[layer] && !allowedLayers[layer].has(targetLayer)) {
        report(literal, 'layer-dependency', `${layer} cannot depend on ${targetLayer}.`);
      }
      const targetOwner = ownerOf(target, sources);
      const isLayerLocalModule = layer === targetLayer && targetOwner === targetLayer;
      if (
        !isLayerLocalModule &&
        ownerOf(filePath, sources) !== targetOwner &&
        target !== `${targetOwner}/index.ts` &&
        target !== `${targetLayer}/index.ts`
      ) {
        report(literal, 'owner-barrel', `Import '${target}' through '${targetOwner}/index.ts'.`);
      }
    };
    const inspectCall = node => {
      const access = memberPathOf(node.expression);
      if (!access || checker.getSymbolAtLocation(access.root)?.declarations?.length) return;
      const members = access.members[0] === 'globalThis' ? access.members.slice(1) : access.members;
      const name = members.join('.');
      const readsClock = ts.isNewExpression(node) && name === 'Date' && !node.arguments?.length;
      if (
        readsClock ||
        (ts.isCallExpression(node) && ['Date.now', 'Date', 'Math.random', 'performance.now'].includes(name))
      ) {
        report(node, 'nondeterministic-call', `Core must receive time or randomness explicitly; found ${name}.`);
      }
    };
    const visit = node => {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) inspectImport(node.moduleSpecifier);
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) inspectImport(node.argument.literal);
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword)
        inspectImport(node.arguments[0]);
      if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference))
        inspectImport(node.moduleReference.expression);
      if (ts.isCallExpression(node) || ts.isNewExpression(node)) inspectCall(node);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return diagnostics;
};

/** 检查当前工作区的 Core 源码，不扫描生成物或第三方依赖 */
export const runCoreBoundaryCheck = ({ cwd = process.cwd() } = {}) => {
  const paths = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', coreSourcePath], {
    cwd,
    encoding: 'utf8',
  })
    .split(/\r?\n/)
    .filter(file => file.endsWith('.ts'));
  const files = [...new Set(paths)].flatMap(file => {
    const absolute = path.resolve(cwd, file);
    try {
      return [{ filePath: file.slice(coreSourcePath.length), content: readFileSync(absolute, 'utf8') }];
    } catch (error) {
      if (error.code === 'ENOENT') return []; // 工作区已删除的 tracked 文件
      throw error;
    }
  });
  const diagnostics = collectCoreBoundaryDiagnostics(files);
  for (const diagnostic of diagnostics) {
    console.error(
      `${coreSourcePath}${diagnostic.filePath}:${diagnostic.line}:${diagnostic.column}: ${diagnostic.rule}: ${diagnostic.message}`,
    );
  }
  if (diagnostics.length === 0) console.log(`Core boundaries are valid across ${files.length} source files.`);
  return diagnostics.length === 0 ? 0 : 1;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = runCoreBoundaryCheck();
}
