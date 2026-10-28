import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

const SRC_ROOT = join(process.cwd(), 'src');

const tsFiles = (dir: string): Array<string> => {
  const entries = readdirSync(dir);
  const files: Array<string> = [];

  for (const entry of entries) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...tsFiles(path));
    } else if (entry.endsWith('.ts')) {
      files.push(path);
    }
  }

  return files;
};

const importDeclarations = (file: string): Array<string> =>
  Array.from(
    readFileSync(file, 'utf8').matchAll(/(?:import|export)\s+(?:type\s+)?[\s\S]*?\s+from\s+['"][^'"]+['"];?/gu),
    match => match[0],
  );

const importSource = (declaration: string): string | undefined => declaration.match(/\sfrom\s+['"]([^'"]+)['"]/)?.[1];

type OwnerRef = {
  root: string;
  rootPath: string;
};

const ownerRef = (file: string): OwnerRef | undefined => {
  const relativePath = relative(SRC_ROOT, file).replace(/\\/g, '/');
  const parts = relativePath.split('/');
  if (parts.length < 3) return undefined;

  const [layer, owner] = parts;
  if (layer === 'schemas') return { root: 'schemas', rootPath: join(SRC_ROOT, 'schemas') };
  if (owner.endsWith('.ts')) return undefined;

  const rootPath = join(SRC_ROOT, layer, owner);
  if (!existsSync(join(rootPath, 'index.ts'))) return undefined;

  return { root: `${layer}/${owner}`, rootPath };
};

const resolveImportTarget = (file: string, source: string): string => {
  const target = join(dirname(file), source);
  if (existsSync(target) && statSync(target).isDirectory()) return join(target, 'index.ts');
  if (existsSync(`${target}.ts`)) return `${target}.ts`;
  if (existsSync(join(target, 'index.ts'))) return join(target, 'index.ts');

  return target;
};

const importsFromSchemaSubmodule = (file: string, declaration: string): boolean => {
  const source = importSource(declaration);
  if (!source?.startsWith('.')) return false;

  const schemaRoot = join(SRC_ROOT, 'schemas');
  const target = join(dirname(file), source);

  return target.startsWith(`${schemaRoot}${sep}`);
};

const importsFromContractSubmodule = (file: string, declaration: string): boolean => {
  const source = importSource(declaration);
  if (!source?.startsWith('.')) return false;

  const relativePath = relative(SRC_ROOT, file).replace(/\\/g, '/');
  if (relativePath.startsWith('contract/')) return false;

  const target = resolveImportTarget(file, source);
  const contractRoot = join(SRC_ROOT, 'contract');
  const targetOwner = ownerRef(target);

  return (
    target.startsWith(`${contractRoot}${sep}`) &&
    target !== join(contractRoot, 'index.ts') &&
    target !== (targetOwner === undefined ? undefined : join(targetOwner.rootPath, 'index.ts'))
  );
};

const importsFlatProviderInternal = (file: string, declaration: string): boolean => {
  const source = importSource(declaration);
  if (!source?.startsWith('.')) return false;

  const relativeSource = relative(SRC_ROOT, file).replace(/\\/g, '/');
  if (relativeSource.startsWith('providers/')) return false;

  const relativeTarget = relative(SRC_ROOT, resolveImportTarget(file, source)).replace(/\\/g, '/');

  return relativeTarget !== 'providers/index.ts' && /^providers\/[^/]+\.ts$/u.test(relativeTarget);
};

const importsCrossOwnerSubmodule = (file: string, declaration: string): boolean => {
  const source = importSource(declaration);
  if (!source?.startsWith('.')) return false;

  const sourceOwner = ownerRef(file);
  const target = resolveImportTarget(file, source);
  const targetOwner = ownerRef(target);
  if (sourceOwner === undefined || targetOwner === undefined) return false;
  if (sourceOwner.root === targetOwner.root) return false;

  return target !== join(targetOwner.rootPath, 'index.ts');
};

