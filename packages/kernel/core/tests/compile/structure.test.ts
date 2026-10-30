import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import * as compile from '../../src/compile';

const here = dirname(fileURLToPath(import.meta.url));

const root = resolve(here, '../..');

const source = (path: string): string => readFileSync(resolve(root, path), 'utf8');

describe('编译源结构', () => {
  it('编译聚合入口仅公开稳定的运行时条目', () => {
    expect(Object.keys(compile).sort()).toEqual([
      'BuiltinCompileWarningCode',
      'CompileProvenanceTracker',
      'assembleCompileOutputs',
      'assembleSceneCompilationSnapshot',
      'assembleScopeOutput',
      'compileCoordinate',
      'compileNode',
      'compilePath',
      'compileSceneSnapshot',
      'compileScope',
      'compileToScene',
      'computeCompileOutputBounds',
      'computeLayout',
      'createCompileChildPath',
      'createDuplicateCompileWarning',
      'createSharedCompileContext',
      'fallbackMeasurer',
      'formatCompileOccurrence',
      'formatCompileWarning',
      'prepareScopeCompilation',
      'projectCompileReference',
      'projectPublishedCompileLayout',
      'projectScopeCompileLayouts',
      'resolveScopeContext',
      'samplePathRoute',
    ]);
  });

  it('节点解析不受编译依赖关系的影响', () => {
    for (const path of ['src/resolve/node/shape.ts', 'src/resolve/node/boundary.ts']) {
      expect(source(path)).not.toContain('/compile/');
    }
  });
});
