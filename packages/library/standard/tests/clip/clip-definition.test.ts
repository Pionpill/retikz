import type { ClipDefinition, CoreDependencyProvider, IRClip, IRScene, PathCommand } from '@retikz/core';

import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import {
  CircleClipDefinition,
  CircleClipProvider,
  CompoundClipDefinition,
  CompoundClipProvider,
  EllipseClipDefinition,
  EllipseClipProvider,
  PathClipDefinition,
  PathClipProvider,
  PolygonClipDefinition,
  PolygonClipProvider,
  StandardClipDefinitions,
  StandardClipProviders,
} from '../../src/clip';

const sceneOf = (clip: IRClip): IRScene => ({
  type: 'scene',
  version: 1,
  children: [{ type: 'scope', clip, children: [] }],
});

const cases: ReadonlyArray<{
  kind: 'circle' | 'ellipse' | 'polygon' | 'path' | 'compound';
  clip: IRClip;
  definitions: ReadonlyArray<ClipDefinition>;
  commands: Array<PathCommand>;
  fillRule: 'nonzero' | 'evenodd';
}> = [
  {
    kind: 'circle',
    clip: { kind: 'circle', cx: 2, cy: 3, r: 4 },
    definitions: [CircleClipDefinition],
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
    definitions: [EllipseClipDefinition],
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
    definitions: [PolygonClipDefinition],
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
    definitions: [PathClipDefinition],
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
    definitions: [CompoundClipDefinition, CircleClipDefinition, PathClipDefinition],
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

describe('Standard Clip definition public contract', () => {
  it('publishes five complete definitions and no paired shape definitions', () => {
    expect(StandardClipDefinitions).toEqual([
      CircleClipDefinition,
      EllipseClipDefinition,
      PolygonClipDefinition,
      PathClipDefinition,
      CompoundClipDefinition,
    ]);
    for (const definition of StandardClipDefinitions) {
      expect(definition).toEqual(
        expect.objectContaining({
          schema: expect.anything(),
          resolve: expect.any(Function),
          shapeSchema: expect.anything(),
          lower: expect.any(Function),
        }),
      );
    }
  });

  it.each(cases)('compiles $kind through complete definitions passed only as clips', testCase => {
    const scene = compileToScene(sceneOf(testCase.clip), { clips: testCase.definitions }).scene;
    expect(scene.resources).toEqual([
      {
        kind: 'clip',
        id: 'clip-1',
        path: { commands: testCase.commands, fillRule: testCase.fillRule },
      },
    ]);
  });
});

describe('Standard clip provider graph', () => {
  const providers: ReadonlyArray<CoreDependencyProvider> = [
    CircleClipProvider,
    EllipseClipProvider,
    PolygonClipProvider,
    PathClipProvider,
    CompoundClipProvider,
  ];

  it('publishes five dependency-free clip providers that each materialize one complete definition', () => {
    expect(StandardClipProviders).toEqual(providers);
    expect(StandardClipProviders.map(provider => provider.key)).toEqual([
      { capability: 'clip', name: 'circle' },
      { capability: 'clip', name: 'ellipse' },
      { capability: 'clip', name: 'polygon' },
      { capability: 'clip', name: 'path' },
      { capability: 'clip', name: 'compound' },
    ]);
    expect(StandardClipProviders.every(provider => provider.dependencies.length === 0)).toBe(true);
    expect(StandardClipProviders.map(provider => provider.makeDefinition({}))).toEqual(StandardClipDefinitions);
  });

  it('resolves only the requested complete Path definition from the full catalog', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [PathClipProvider.key], providers: StandardClipProviders }],
    });
    expect(definitions).toEqual({ clips: [PathClipDefinition] });
  });
});
