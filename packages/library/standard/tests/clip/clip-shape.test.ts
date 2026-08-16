import type {
  AnyClipShapeDefinition,
  ClipDefinition,
  CoreDependencyProvider,
  IRClip,
  IRScene,
  PathCommand,
} from '@retikz/core';
import type { z } from 'zod';

import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  CircleClipShape,
  CompoundClipShape,
  EllipseClipShape,
  IRCircleClip,
  IRCompoundClip,
  IREllipseClip,
  IRPathClip,
  IRPolygonClip,
  PathClipShape,
  PolygonClipShape,
} from '../../src/clip';

import * as clipApi from '../../src/clip';

const api = clipApi as Record<string, unknown>;

const exported = <T>(name: string): T | undefined => api[name] as T | undefined;

const sceneOf = (clip: IRClip): IRScene => ({
  type: 'scene',
  version: 1,
  children: [{ type: 'scope', clip, children: [] }],
});

const cases: ReadonlyArray<{
  kind: 'circle' | 'ellipse' | 'polygon' | 'path' | 'compound';
  clip: IRClip;
  operationNames: ReadonlyArray<string>;
  shapeNames: ReadonlyArray<string>;
  commands: Array<PathCommand>;
  fillRule: 'nonzero' | 'evenodd';
}> = [
  {
    kind: 'circle',
    clip: { kind: 'circle', cx: 2, cy: 3, r: 4 },
    operationNames: ['CircleClipDefinition'],
    shapeNames: ['CircleClipShapeDefinition'],
    commands: [
      { kind: 'move', to: [6, 3] },
      { kind: 'arc', center: [2, 3], radius: 4, startAngle: 0, endAngle: 360 },
      { kind: 'close' },
    ],
    fillRule: 'nonzero',
  },
  {
    kind: 'ellipse',
    clip: { kind: 'ellipse', cx: 2, cy: 3, rx: 4, ry: 5 },
    operationNames: ['EllipseClipDefinition'],
    shapeNames: ['EllipseClipShapeDefinition'],
    commands: [
      { kind: 'move', to: [6, 3] },
      { kind: 'ellipseArc', center: [2, 3], radiusX: 4, radiusY: 5, startAngle: 0, endAngle: 360 },
      { kind: 'close' },
    ],
    fillRule: 'nonzero',
  },
  {
    kind: 'polygon',
    clip: {
      kind: 'polygon',
      points: [
        [0, 0],
        [4, 0],
        [2, 3],
      ],
    },
    operationNames: ['PolygonClipDefinition'],
    shapeNames: ['PolygonClipShapeDefinition'],
    commands: [
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [4, 0] },
      { kind: 'line', to: [2, 3] },
      { kind: 'close' },
    ],
    fillRule: 'nonzero',
  },
  {
    kind: 'path',
    clip: {
      kind: 'path',
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [3, 2] },
      ],
      fillRule: 'evenodd',
    },
    operationNames: ['PathClipDefinition'],
    shapeNames: ['PathClipShapeDefinition'],
    commands: [
      { kind: 'move', to: [0, 0] },
      { kind: 'line', to: [3, 2] },
    ],
    fillRule: 'evenodd',
  },
  {
    kind: 'compound',
    clip: {
      kind: 'compound',
      children: [
        { kind: 'circle', cx: 2, cy: 3, r: 4 },
        {
          kind: 'path',
          commands: [
            { kind: 'move', to: [8, 8] },
            { kind: 'line', to: [9, 9] },
          ],
        },
      ],
      fillRule: 'evenodd',
    },
    operationNames: ['CompoundClipDefinition', 'CircleClipDefinition', 'PathClipDefinition'],
    shapeNames: ['CompoundClipShapeDefinition', 'CircleClipShapeDefinition', 'PathClipShapeDefinition'],
    commands: [
      { kind: 'move', to: [6, 3] },
      { kind: 'arc', center: [2, 3], radius: 4, startAngle: 0, endAngle: 360 },
      { kind: 'close' },
      { kind: 'move', to: [8, 8] },
      { kind: 'line', to: [9, 9] },
    ],
    fillRule: 'evenodd',
  },
];

