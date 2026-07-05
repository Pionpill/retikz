import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { NodeLabelLayout, NodeLayout, TexLoweringContext } from '../../src/compile/node';
import type { RibbonEmitOptions } from '../../src/compile/path/ribbon';

import * as compile from '../../src/compile';
import * as nodeCompile from '../../src/compile/node';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const source = (path: string): string => readFileSync(resolve(root, path), 'utf8');

describe('compile source structure', () => {
  it('compile barrel exposes only stable runtime entries', () => {
    expect(Object.keys(compile).sort()).toEqual([
      'CompileWarningCode',
      'compileToScene',
      'computeLayout',
      'fallbackMeasurer',
      'formatCompileWarning',
    ]);
  });

  it('path index is a barrel, not the path emitter implementation', () => {
    const text = source('src/compile/path/index.ts');
    expect(text).not.toContain('export const emitPathPrimitive =');
    expect(text).not.toContain('const buildPathTransforms =');
  });

  it('path emit module delegates focused helpers', () => {
    const text = source('src/compile/path/emit.ts');
    expect(text).not.toContain('const buildMarkMarkerGroup =');
    expect(text).not.toContain('const buildPathTransforms =');
    expect(text).not.toContain('const assertValidGeneratedCommand =');
  });

  it('node compile implementation is directory based', () => {
    expect(() => source('src/compile/node.ts')).toThrow();
    expect(source('src/compile/node/index.ts')).toContain("export { layoutNode } from './layout';");
    expect(source('src/compile/node/index.ts')).toContain("export { emitNodePrimitives } from './emit';");
  });

  it('node compile barrel keeps the internal compatibility surface', () => {
    expect(Object.keys(nodeCompile).sort()).toEqual([
      'anchorOf',
      'angleBoundaryOf',
      'boundaryKey',
      'boundaryPointOf',
      'boxInsets',
      'createScopeCircleLayout',
      'createScopePlaceholderLayout',
      'createScopeRectangleLayout',
      'createSyntheticRectangleLayout',
      'emitNodePrimitives',
      'fallbackBoundaryAnchor',
      'labelExtentPoints',
      'layoutNode',
      'outerRectOf',
      'resolveBoundary',
    ]);

    const layout: Partial<NodeLayout> = {};
    const label: Partial<NodeLabelLayout> = {};
    const tex: TexLoweringContext = { warn: () => {} };

    expect(layout).toEqual({});
    expect(label).toEqual({});
    expect(tex.lowerTex).toBeUndefined();
  });

  it('compile entry delegates traversal internals', () => {
    const text = source('src/compile/compile.ts');
    expect(text).not.toContain('const processChildren =');
    expect(text).not.toContain('const resolvePendingPaths =');
  });

  it('boundary compile does not import concrete shape providers', () => {
    const text = source('src/compile/node/boundary.ts');
    expect(text).not.toContain("from '../providers/shape'");
  });

  it('ribbon compile implementation is directory based', () => {
    expect(() => source('src/compile/path/ribbon.ts')).toThrow();
    expect(source('src/compile/path/ribbon/index.ts')).toContain("export { emitRibbonPrimitive } from './emit';");

    const options: RibbonEmitOptions = {};

    expect(options).toEqual({});
  });
});
