import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const source = (path: string): string => readFileSync(resolve(root, path), 'utf8');

const sourceFiles = (directory: string): Array<string> => {
  const entries = readdirSync(resolve(root, directory), { withFileTypes: true });
  return entries.flatMap(entry => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.isFile() && path.endsWith('.ts') ? [path] : [];
  });
};

describe('resolve source structure', () => {
  it('introduces the resolve owner and removes obsolete stage owners', () => {
    expect(existsSync(resolve(root, 'src/resolve/index.ts'))).toBe(true);
    expect(existsSync(resolve(root, 'src/normalize/index.ts'))).toBe(false);
    expect(existsSync(resolve(root, 'src/compile/style/index.ts'))).toBe(false);
  });

  it('keeps builtin path emitters resolution-only', () => {
    const stroke = source('src/compile/path/stroke/emit.ts');
    expect(stroke).not.toContain('normalizePath(');
    expect(stroke).not.toContain('resolvePathValue');
    expect(stroke).not.toContain('resolvePath(');
    expect(stroke).not.toMatch(/import\s+\{[^}]*\bresolvePath\b[^}]*\}\s+from/u);
    expect(stroke).not.toContain('IRPathBase');
    expect(stroke).not.toContain('resolution?:');
    expect(stroke).not.toContain('emitResolvedPathPrimitive');
    expect(stroke).toMatch(/export const emitPathPrimitive = \(\s*resolution:\s*StrokePathResolution/u);
  });

  it('keeps node layout free of provider lookup orchestration', () => {
    const text = source('src/compile/node/layout.ts');
    expect(text).not.toContain('providerDefinitionOf(');
    expect(text).not.toContain('resolveShapeRegistry(');
  });

  it('keeps all path compile files free of direct provider lookups', () => {
    const offenders = sourceFiles('src/compile/path')
      .filter(path => /providerDefinitionOf\(|resolve[A-Z][A-Za-z]*Registry\s*\(/u.test(source(path)))
      .map(path => relative(root, resolve(root, path)).replace(/\\/gu, '/'));

    expect(offenders).toEqual([]);
  });

  it('keeps position resolve independent from compile orchestration', () => {
    const offenders = sourceFiles('src/resolve/position')
      .filter(path => /from\s+['"][^'"]*compile|NamespaceStack|CompileContext|TraversalFrame/u.test(source(path)))
      .map(path => relative(root, resolve(root, path)).replace(/\\/gu, '/'));

    expect(offenders).toEqual([]);
    expect(source('src/resolve/index.ts')).not.toContain("export * from './position';");
  });

  it('keeps composite provider binding in resolve', () => {
    expect(source('src/resolve/index.ts')).toContain("export * from './composite';");

    const lower = source('src/compile/orchestration/composite.ts');
    const traversal = source('src/compile/orchestration/traversal.ts');
    expect(lower).not.toContain('parseProviderPayload');
    expect(lower).not.toContain('registry.get(');
    expect(traversal).not.toContain('parseProviderPayload');
    expect(traversal).not.toContain('runtime.context.composites.get(');
  });

  it('keeps text Source IR determination in resolve', () => {
    expect(source('src/resolve/index.ts')).toContain("export * from './text';");

    const compileText = sourceFiles('src/compile/text').map(source).join('\n');
    const nodeLayout = [
      source('src/compile/node/layout.ts'),
      source('src/compile/node/content/layout.ts'),
      source('src/compile/node/label/layout.ts'),
    ].join('\n');
    const pathLabel = source('src/compile/path/host/label.ts');
    expect(compileText).not.toContain('parseInlineRuns');
    expect(compileText).not.toContain('resolveFontSize');
    expect(nodeLayout).not.toContain('resolveLineRunsWithWarning');
    expect(nodeLayout).not.toContain('resolveFontSize');
    expect(pathLabel).not.toContain('resolveLineRunsWithWarning');
    expect(pathLabel).not.toContain('resolveFontSize');
  });

  it('keeps Scope translate Source IR determination in position resolve', () => {
    const scope = source('src/compile/scope.ts');
    expect(scope).toContain('resolveTransformTranslation');
    expect(scope).not.toContain('resolvePosition(');
    expect(scope).not.toContain('IRAtPosition');
    expect(scope).not.toContain('IRBetweenPosition');
    expect(scope).not.toContain('IROffsetPosition');
    expect(scope).not.toContain('PolarPosition');
  });
});
