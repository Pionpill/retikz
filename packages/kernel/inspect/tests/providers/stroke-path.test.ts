import type { IRScene } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import {
  compileInspectionToScene,
  createDefaultInspectorRegistry,
  STROKE_PATH_INSPECTOR,
  STROKE_PATH_INSPECTOR_KEY,
  StrokePathInspectOptionsInputSchema,
  StrokePathInspectOptionsSchema,
} from '../../src';

const hasText = (primitives: ReadonlyArray<{ type: string; children?: ReadonlyArray<{ type: string }> }>): boolean =>
  primitives.some(
    primitive => primitive.type === 'text' || (primitive.children !== undefined && hasText(primitive.children)),
  );

const ir: IRScene = {
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'curve', control: [5, 8], to: [10, 0] },
        { type: 'step', kind: 'cubic', control1: [12, -4], control2: [18, 4], to: [20, 0] },
      ],
    },
  ],
};

describe('stroke Path Inspector', () => {
  it('uses the Core package namespace for its registry key', () => {
    expect(STROKE_PATH_INSPECTOR_KEY).toEqual({ namespace: 'core', type: 'stroke-path' });
  });

  it('keeps sparse labels absent until canonical options apply the default', () => {
    expect(StrokePathInspectOptionsInputSchema.parse({})).toEqual({});
    expect(StrokePathInspectOptionsSchema.parse({})).toEqual({ controlPoints: true, labels: false });
  });

  it('draws handles, control points, and optional labels from settled owner output', () => {
    const result = compileInspectionToScene(ir, {
      registry: createDefaultInspectorRegistry(),
      selection: {
        rules: [
          {
            kind: 'request',
            inspector: STROKE_PATH_INSPECTOR_KEY,
            target: { kind: 'self', locator: { kind: 'authored', sourcePath: 'children[0].path' } },
            value: { labels: true },
          },
        ],
      },
    });
    expect(result.inspection?.entries.length).toBeGreaterThan(2);
    expect(hasText(result.inspection?.entries.flatMap(entry => entry.scene.primitives) ?? [])).toBe(true);
  });

  it('does not enable the builtin from a scene request', () => {
    const result = compileInspectionToScene(ir, {
      registry: createDefaultInspectorRegistry(),
      selection: {
        rules: [{ kind: 'request', inspector: STROKE_PATH_INSPECTOR_KEY, target: { kind: 'scene' }, value: true }],
      },
    });
    expect(result.inspection).toBeNull();
  });

  it('continues control handles from arc endpoints and closed subpath starts', () => {
    const context = {
      inspectorKey: STROKE_PATH_INSPECTOR_KEY,
      owner: { kind: 'pathKind' as const, name: 'stroke' },
      occurrence: { sourcePath: 'children[0].path', expansionPath: [] },
      provenance: {
        origin: { sourcePath: 'children[0].path', expansionPath: [] },
        final: { sourcePath: 'children[0].path', expansionPath: [] },
      },
      options: { controlPoints: true, labels: false },
      appearance: {
        colorScope: 0,
        scopeColor: '#2563eb',
        semanticColors: { error: '#ef4444', success: '#16a34a', warning: '#dc2626', guide: '#6b7280' },
      },
    };
    const output = STROKE_PATH_INSPECTOR.inspect(
      {
        commands: [
          { kind: 'move', to: [2, 3] },
          { kind: 'arc', center: [0, 0], radius: 10, startAngle: 90, endAngle: 0 },
          { kind: 'quad', control: [12, 4], to: [14, 6] },
          { kind: 'close' },
          { kind: 'quad', control: [4, 5], to: [6, 7] },
        ],
        transforms: [],
      },
      context,
    );

    expect(Array.isArray(output)).toBe(true);
    if (!Array.isArray(output)) throw new Error('expected stroke Inspector output array');
    expect(output[0]).toMatchObject({
      type: 'path',
      children: [
        { kind: 'move', to: [10, 0] },
        { kind: 'line', to: [12, 4] },
        { kind: 'move', to: [12, 4] },
        { kind: 'line', to: [14, 6] },
        { kind: 'move', to: [2, 3] },
        { kind: 'line', to: [4, 5] },
        { kind: 'move', to: [4, 5] },
        { kind: 'line', to: [6, 7] },
      ],
    });
  });

  it('offsets labels from their control points', () => {
    const output = STROKE_PATH_INSPECTOR.inspect(
      {
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'quad', control: [5, 8], to: [10, 0] },
        ],
        transforms: [],
      },
      {
        inspectorKey: STROKE_PATH_INSPECTOR_KEY,
        owner: { kind: 'pathKind', name: 'stroke' },
        occurrence: { sourcePath: 'children[0].path', expansionPath: [] },
        provenance: {
          origin: { sourcePath: 'children[0].path', expansionPath: [] },
          final: { sourcePath: 'children[0].path', expansionPath: [] },
        },
        options: { controlPoints: false, labels: true },
        appearance: {
          colorScope: 0,
          scopeColor: '#2563eb',
          semanticColors: { error: '#ef4444', success: '#16a34a', warning: '#dc2626', guide: '#6b7280' },
        },
      },
    );

    expect(output).toMatchObject([{ type: 'node', position: [11, 2], text: 'Q1' }]);
  });
});
