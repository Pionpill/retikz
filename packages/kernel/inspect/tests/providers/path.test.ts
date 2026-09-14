import type { IRChild, IRScene } from '@retikz/core';

import { describe, expect, it } from 'vitest';
import { toJSONSchema } from 'zod';

import {
  compileInspectionToScene,
  createDefaultInspectorRegistry,
  PATH_INSPECTOR_KEY,
  PathInspectOptionsSchema,
} from '../../src';
import { PATH_INSPECTOR } from '../../src/providers';

const hasText = (primitives: ReadonlyArray<{ type: string; children?: ReadonlyArray<{ type: string }> }>): boolean =>
  primitives.some(
    primitive => primitive.type === 'text' || (primitive.children !== undefined && hasText(primitive.children)),
  );

/** 检查可见 IR 内容，不依赖样式隔离 Scope 的包装层数 */
const drawingChildren = (children: ReadonlyArray<IRChild>): Array<IRChild> =>
  children.flatMap(child =>
    child.type === 'scope' && !('namespace' in child) ? drawingChildren(child.children) : [child],
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
  it('defaults ellipse axes to off and merges their independent override', () => {
    expect(PathInspectOptionsSchema.parse({})).toHaveProperty('ellipseAxes', false);
    expect(PATH_INSPECTOR.mergeOptionsInput?.({ ellipseAxes: true }, { ellipseAxes: false })).toEqual({
      ellipseAxes: false,
    });
  });
  it('treats a typed undefined override as omission during selection', () => {
    const local: { labels?: boolean } = { labels: undefined };
    const result = compileInspectionToScene(ir, {
      registry: createDefaultInspectorRegistry(),
      selection: {
        rules: [
          {
            kind: 'request',
            inspector: PATH_INSPECTOR_KEY,
            target: { kind: 'scene' },
            options: { labels: true },
          },
          {
            kind: 'request',
            inspector: PATH_INSPECTOR_KEY,
            target: { kind: 'self', locator: { kind: 'authored', sourcePath: 'children[0].path' } },
            options: local,
          },
        ],
      },
    });
    expect(hasText(result.inspection?.entries.flatMap(entry => entry.scene.primitives) ?? [])).toBe(true);
    expect(local).toEqual({ labels: undefined });
  });
  it('exports the same defaults and descriptions to JSON Schema', () => {
    expect(toJSONSchema(PathInspectOptionsSchema)).toMatchObject({
      properties: {
        controlPoints: { default: true, description: expect.any(String) },
        vertices: { default: false, description: expect.any(String) },
        arcGeometry: { default: true, description: expect.any(String) },
        labels: { default: false, description: expect.any(String) },
      },
    });
  });
  it('uses the Core package namespace for its registry key', () => {
    expect(PATH_INSPECTOR_KEY).toEqual({ namespace: 'core', type: 'path' });
  });

  it('materializes schema defaults when explicitly parsing a configuration snapshot', () => {
    const source = PathInspectOptionsSchema.parse({});
    expect(source).toEqual({
      controlPoints: true,
      vertices: false,
      arcGeometry: true,
      ellipseAxes: false,
      labels: false,
    });
    expect(JSON.parse(JSON.stringify(source))).toEqual(source);
    expect(source).toEqual({
      controlPoints: true,
      vertices: false,
      arcGeometry: true,
      ellipseAxes: false,
      labels: false,
    });
  });

  it('draws handles, control points, and optional labels from settled owner output', () => {
    const result = compileInspectionToScene(ir, {
      registry: createDefaultInspectorRegistry(),
      selection: {
        rules: [
          {
            kind: 'request',
            inspector: PATH_INSPECTOR_KEY,
            target: { kind: 'self', locator: { kind: 'authored', sourcePath: 'children[0].path' } },
            options: { labels: true },
          },
        ],
      },
    });
    expect(result.inspection?.entries.length).toBeGreaterThan(2);
    expect(hasText(result.inspection?.entries.flatMap(entry => entry.scene.primitives) ?? [])).toBe(true);
  });

  it.each<boolean | Record<string, boolean>>([true, {}, { labels: false }, PathInspectOptionsSchema.parse({})])(
    'inherits scene labels unless self explicitly disables them: %j',
    local => {
      const result = compileInspectionToScene(ir, {
        registry: createDefaultInspectorRegistry(),
        selection: {
          rules: [
            {
              kind: 'request',
              inspector: PATH_INSPECTOR_KEY,
              target: { kind: 'scene' },
              options: { labels: true },
            },
            {
              kind: 'request',
              inspector: PATH_INSPECTOR_KEY,
              target: { kind: 'self', locator: { kind: 'authored', sourcePath: 'children[0].path' } },
              options: local,
            },
          ],
        },
      });
      expect(hasText(result.inspection?.entries.flatMap(entry => entry.scene.primitives) ?? [])).toBe(
        typeof local === 'boolean' || !('labels' in local),
      );
    },
  );

  it('ignores undefined overrides and preserves explicit false during option merging', () => {
    const inherited = { labels: true, controlPoints: true };
    const merged = PATH_INSPECTOR.mergeOptionsInput?.(inherited, { labels: undefined, controlPoints: false });
    expect(merged).toEqual({ labels: true, controlPoints: false });
    expect(inherited).toEqual({ labels: true, controlPoints: true });
  });

  it('enables the explicitly requested builtin across the scene', () => {
    const result = compileInspectionToScene(ir, {
      registry: createDefaultInspectorRegistry(),
      selection: {
        rules: [{ kind: 'request', inspector: PATH_INSPECTOR_KEY, target: { kind: 'scene' }, options: true }],
      },
    });
    expect(result.inspection?.entries.length).toBeGreaterThan(0);
  });

  it('continues control handles from arc endpoints and closed subpath starts', () => {
    const context = {
      transform: [1, 0, 0, 1, 0, 0] as const,
      round: (value: number) => value,
      ancestors: [],
      warn: () => undefined,
      inspectorKey: PATH_INSPECTOR_KEY,
      owner: { kind: 'path' as const, name: 'stroke' },
      occurrence: { sourcePath: 'children[0].path', expansionPath: [] },
      provenance: {
        origin: { sourcePath: 'children[0].path', expansionPath: [] },
        final: { sourcePath: 'children[0].path', expansionPath: [] },
      },
      options: { controlPoints: true, vertices: false, arcGeometry: true, ellipseAxes: false, labels: false },
      appearance: {
        colorScope: 0,
        scopeColor: '#2563eb',
        semanticColors: { error: '#ef4444', success: '#16a34a', warning: '#dc2626', guide: '#6b7280' },
      },
    };
    const output = PATH_INSPECTOR.inspect(
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
    expect(drawingChildren(output)[0]).toMatchObject({
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

  it('keeps vertex, control, and arc center labels clear of their point markers', () => {
    const output = PATH_INSPECTOR.inspect(
      {
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'quad', control: [5, 8], to: [10, 0] },
          { kind: 'arc', center: [0, 0], radius: 10, startAngle: 0, endAngle: 360 },
          { kind: 'ellipseArc', center: [-10, 0], radiusX: 20, radiusY: 10, startAngle: 0, endAngle: 360 },
        ],
        transforms: [],
      },
      {
        inspectorKey: PATH_INSPECTOR_KEY,
        transform: [1, 0, 0, 1, 0, 0],
        round: (value: number) => value,
        ancestors: [],
        warn: () => undefined,
        owner: { kind: 'path', name: 'stroke' },
        occurrence: { sourcePath: 'children[0].path', expansionPath: [] },
        provenance: {
          origin: { sourcePath: 'children[0].path', expansionPath: [] },
          final: { sourcePath: 'children[0].path', expansionPath: [] },
        },
        options: { controlPoints: false, vertices: true, arcGeometry: true, ellipseAxes: false, labels: true },
        appearance: {
          colorScope: 0,
          scopeColor: '#2563eb',
          semanticColors: { error: '#ef4444', success: '#16a34a', warning: '#dc2626', guide: '#6b7280' },
        },
      },
    );

    expect(
      drawingChildren(Array.isArray(output) ? output : [output]).filter(
        child => child.type === 'node' && child.text !== undefined,
      ),
    ).toMatchObject([
      { type: 'node', position: [11, -4], text: 'Q1' },
      { type: 'node', position: [6, 12], text: 'V0' },
      { type: 'node', position: [16, 12], text: 'V1' },
      { type: 'node', position: [6, -12], text: 'A2' },
      { type: 'node', position: [-4, -12], text: 'A3' },
    ]);
  });
  it.each([
    [false, false, 0],
    [true, false, 1],
    [false, true, 1],
    [true, true, 2],
  ] as const)('independently draws radius guides (%s) and ellipse axes (%s)', (arcGeometry, ellipseAxes, pathCount) => {
    const output = PATH_INSPECTOR.inspect(
      {
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'ellipseArc', center: [0, 0], radiusX: 10, radiusY: 5, startAngle: 0, endAngle: 90 },
        ],
        transforms: [],
      },
      {
        inspectorKey: PATH_INSPECTOR_KEY,
        transform: [1, 0, 0, 1, 0, 0],
        round: (value: number) => value,
        ancestors: [],
        warn: () => undefined,
        owner: { kind: 'path', name: 'stroke' },
        occurrence: { sourcePath: 'children[0].path', expansionPath: [] },
        provenance: {
          origin: { sourcePath: 'children[0].path', expansionPath: [] },
          final: { sourcePath: 'children[0].path', expansionPath: [] },
        },
        options: { controlPoints: false, vertices: false, arcGeometry, ellipseAxes, labels: false },
        appearance: {
          colorScope: 0,
          scopeColor: '#2563eb',
          semanticColors: { error: '#ef4444', success: '#16a34a', warning: '#dc2626', guide: '#6b7280' },
        },
      },
    );

    const paths = drawingChildren(Array.isArray(output) ? output : [output]).filter(
      (child): child is Extract<IRChild, { type: 'path' }> => child.type === 'path',
    );
    expect(paths).toHaveLength(pathCount);
    if (arcGeometry) expect(paths[0].style?.dashPattern).toEqual([4, 3]);
    if (ellipseAxes) {
      expect(paths.at(-1)?.style).toMatchObject({ dashPattern: [1, 4], lineCap: 'round' });
      expect(paths.at(-1)?.children).toMatchObject([
        { kind: 'move', to: [-10, 0] },
        { kind: 'line', to: [10, 0] },
        { kind: 'move', to: [0, -5] },
        { kind: 'line', to: [0, 5] },
      ]);
    }
  });
});
