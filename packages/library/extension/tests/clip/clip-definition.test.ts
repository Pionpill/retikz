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
  ExtensionClipDefinitions,
  ExtensionClipProviders,
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
    clip: { kind: 'circle', params: { cx: 2, cy: 3, r: 4 } },
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
    clip: { kind: 'ellipse', params: { cx: 2, cy: 3, rx: 4, ry: 5 } },
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
      params: {
        points: [
          [0, 0],
          [4, 0],
          [2, 3],
        ],
      },
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
      params: {
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [3, 2] },
        ],
        fillRule: 'evenodd',
      },
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
      params: {
        children: [
          { kind: 'circle', params: { cx: 2, cy: 3, r: 4 } },
          {
            kind: 'path',
            params: {
              commands: [
                { kind: 'move', to: [8, 8] },
                { kind: 'line', to: [9, 9] },
              ],
            },
          },
        ],
        fillRule: 'evenodd',
      },
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

describe('扩展裁剪定义公共契约', () => {
  it('发布了五个完整的定义，没有配对的形状定义', () => {
    expect(ExtensionClipDefinitions).toEqual([
      CircleClipDefinition,
      EllipseClipDefinition,
      PolygonClipDefinition,
      PathClipDefinition,
      CompoundClipDefinition,
    ]);

    for (const definition of ExtensionClipDefinitions) {
      expect(definition).toEqual(
        expect.objectContaining({
          schema: expect.anything(),
          lower: expect.any(Function),
        }),
      );
    }
  });

  it.each(cases)('通过仅作为裁剪传递的完整定义来编译 $kind', testCase => {
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

describe('扩展裁剪提供者图', () => {
  const providers: ReadonlyArray<CoreDependencyProvider> = [
    CircleClipProvider,
    EllipseClipProvider,
    PolygonClipProvider,
    PathClipProvider,
    CompoundClipProvider,
  ];

  it('发布五个无依赖性裁剪提供者，每个提供者实现一个完整的定义', () => {
    expect(ExtensionClipProviders).toEqual(providers);
    expect(ExtensionClipProviders.map(provider => provider.key)).toEqual([
      { capability: 'clip', name: 'circle' },
      { capability: 'clip', name: 'ellipse' },
      { capability: 'clip', name: 'polygon' },
      { capability: 'clip', name: 'path' },
      { capability: 'clip', name: 'compound' },
    ]);
    expect(ExtensionClipProviders.every(provider => (provider.dependencies ?? []).length === 0)).toBe(true);
    expect(ExtensionClipProviders.map(provider => provider.makeDefinition([]))).toEqual(ExtensionClipDefinitions);
  });

  it('仅解析完整目录中请求的完整 Path 定义', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [PathClipProvider.key], providers: ExtensionClipProviders }],
    });

    expect(definitions).toEqual({ clips: [PathClipDefinition] });
  });
});
