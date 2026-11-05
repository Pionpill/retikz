import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as compile from '@retikz/core';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

const root = resolve(here, '../../../../core');

const source = (path: string): string => readFileSync(resolve(root, path), 'utf8');

describe('编译源结构', () => {
  it('执行器不重复解析 provider 输入', () => {
    const lower = source('../reconciler/src/compile/tree/composite/output.ts');
    const traversal = source('../reconciler/src/compile/tree/scope/visit.ts');

    expect(lower).not.toContain('parseProviderPayload');
    expect(lower).not.toContain('registry.get(');
    expect(traversal).not.toContain('parseProviderPayload');
    expect(traversal).not.toContain('runtime.context.composites.get(');
  });

  it('编译聚合入口仅公开稳定的运行时条目', () => {
    for (const name of [
      'BuiltinCompileWarningCode',
      'calculateBoundsOfPrimitives',
      'compilePath',
      'compileScope',
      'composeScopeTransform',
      'calculateCompileOutputBounds',
      'calculateLayoutFromBounds',
      'compileCoordinate',
      'createBoundaryStore',
      'createPathTargetResolver',
      'createPositionEvaluateContext',
      'createScopeGroup',
      'emitNodeOutput',
      'emitScopePrimitive',
      'fallbackMeasurer',
      'layoutNode',
      'prepareScopePlacement',
      'projectPublishedCompileLayout',
      'projectScopeCompileLayouts',
      'projectScopeOutputBounds',
      'samplePathRoute',
    ])
      expect(compile).toHaveProperty(name);

    for (const name of [
      'projectCompileReference',
      'formatCompileWarning',
      'importSceneResources',
      'compileToScene',
      'compileSceneSnapshot',
      'createCompileChildPath',
      'createDuplicateCompileWarning',
      'formatCompileOccurrence',
      'orderCompileWarnings',
      'withCompileWarningOccurrence',
    ])
      expect(compile).not.toHaveProperty(name);
  });

  it('节点解析不受编译依赖关系的影响', () => {
    for (const path of ['src/resolve/node/shape.ts', 'src/resolve/node/boundary.ts']) {
      expect(source(path)).not.toContain('/compile/');
    }
  });
});
