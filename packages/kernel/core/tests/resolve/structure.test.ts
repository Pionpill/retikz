import { readdirSync, readFileSync } from 'node:fs';
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

describe('解析源结构', () => {
  it('仅保持内置路径发射器解析结果', () => {
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

  it('使节点布局不受提供者查找编排的影响', () => {
    const text = source('src/compile/node/layout.ts');

    expect(text).not.toContain('providerDefinitionOf(');
    expect(text).not.toContain('resolveShapeRegistry(');
  });

  it('使所有路径编译文件免于直接提供者查找', () => {
    const offenders = sourceFiles('src/compile/path')
      .filter(path => /providerDefinitionOf\(|resolve[A-Z][A-Za-z]*Registry\s*\(/u.test(source(path)))
      .map(path => relative(root, resolve(root, path)).replace(/\\/gu, '/'));

    expect(offenders).toEqual([]);
  });

  it('保持位置解析独立于编译编排', () => {
    const offenders = sourceFiles('src/resolve/position')
      .filter(path => /from\s+['"][^'"]*compile|NamespaceStack|CompileContext|TraversalFrame/u.test(source(path)))
      .map(path => relative(root, resolve(root, path)).replace(/\\/gu, '/'));

    expect(offenders).toEqual([]);
    expect(source('src/resolve/index.ts')).not.toContain("export * from './position';");
  });

  it('在解析中保持复合提供者绑定', () => {
    expect(source('src/resolve/index.ts')).toContain("export * from './composite';");

    const lower = source('src/compile/orchestration/composite-output.ts');
    const traversal = source('src/compile/orchestration/traversal.ts');

    expect(lower).not.toContain('parseProviderPayload');
    expect(lower).not.toContain('registry.get(');
    expect(traversal).not.toContain('parseProviderPayload');
    expect(traversal).not.toContain('runtime.context.composites.get(');
  });

  it('在解析中保留文本 Source IR 确定', () => {
    expect(source('src/resolve/index.ts')).toContain("export * from './text';");

    const compileText = sourceFiles('src/compile/text').map(source).join('\n');
    const nodeLayout = [
      source('src/compile/node/layout.ts'),
      source('src/compile/node/content/layout.ts'),
      source('src/compile/node/label/layout.ts'),
    ].join('\n');
    const pathLabel = source('src/compile/path/host/label.ts');

    expect(compileText).not.toContain('parseInlineSegments');
    expect(compileText).not.toContain('resolveFontSize');
    expect(nodeLayout).not.toContain('resolveLineRunsWithWarning');
    expect(nodeLayout).not.toContain('resolveFontSize');
    expect(pathLabel).not.toContain('resolveLineRunsWithWarning');
    expect(pathLabel).not.toContain('resolveFontSize');
  });

  it('在位置解析中保持 Scope 平移 Source IR 确定', () => {
    const scope = source('src/compile/scope/layout.ts');

    expect(scope).toContain('resolveTransformTranslation');
    expect(scope).not.toContain('resolvePosition(');
    expect(scope).not.toContain('IRAtPosition');
    expect(scope).not.toContain('IRBetweenPosition');
    expect(scope).not.toContain('IROffsetPosition');
    expect(scope).not.toContain('PolarPosition');
  });
});
