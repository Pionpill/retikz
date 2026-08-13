import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readContent = (relativePath: string, lang: 'zh' | 'en') =>
  readFileSync(resolve(process.cwd(), `src/modules/docs/contents/${relativePath}/index.${lang}.mdx`), 'utf8');

describe('qualified spatial handle documentation', () => {
  it.each(['zh', 'en'] as const)('%s explains structured declarations and world-space qualification', lang => {
    const concept = readContent('kernel/concepts/design/composite', lang);

    expect(concept).toContain('spatialHandles');
    expect(concept).toContain('CompileResult.spatialHandles');
    expect(concept).toContain('ownerPath');
    expect(concept).toContain('lowerIRToKernel()');
    expect(concept).toContain('compileToScene()');
  });

  it.each(['zh', 'en'] as const)('%s documents query semantics, adapter exits, and renderer isolation', lang => {
    const compile = readContent('kernel/reference/runtime/compile', lang);

    for (const contract of [
      'SpatialHandleIndex',
      'QualifiedSpatialHandle',
      'selectSpatialHandles',
      'resolveSpatialHandle',
      'originOccurrence',
      'finalOccurrence',
      'onCompileResult',
      'SceneResult.compileResult',
    ]) {
      expect(compile).toContain(contract);
    }
    expect(compile).toContain('SVG');
    expect(compile).toContain('Canvas');
    expect(compile).toContain('SSR');
  });
});
