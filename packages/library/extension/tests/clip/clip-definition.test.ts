import type { ClipDefinition, CoreDependencyProvider, IRClip, IRScene, PathCommand } from '@retikz/core';
import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import {
  circleClipDefinition,
  circleClipProvider,
  compoundClipDefinition,
  compoundClipProvider,
  ellipseClipDefinition,
  ellipseClipProvider,
  pathClipDefinition,
  pathClipProvider,
  polygonClipDefinition,
  polygonClipProvider,
  extensionClipDefinitions,
  extensionClipProviders,
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
    definitions: [circleClipDefinition],
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
    definitions: [ellipseClipDefinition],
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
    definitions: [polygonClipDefinition],
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
    definitions: [pathClipDefinition],
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
    definitions: [compoundClipDefinition, circleClipDefinition, pathClipDefinition],
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
    expect(extensionClipDefinitions).toEqual([
      circleClipDefinition,
      ellipseClipDefinition,
      polygonClipDefinition,
      pathClipDefinition,
      compoundClipDefinition,
    ]);

    for (const definition of extensionClipDefinitions) {
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
    circleClipProvider,
    ellipseClipProvider,
    polygonClipProvider,
    pathClipProvider,
    compoundClipProvider,
  ];

  it('发布五个无依赖性裁剪提供者，每个提供者实现一个完整的定义', () => {
    expect(extensionClipProviders).toEqual(providers);
    expect(extensionClipProviders.map(provider => provider.key)).toEqual([
      { capability: 'clip', name: 'circle' },
      { capability: 'clip', name: 'ellipse' },
      { capability: 'clip', name: 'polygon' },
      { capability: 'clip', name: 'path' },
      { capability: 'clip', name: 'compound' },
    ]);
    expect(extensionClipProviders.every(provider => (provider.dependencies ?? []).length === 0)).toBe(true);
    expect(extensionClipProviders.map(provider => provider.makeDefinition([]))).toEqual(extensionClipDefinitions);
  });

  it('仅解析完整目录中请求的完整 Path 定义', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [pathClipProvider.key], providers: extensionClipProviders }],
    });

    expect(definitions).toEqual({ clips: [pathClipDefinition] });
  });
});
