import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { NodeLabelLayout, NodeLayout, TexLoweringContext } from '../../src/compile/node';

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
      'observeCompileToScene',
    ]);
  });

  it('theme resolution is owned by resolve while package-root exports stay stable', () => {
    expect(source('src/compile/index.ts')).not.toContain('DEFAULT_RESOLVED_THEME');
    expect(source('src/compile/index.ts')).not.toContain('resolveTheme');
    expect(source('src/index.ts')).toContain("export * from './resolve';");
  });

  it('does not retain the removed inspection public files or exports', () => {
    expect(source('src/contract/index.ts')).not.toContain("export * from './inspection';");
    expect(source('src/compile/index.ts')).not.toContain('inspection');
    expect(source('src/compile/orchestration/index.ts')).not.toContain('inspection');

    for (const path of [
      'src/contract/inspection/index.ts',
      'src/contract/inspection/types.ts',
      'src/contract/inspection/define.ts',
      'src/compile/orchestration/inspection.ts',
      'src/compile/orchestration/inspection-error.ts',
      'src/compile/orchestration/inspection-output.ts',
      'src/providers/path-kind/stroke-inspector.ts',
    ]) {
      expect(() => source(path)).toThrow();
    }
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

  it('path style materialization is owned by stroke output', () => {
    expect(() => source('src/compile/path/host/resolve.ts')).toThrow();
    expect(source('src/compile/path/host/index.ts')).not.toContain("'./resolve'");

    const output = source('src/compile/path/stroke/output.ts');
    expect(output).toContain('export const emitPathBaseProps');
    expect(output).toContain('EmitPathBasePropsContext');
    expect(source('src/compile/path/stroke/emit.ts')).toContain('emitPathBaseProps');
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
      'alignmentGuidesOfNode',
      'anchorOf',
      'angleBoundaryOf',
      'boundaryPointOf',
      'boxInsets',
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
      'outerRectOf',
      'resolveBoundary',
      'resolveLabelRotateDeg',
      'resolveNodeLabelGeometry',
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

  it('node resolve stays free of compile dependencies', () => {
    for (const path of ['src/resolve/node/shape.ts', 'src/resolve/node/boundary.ts']) {
      expect(source(path)).not.toContain('/compile/');
    }
  });

  it('node synthetic layout resolves through the canonical node path', () => {
    const text = source('src/compile/node/synthetic.ts');
    expect(text).toContain('resolveNode(');
    expect(text).toContain('layoutNode(');
    expect(text).not.toContain('resolveShapeRegistry');
    expect(text).not.toContain('resolveBoundaryRegistry');
    expect(text).not.toContain('providerDefinitionOf');
  });

  it('node layouts keep boundary resolution data without registry closures', () => {
    const layout = source('src/compile/node/layout.ts');
    const types = source('src/compile/node/types.ts');
    const anchors = source('src/compile/node/anchors.ts');
    expect(types).not.toContain('resolveBoundary:');
    expect(layout).not.toContain('resolveBoundaryReference(');
    expect(anchors).not.toContain('resolveBoundaryReference(');
  });

  it('compile keeps boundary lookup out of node geometry and probe diagnostics local', () => {
    const nodeSources = [
      'src/compile/node/anchors.ts',
      'src/compile/node/boundary.ts',
      'src/compile/node/emit.ts',
      'src/compile/node/layout.ts',
      'src/compile/node/synthetic.ts',
      'src/compile/node/types.ts',
    ];
    for (const path of nodeSources) {
      const text = source(path);
      expect(text).not.toContain('createBoundaryResolver');
      expect(text).not.toContain('createNodeBoundaryReferenceResolver');
      expect(text).not.toContain('resolveBoundaryReference(');
    }

    const probeFailure = source('src/compile/probe-failure.ts');
    expect(probeFailure).not.toContain('export {');
    expect(probeFailure).not.toContain('isCompositeContractError');
    expect(probeFailure).not.toContain('isFatalProbeError');
    expect(probeFailure).not.toContain('safeThrownDetail');
    expect(() => source('src/compile/provider-payload.ts')).toThrow();
  });

  it('boundary geometry consumes resolved references without provider lookup', () => {
    const text = source('src/compile/node/boundary.ts');
    expect(text).toContain('BoundaryReferenceResolution');
    expect(text).not.toContain('providerDefinitionOf');
    expect(text).not.toContain('resolveShapeRegistry');
    expect(text).not.toContain('resolveBoundaryRegistry');
  });
});