describe('核心层导入边界', () => {
  it('shared 代码不向上依赖 schemas、contract、providers、primitive 或 compile', () => {
    const offenders = tsFiles(join(SRC_ROOT, 'shared')).flatMap(file =>
      importDeclarations(file)
        .filter(line => /from ['"].*(schemas|contract|providers|primitive|compile)/.test(line))
        .map(line => `${relative(SRC_ROOT, file)}: ${line}`),
    );

    expect(offenders).toEqual([]);
  });

  it('schemas 以外的源码通过所属模块聚合入口导入 schemas', () => {
    const offenders = tsFiles(SRC_ROOT)
      .filter(file => !relative(SRC_ROOT, file).replace(/\\/g, '/').startsWith('schemas/'))
      .flatMap(file =>
        importDeclarations(file)
          .filter(line => importsFromSchemaSubmodule(file, line))
          .map(line => `${relative(SRC_ROOT, file)}: ${line}`),
      );

    expect(offenders).toEqual([]);
  });

  it('contract 以外的源码通过根入口或能力所属模块聚合入口导入', () => {
    const offenders = tsFiles(SRC_ROOT).flatMap(file =>
      importDeclarations(file)
        .filter(line => importsFromContractSubmodule(file, line))
        .map(line => `${relative(SRC_ROOT, file)}: ${line}`),
    );

    expect(offenders).toEqual([]);
  });

  it('providers 以外的源码不直接导入扁平提供者内部实现', () => {
    const offenders = tsFiles(SRC_ROOT).flatMap(file =>
      importDeclarations(file)
        .filter(line => importsFlatProviderInternal(file, line))
        .map(line => `${relative(SRC_ROOT, file)}: ${line}`),
    );

    expect(offenders).toEqual([]);
  });

  it('跨所属模块导入经过目标所属模块聚合入口', () => {
    const offenders = tsFiles(SRC_ROOT).flatMap(file =>
      importDeclarations(file)
        .filter(line => importsCrossOwnerSubmodule(file, line))
        .map(line => `${relative(SRC_ROOT, file)}: ${line}`),
    );

    expect(offenders).toEqual([]);
  });

  it('场景契约重用共享词汇表的 schema 字段级类型', () => {
    const sceneRoot = join(SRC_ROOT, 'contract', 'scene');
    const forbiddenPatterns = [
      { label: 'position tuple', pattern: /\[number,\s*number\]/u },
      { label: 'clip fill rule union', pattern: /'nonzero'\s*\|\s*'evenodd'/u },
      { label: 'path line cap union', pattern: /'butt'\s*\|\s*'round'\s*\|\s*'square'/u },
      { label: 'path line join union', pattern: /'miter'\s*\|\s*'round'\s*\|\s*'bevel'/u },
      { label: 'font style union', pattern: /'normal'\s*\|\s*'italic'\s*\|\s*'oblique'/u },
      { label: 'font weight primitive union', pattern: /fontWeight\??:\s*string\s*\|\s*number/u },
      { label: 'font family primitive', pattern: /fontFamily\??:\s*string/u },
    ];

    const offenders = tsFiles(sceneRoot).flatMap(file => {
      const source = readFileSync(file, 'utf8');
      return forbiddenPatterns
        .filter(({ pattern }) => pattern.test(source))
        .map(({ label }) => `${relative(SRC_ROOT, file)}: ${label}`);
    });

    expect(offenders).toEqual([]);
  });

  it('场景契约不会将整个 IRScene 分支重命名为 Scene 拥有的类型', () => {
    const sceneRoot = join(SRC_ROOT, 'contract', 'scene');
    const forbiddenPatterns = [
      { label: 'direct IRScene branch alias', pattern: /export type \w+ = IR\w+/u },
      { label: 'extracted IRScene branch alias', pattern: /export type \w+ = Extract<IR\w+/u },
      { label: 'omitted IRScene branch alias', pattern: /export type \w+ = Omit<IR\w+/u },
    ];

    const offenders = tsFiles(sceneRoot).flatMap(file => {
      const source = readFileSync(file, 'utf8');
      return forbiddenPatterns
        .filter(({ pattern }) => pattern.test(source))
        .map(({ label }) => `${relative(SRC_ROOT, file)}: ${label}`);
    });

    expect(offenders).toEqual([]);
  });

  it('编译代码不导入提供者形状内部结构', () => {
    const offenders = tsFiles(join(SRC_ROOT, 'compile')).flatMap(file =>
      importDeclarations(file)
        .filter(line => /from ['"].*providers\/shape\//.test(line.replace(/\\/g, '/')))
        .map(line => `${relative(SRC_ROOT, file)}: ${line}`),
    );

    expect(offenders).toEqual([]);
  });

  it('规范锚点的消费方不重新引入别名或 normalize 辅助函数', () => {
    const scannedRoots = ['shared', 'schemas', 'contract', 'providers', 'compile'].map(root => join(SRC_ROOT, root));
    const forbiddenPatterns = [/\b(?:Compass|Tikz|Web)(?:Anchor|Side|Corner)\w*\b/u, /\bnormalize(?:Anchor|Side)\b/u];

    const offenders = scannedRoots.flatMap(root =>
      tsFiles(root).flatMap(file => {
        const source = readFileSync(file, 'utf8');
        return forbiddenPatterns
          .filter(pattern => pattern.test(source))
          .map(pattern => `${relative(SRC_ROOT, file)}: ${pattern.source}`);
      }),
    );

    expect(offenders).toEqual([]);
  });

  it('编译可达的核心代码不使用时间或模块级提供者几何缓存', () => {
    const timeOrSharedCacheOffenders = tsFiles(SRC_ROOT).flatMap(file => {
      const relativePath = relative(SRC_ROOT, file).replace(/\\/g, '/');
      const source = readFileSync(file, 'utf8');

      return [
        ...(source.includes('Date.now(') ? [`${relativePath}: Date.now`] : []),
        ...(source.includes('createCache') ? [`${relativePath}: createCache`] : []),
      ];
    });

    const providerCacheOffenders = tsFiles(join(SRC_ROOT, 'providers', 'shape')).flatMap(file => {
      const relativePath = relative(SRC_ROOT, file).replace(/\\/g, '/');
      const source = readFileSync(file, 'utf8');

      return /const\s+\w+Cache\s*=\s*new\s+(?:Weak)?Map/u.test(source)
        ? [`${relativePath}: module-level Map cache`]
        : [];
    });

    expect([...timeOrSharedCacheOffenders, ...providerCacheOffenders]).toEqual([]);
  });
});
