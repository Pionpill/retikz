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
      'CORE_PROGRAM_ID',
      'CompileWarningCode',
      'compileToScene',
      'computeLayout',
      'createCoreProgram',
      'fallbackMeasurer',
      'formatCompileOccurrence',
      'formatCompileWarning',
      'isNodeLayoutCompileArtifact',
      'lowerIRToKernel',
    ]);
  });

  it('Runtime public contract 与 incremental implementation 分属稳定 owner', () => {
    expect(source('src/contract/runtime/index.ts')).toContain("export * from './types';");
    expect(source('src/contract/index.ts')).toContain("export * from './runtime';");
    expect(source('src/compile/incremental/index.ts')).toContain("export * from './program';");
    expect(source('src/compile/incremental/index.ts')).not.toContain("export * from './types';");
    expect(() => source('src/compile/program/index.ts')).toThrow();
  });

  it('path index is a barrel, not the path emitter implementation', () => {
    const text = source('src/compile/path/index.ts');
    expect(text).not.toContain('export const emitPathPrimitive =');
    expect(text).not.toContain('const buildPathTransforms =');
    expect(text).not.toContain("export * from './emit';");
    expect(text).toContain("export * from './stroke';");
  });

  it('path root does not keep compatibility emit shims', () => {
    expect(() => source('src/compile/path/emit.ts')).toThrow();
  });

  it('stroke path emit module delegates focused helpers', () => {
    const text = source('src/compile/path/stroke/emit.ts');
    expect(text).not.toContain('const buildMarkMarkerGroup =');
    expect(text).not.toContain('const buildPathTransforms =');
    expect(text).not.toContain('const assertValidGeneratedCommand =');
    expect(text).toContain('createPathCommandEmitter');
    expect(source('src/compile/path/stroke/commands.ts')).toContain('export const createPathCommandEmitter');
  });

  it('stroke path emit delegates cursor state without exposing it from the barrel', () => {
    const emit = source('src/compile/path/stroke/emit.ts');
    const barrel = source('src/compile/path/stroke/index.ts');

    expect(emit).toContain('createStrokeCursor');
    expect(source('src/compile/path/stroke/cursor.ts')).toContain('export const createStrokeCursor');
    expect(barrel).not.toContain('./cursor');
  });

  it('stroke path emit delegates sampling without exposing it from the barrel', () => {
    const emit = source('src/compile/path/stroke/emit.ts');
    const barrel = source('src/compile/path/stroke/index.ts');

    expect(emit).toContain('createStrokeSamplingCollector');
    expect(source('src/compile/path/stroke/sampling.ts')).toContain('export const createStrokeSamplingCollector');
    expect(barrel).not.toContain('./sampling');
  });

  it('stroke path emit delegates shape steps without exposing them from the barrel', () => {
    const emit = source('src/compile/path/stroke/emit.ts');
    const barrel = source('src/compile/path/stroke/index.ts');

    expect(emit).toContain('lowerShapeStep');
    for (const kind of ['generator', 'cycle', 'rectangle', 'arc', 'circlePath', 'ellipsePath', 'smooth']) {
      expect(emit).not.toContain(`if (step.kind === '${kind}')`);
    }
    expect(source('src/compile/path/stroke/shapes.ts')).toContain('export const lowerShapeStep');
    expect(barrel).not.toContain('./shapes');
  });

  it('stroke path emit delegates segment steps without exposing them from the barrel', () => {
    const emit = source('src/compile/path/stroke/emit.ts');
    const barrel = source('src/compile/path/stroke/index.ts');

    expect(emit).toContain('lowerSegmentStep');
    for (const kind of ['line', 'curve', 'cubic', 'bend', 'fold']) {
      expect(emit).not.toContain(`if (step.kind === '${kind}')`);
    }
    expect(source('src/compile/path/stroke/segments.ts')).toContain('export const lowerSegmentStep');
    expect(barrel).not.toContain('./segments');
  });

  it('node compile implementation is directory based', () => {
    expect(() => source('src/compile/node.ts')).toThrow();
    expect(source('src/compile/node/index.ts')).toContain("export * from './layout';");
    expect(source('src/compile/node/index.ts')).toContain("export * from './emit';");
  });

  it('node compile barrel keeps the internal compatibility surface', () => {
    expect(Object.keys(nodeCompile).sort()).toEqual([
      'anchorOf',
      'angleBoundaryOf',
      'boundaryKey',
      'boundaryPointOf',
      'boxInsets',
      'chooseBlackOrWhiteForLuminance',
      'computeCompiledNodeLayout',
      'createScopeCircleLayout',
      'createScopePlaceholderLayout',
      'createScopeRectangleLayout',
      'createSyntheticRectangleLayout',
      'emitNodePrimitives',
      'fallbackBoundaryAnchor',
      'labelBorderPoint',
      'labelBoxEdgeToward',
      'labelCenter',
      'labelExtentPoints',
      'layoutNode',
      'normalizeLabelPosition',
      'outerRectOf',
      'parseStaticCssColor',
      'resolveAxisScale',
      'resolveBoundary',
      'resolveBoxSize',
      'resolveLabelRotateDeg',
      'resolveNodeLabelGeometry',
      'resolveNodeTextColor',
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
    expect(() => source('src/compile/path/ribbon/outline.ts')).toThrow();
    expect(source('src/compile/path/ribbon/index.ts')).toContain("export * from './emit';");
    expect(source('src/compile/path/ribbon/outline/index.ts')).toContain("export * from './analytic';");
    expect(source('src/compile/path/ribbon/outline/index.ts')).toContain("export * from './sampled';");

    const options: RibbonEmitOptions = {};

    expect(options).toEqual({});
  });
});