const precisionCases: ReadonlyArray<{
  kind: 'circle' | 'ellipse';
  clip: IRClip;
  operationDefinition: ClipDefinition;
  shapeDefinition: AnyClipShapeDefinition;
  expectedArc: PathCommand;
}> = [
  {
    kind: 'circle',
    clip: { kind: 'circle', cx: 0.1, cy: 0.3, r: 0.2 },
    operationDefinition: clipApi.CircleClipDefinition,
    shapeDefinition: clipApi.CircleClipShapeDefinition,
    expectedArc: {
      kind: 'arc',
      center: [0.1, 0.3],
      radius: 0.2,
      startAngle: 0,
      endAngle: 360,
    },
  },
  {
    kind: 'ellipse',
    clip: { kind: 'ellipse', cx: 0.1, cy: 0.3, rx: 0.2, ry: 0.4 },
    operationDefinition: clipApi.EllipseClipDefinition,
    shapeDefinition: clipApi.EllipseClipShapeDefinition,
    expectedArc: {
      kind: 'ellipseArc',
      center: [0.1, 0.3],
      radiusX: 0.2,
      radiusY: 0.4,
      startAngle: 0,
      endAngle: 360,
    },
  },
];

describe('Standard ClipShape public contract', () => {
  it('exports schema-derived operation types separately from resolved shape types', () => {
    expectTypeOf<IRCircleClip>().toMatchTypeOf<{ kind: 'circle'; r: number }>();
    expectTypeOf<CircleClipShape>().toMatchTypeOf<{ kind: 'circle'; r: number }>();
    expectTypeOf<IREllipseClip>().toMatchTypeOf<{ kind: 'ellipse'; rx: number; ry: number }>();
    expectTypeOf<EllipseClipShape>().toMatchTypeOf<{ kind: 'ellipse'; rx: number; ry: number }>();
    expectTypeOf<IRPolygonClip>().toMatchTypeOf<{ kind: 'polygon' }>();
    expectTypeOf<PolygonClipShape>().toMatchTypeOf<{ kind: 'polygon' }>();
    expectTypeOf<IRPathClip>().toMatchTypeOf<{ kind: 'path' }>();
    expectTypeOf<PathClipShape>().toMatchTypeOf<{ kind: 'path' }>();
    expectTypeOf<IRCompoundClip>().toMatchTypeOf<{ kind: 'compound' }>();
    expectTypeOf<CompoundClipShape>().toMatchTypeOf<{ kind: 'compound' }>();
  });

  it('exports five operation schemas and both Definition levels from the clip subpath', () => {
    const names = [
      'CircleClipSchema',
      'EllipseClipSchema',
      'PolygonClipSchema',
      'PathClipSchema',
      'CompoundClipSchema',
      'CircleClipDefinition',
      'EllipseClipDefinition',
      'PolygonClipDefinition',
      'PathClipDefinition',
      'CompoundClipDefinition',
      'CircleClipShapeDefinition',
      'EllipseClipShapeDefinition',
      'PolygonClipShapeDefinition',
      'PathClipShapeDefinition',
      'CompoundClipShapeDefinition',
    ];

    for (const name of names) expect(api).toHaveProperty(name);
  });

  it('validates kind-specific operation payloads in Standard', () => {
    const invalidCases: ReadonlyArray<readonly [string, unknown]> = [
      ['CircleClipSchema', { kind: 'circle', cx: 0, cy: 0, r: 0 }],
      ['EllipseClipSchema', { kind: 'ellipse', cx: 0, cy: 0, rx: 1, ry: -1 }],
      ['PolygonClipSchema', { kind: 'polygon', points: [[0, 0]] }],
      ['PathClipSchema', { kind: 'path', commands: [] }],
      ['CompoundClipSchema', { kind: 'compound', children: [] }],
    ];

    for (const [name, value] of invalidCases) {
      const schema = exported<z.ZodType>(name);
      expect(schema, name).toBeDefined();
      if (schema === undefined) continue;
      expect(schema.safeParse(value).success, name).toBe(false);
    }
  });

  it.each(cases)('compiles $kind through Standard operation and shape definitions', testCase => {
    const clips = testCase.operationNames.map(name => exported<ClipDefinition>(name));
    const clipShapes = testCase.shapeNames.map(name => exported<AnyClipShapeDefinition>(name));
    expect(clips.every(Boolean)).toBe(true);
    expect(clipShapes.every(Boolean)).toBe(true);
    if (!clips.every(Boolean) || !clipShapes.every(Boolean)) return;

    const scene = compileToScene(sceneOf(testCase.clip), {
      clips: clips as Array<ClipDefinition>,
      clipShapes: clipShapes as Array<AnyClipShapeDefinition>,
    }).scene;

    expect(scene.resources).toEqual([
      {
        kind: 'clip',
        id: 'clip-1',
        path: { commands: testCase.commands, fillRule: testCase.fillRule },
      },
    ]);
  });

  it.each(precisionCases)('keeps the $kind move aligned with its precision-rounded arc start', testCase => {
    const scene = compileToScene(sceneOf(testCase.clip), {
      precision: 2,
      clips: [testCase.operationDefinition],
      clipShapes: [testCase.shapeDefinition],
    }).scene;
    const resource = scene.resources?.[0];
    const commands = resource?.kind === 'clip' ? resource.path.commands : [];
    const round = (value: number): number => Math.round(value * 100) / 100;

    expect(commands).toEqual([{ kind: 'move', to: [0.3, 0.3] }, testCase.expectedArc, { kind: 'close' }]);

    const arc = commands[1];
    expect(arc.kind === 'arc' || arc.kind === 'ellipseArc').toBe(true);
    if (arc.kind !== 'arc' && arc.kind !== 'ellipseArc') return;
    const radiusX = arc.kind === 'arc' ? arc.radius : arc.radiusX;
    expect(commands[0]).toEqual({
      kind: 'move',
      to: [round(arc.center[0] + radiusX), round(arc.center[1])],
    });
  });
});

