import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
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
    const ribbon = source('src/compile/path/ribbon/emit.ts');
    for (const text of [stroke, ribbon]) {
      expect(text).not.toContain('normalizePath(');
      expect(text).not.toContain('resolvePathValue');
      expect(text).not.toContain('resolvePath(');
      expect(text).not.toMatch(/import\s+\{[^}]*\bresolvePath\b[^}]*\}\s+from/u);
      expect(text).not.toContain('IRPathBase');
      expect(text).not.toContain('resolution?:');
      expect(text).not.toContain('emitResolvedPathPrimitive');
    }
    expect(stroke).toMatch(/export const emitPathPrimitive = \(\s*resolution:\s*PathResolution/u);
    expect(ribbon).toMatch(/export const emitRibbonPrimitive = \(\s*resolution:\s*PathResolution/u);
  });

  it('keeps node layout free of provider lookup orchestration', () => {
    const text = source('src/compile/node/layout.ts');
    expect(text).not.toContain('providerDefinitionOf(');
    expect(text).not.toContain('resolveShapeRegistry(');
  });

  it('keeps path lower, layout, and emit files free of direct provider lookups', () => {
    const offenders = sourceFiles('src/compile/path')
      .filter(path => /(?:lower|layout|emit)\.ts$/u.test(basename(path)))
      .filter(path => source(path).includes('providerDefinitionOf('))
      .map(path => relative(root, resolve(root, path)).replace(/\\/gu, '/'));

    expect(offenders).toEqual(['src/compile/path/stroke/lower.ts']);
  });
});