describe('Standard clip provider graph', () => {
  it.each(['Circle', 'Ellipse', 'Polygon', 'Path', 'Compound'])('%s operation depends on its shape provider', name => {
    const operation = exported<CoreDependencyProvider>(`${name}ClipProvider`);
    const shape = exported<CoreDependencyProvider>(`${name}ClipShapeProvider`);
    expect(operation).toBeDefined();
    expect(shape).toBeDefined();
    if (operation === undefined || shape === undefined) return;

    expect(operation.dependencies).toEqual([shape.key]);
    expect(shape.dependencies).toEqual([]);
  });

  it('fails during dependency resolution when a Path operation root omits its shape provider', () => {
    const operation = exported<CoreDependencyProvider>('PathClipProvider');
    expect(operation).toBeDefined();
    if (operation === undefined) return;

    expect(() =>
      resolveCoreProviderDependencies({ contributions: [{ roots: [operation.key], providers: [operation] }] }),
    ).toThrow(/missing dependency provider.*clipShape:path/i);
  });

  it('resolves a shape-first Path definition closure from the complete catalog', () => {
    const operation = exported<CoreDependencyProvider>('PathClipProvider');
    const shape = exported<CoreDependencyProvider>('PathClipShapeProvider');
    expect(operation).toBeDefined();
    expect(shape).toBeDefined();
    if (operation === undefined || shape === undefined) return;

    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [operation.key], providers: [operation, shape] }],
    });
    expect(definitions.clipShapes?.map(definition => definition.kind)).toEqual(['path']);
    expect(definitions.clips?.map(definition => definition.kind)).toEqual(['path']);
  });

  it('does not install unrelated clips from the complete Standard catalog', () => {
    const operation = exported<CoreDependencyProvider>('PathClipProvider');
    const providers = exported<ReadonlyArray<CoreDependencyProvider>>('StandardClipProviders');
    expect(operation).toBeDefined();
    expect(providers).toBeDefined();
    if (operation === undefined || providers === undefined) return;

    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [operation.key], providers }],
    });
    expect(definitions.clipShapes?.map(definition => definition.kind)).toEqual(['path']);
    expect(definitions.clips?.map(definition => definition.kind)).toEqual(['path']);
  });

  it('publishes complete definition and provider collections without duplicate keys', () => {
    const definitions = exported<ReadonlyArray<ClipDefinition>>('StandardClipDefinitions');
    const shapeDefinitions = exported<ReadonlyArray<AnyClipShapeDefinition>>('StandardClipShapeDefinitions');
    const providers = exported<ReadonlyArray<CoreDependencyProvider>>('StandardClipProviders');
    expect(definitions?.map(definition => definition.kind).sort()).toEqual([
      'circle',
      'compound',
      'ellipse',
      'path',
      'polygon',
    ]);
    expect(shapeDefinitions?.map(definition => definition.kind).sort()).toEqual([
      'circle',
      'compound',
      'ellipse',
      'path',
      'polygon',
    ]);
    expect(providers).toHaveLength(10);
    const keys = providers?.map(provider => JSON.stringify(provider.key)) ?? [];
    expect(new Set(keys).size).toBe(keys.length);
  });
});
