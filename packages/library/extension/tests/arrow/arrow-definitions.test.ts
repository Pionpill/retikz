import type { IRScene, PathPrimitive, ScenePrimitive } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import {
  BarArrowDefinition,
  BarArrowProvider,
  CrowFootArrowDefinition,
  CrowFootArrowProvider,
  DiamondArrowDefinition,
  DiamondArrowProvider,
  KiteArrowDefinition,
  KiteArrowProvider,
  OpenDiamondArrowDefinition,
  OpenDiamondArrowProvider,
  OpenKiteArrowDefinition,
  OpenKiteArrowProvider,
  OpenSquareArrowDefinition,
  OpenSquareArrowProvider,
  SquareArrowDefinition,
  SquareArrowProvider,
  ExtensionArrowDefinitions,
  ExtensionArrowProviders,
  StraightBarbArrowDefinition,
  StraightBarbArrowProvider,
} from '../../src/arrow';

const arrowScene = (shape: string): IRScene => ({
  type: 'scene',
  version: 1,
  children: [
    {
      type: 'path',
      arrow: { end: { shape } },
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [100, 0] },
      ],
    },
  ],
});

const firstPath = (primitives: ReadonlyArray<ScenePrimitive>): PathPrimitive | undefined => {
  for (const primitive of primitives) {
    if (primitive.type === 'path') return primitive;
    if (primitive.type === 'group') {
      const path = firstPath(primitive.children);
      if (path !== undefined) return path;
    }
  }

  return undefined;
};

describe('扩展可选箭头定义', () => {
  it('将每个显式可选箭头定义保留为其自己编译的标记几何形状', () => {
    const definitions = [
      DiamondArrowDefinition,
      OpenDiamondArrowDefinition,
      BarArrowDefinition,
      CrowFootArrowDefinition,
      StraightBarbArrowDefinition,
      KiteArrowDefinition,
      OpenKiteArrowDefinition,
      SquareArrowDefinition,
      OpenSquareArrowDefinition,
    ];
    const compiled = definitions.map(definition =>
      firstPath(compileToScene(arrowScene(definition.name), { arrows: [definition] }).scene.primitives),
    );

    expect(compiled.map(path => path?.arrowEnd?.shape)).toEqual([
      'diamond',
      'openDiamond',
      'bar',
      'crowFoot',
      'straightBarb',
      'kite',
      'openKite',
      'square',
      'openSquare',
    ]);
    expect(compiled.map(path => path?.commands.at(-1))).toEqual([
      { kind: 'line', to: [89.5, 0] },
      { kind: 'line', to: [90.88, 0] },
      { kind: 'line', to: [99.9, 0] },
      { kind: 'line', to: [93.5, 0] },
      { kind: 'line', to: [99.9, 0] },
      { kind: 'line', to: [89.5, 0] },
      { kind: 'line', to: [90.88, 0] },
      { kind: 'line', to: [92.5, 0] },
      { kind: 'line', to: [93.5, 0] },
    ]);
    expect(compiled.map(path => [path?.arrowEnd?.markerWidth, path?.arrowEnd?.markerHeight])).toEqual([
      [11, 6],
      [11, 6],
      [8, 8],
      [8, 8],
      [8, 8],
      [11, 6],
      [11, 6],
      [8, 8],
      [8, 8],
    ]);
    expect(compiled[0]?.arrowEnd?.marker[0]).toMatchObject({
      type: 'path',
      fill: { kind: 'contextStroke' },
    });
    expect(compiled[1]?.arrowEnd?.marker[0]).toMatchObject({
      type: 'path',
      lineJoin: 'round',
    });
  });

  it('发射 TikZ 钻石和风筝系列，具有冻结的固体和开放的几何形状', () => {
    const context = {
      params: {},
      stroke: '#123456',
      fill: '#abcdef',
      lineWidth: 2,
      round: (value: number): number => value,
    };

    expect([...DiamondArrowDefinition.emit(context)]).toEqual([
      {
        type: 'path',
        commands: [
          { kind: 'move', to: [0, 5] },
          { kind: 'line', to: [5, 0] },
          { kind: 'line', to: [10, 5] },
          { kind: 'line', to: [5, 10] },
          { kind: 'close' },
        ],
        fill: '#abcdef',
        stroke: '#123456',
      },
    ]);
    expect([...OpenDiamondArrowDefinition.emit(context)]).toEqual([
      {
        type: 'path',
        commands: [
          { kind: 'move', to: [1, 5] },
          { kind: 'line', to: [5, 1] },
          { kind: 'line', to: [9, 5] },
          { kind: 'line', to: [5, 9] },
          { kind: 'close' },
        ],
        fill: 'none',
        stroke: '#123456',
        strokeWidth: 2,
        lineJoin: 'round',
      },
    ]);
    expect([...KiteArrowDefinition.emit(context)]).toEqual([
      {
        type: 'path',
        commands: [
          { kind: 'move', to: [0, 5] },
          { kind: 'line', to: [2.5, 0] },
          { kind: 'line', to: [10, 5] },
          { kind: 'line', to: [2.5, 10] },
          { kind: 'close' },
        ],
        fill: '#abcdef',
        stroke: '#123456',
      },
    ]);
    expect([...OpenKiteArrowDefinition.emit(context)]).toEqual([
      {
        type: 'path',
        commands: [
          { kind: 'move', to: [1, 5] },
          { kind: 'line', to: [3, 1] },
          { kind: 'line', to: [9, 5] },
          { kind: 'line', to: [3, 9] },
          { kind: 'close' },
        ],
        fill: 'none',
        stroke: '#123456',
        strokeWidth: 2,
        lineJoin: 'round',
      },
    ]);
    expect(DiamondArrowDefinition).toMatchObject({ backX: 0, lineContactX: 0 });
    expect(OpenDiamondArrowDefinition).toMatchObject({ backX: 1, hollow: true, lineContactX: 1, tipX: 9 });
    expect(KiteArrowDefinition).toMatchObject({ backX: 0, lineContactX: 0 });
    expect(OpenKiteArrowDefinition).toMatchObject({ backX: 1, hollow: true, lineContactX: 1, tipX: 9 });
  });

  it('发出 TikZ 方形实体和开放几何形状，具有独立的长度和宽度缩放', () => {
    const context = {
      params: {},
      stroke: '#123456',
      fill: '#abcdef',
      lineWidth: 2,
      round: (value: number): number => value,
    };

    expect([...SquareArrowDefinition.emit(context)]).toEqual([
      {
        type: 'path',
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [10, 0] },
          { kind: 'line', to: [10, 10] },
          { kind: 'line', to: [0, 10] },
          { kind: 'close' },
        ],
        fill: '#abcdef',
        stroke: '#123456',
      },
    ]);
    expect([...OpenSquareArrowDefinition.emit(context)]).toEqual([
      {
        type: 'path',
        commands: [
          { kind: 'move', to: [1, 1] },
          { kind: 'line', to: [9, 1] },
          { kind: 'line', to: [9, 9] },
          { kind: 'line', to: [1, 9] },
          { kind: 'close' },
        ],
        fill: 'none',
        stroke: '#123456',
        strokeWidth: 2,
        lineJoin: 'round',
      },
    ]);

    const customizedScene: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'path',
          arrow: { end: { shape: 'openSquare', length: 12, width: 18, lineWidth: 2 } },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      ],
    };
    const customized = firstPath(
      compileToScene(customizedScene, { arrows: [OpenSquareArrowDefinition] }).scene.primitives,
    );

    expect(customized?.commands.at(-1)).toEqual({ kind: 'line', to: [89.7, 0] });
    expect(customized?.arrowEnd).toMatchObject({ markerWidth: 12, markerHeight: 18 });
    // 半线宽接缝换算到 marker 局部坐标，保持箭头尖端位置
    expect(customized?.arrowEnd?.refX).toBeCloseTo((0.5 * 10) / 12);
    expect(SquareArrowDefinition).toMatchObject({ backX: 0, lineContactX: 0 });
    expect(OpenSquareArrowDefinition).toMatchObject({ backX: 1, hollow: true, lineContactX: 1, tipX: 9 });
  });

  it('将新的实体和开放族放置在反向路线的两端', () => {
    const reversed = firstPath(
      compileToScene(
        {
          type: 'scene',
          version: 1,
          children: [
            {
              type: 'path',
              arrow: { start: { shape: 'kite' }, end: { shape: 'openSquare' } },
              children: [
                { type: 'step', kind: 'move', to: [100, 0] },
                { type: 'step', kind: 'line', to: [0, 0] },
              ],
            },
          ],
        },
        { arrows: [KiteArrowDefinition, OpenSquareArrowDefinition] },
      ).scene.primitives,
    );

    expect(reversed?.commands).toEqual([
      { kind: 'move', to: [89.5, 0] },
      { kind: 'line', to: [6.5, 0] },
    ]);
    expect(reversed?.arrowStart?.shape).toBe('kite');
    expect(reversed?.arrowEnd?.shape).toBe('openSquare');
  });

  it('将条形和 crowFoot 发出为确定性开放描边几何形状', () => {
    const context = {
      params: {},
      stroke: { kind: 'contextStroke' } as const,
      fill: { kind: 'contextStroke' } as const,
      lineWidth: 2,
      round: (value: number): number => value,
    };

    expect([...BarArrowDefinition.emit(context)]).toEqual([
      {
        type: 'path',
        commands: [
          { kind: 'move', to: [9, 1] },
          { kind: 'line', to: [9, 9] },
        ],
        fill: 'none',
        stroke: { kind: 'contextStroke' },
        strokeWidth: 2,
      },
    ]);
    expect([...CrowFootArrowDefinition.emit(context)]).toEqual([
      {
        type: 'path',
        commands: [
          { kind: 'move', to: [1, 5] },
          { kind: 'line', to: [9, 1] },
          { kind: 'move', to: [1, 5] },
          { kind: 'line', to: [9, 5] },
          { kind: 'move', to: [1, 5] },
          { kind: 'line', to: [9, 9] },
        ],
        fill: 'none',
        stroke: { kind: 'contextStroke' },
        strokeWidth: 2,
      },
    ]);
    expect(BarArrowDefinition).toMatchObject({ backX: 9, hollow: true, lineContactX: 9, tipX: 9 });
    expect(CrowFootArrowDefinition).toMatchObject({ backX: 1, hollow: true, lineContactX: 1, tipX: 9 });
  });

  it('将 straightBarb 作为一个连续的开放行程路径发出', () => {
    const definition = ExtensionArrowDefinitions.find(candidate => candidate.name === 'straightBarb');

    expect(definition).toBeDefined();

    if (definition === undefined) return;

    expect([
      ...definition.emit({
        params: {},
        stroke: '#123456',
        fill: '#abcdef',
        lineWidth: 2,
        round: (value: number): number => value,
      }),
    ]).toEqual([
      {
        type: 'path',
        commands: [
          { kind: 'move', to: [1, 1] },
          { kind: 'line', to: [9, 5] },
          { kind: 'line', to: [1, 9] },
        ],
        fill: 'none',
        stroke: '#123456',
        strokeWidth: 2,
      },
    ]);
    expect(definition).toMatchObject({ hollow: true, lineContactX: 9, tipX: 9 });
  });

  it('通过 Core 标记几何体将 straightBarb 放置在正向、反向和双端点处', () => {
    const definition = ExtensionArrowDefinitions.find(candidate => candidate.name === 'straightBarb');

    expect(definition).toBeDefined();

    if (definition === undefined) return;

    const customized = firstPath(
      compileToScene(
        {
          type: 'scene',
          version: 1,
          children: [
            {
              type: 'path',
              arrow: { end: { shape: 'straightBarb', length: 12, width: 18, lineWidth: 2, color: '#f00' } },
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [100, 0] },
              ],
            },
          ],
        },
        { arrows: [definition] },
      ).scene.primitives,
    );

    expect(customized?.commands.at(-1)).toEqual({ kind: 'line', to: [99.3, 0] });
    expect(customized?.arrowEnd).toMatchObject({
      shape: 'straightBarb',
      markerWidth: 12,
      markerHeight: 18,
    });
    expect(customized?.arrowEnd?.refX).toBeCloseTo(8 + (0.5 * 10) / 12);
    expect(customized?.arrowEnd?.marker[0]).toMatchObject({ stroke: '#f00', strokeWidth: 2 });

    const reversed = firstPath(
      compileToScene(
        {
          type: 'scene',
          version: 1,
          children: [
            {
              type: 'path',
              arrow: { end: { shape: 'straightBarb' } },
              children: [
                { type: 'step', kind: 'move', to: [100, 0] },
                { type: 'step', kind: 'line', to: [0, 0] },
              ],
            },
          ],
        },
        { arrows: [definition] },
      ).scene.primitives,
    );

    expect(reversed?.commands.at(-1)).toEqual({ kind: 'line', to: [0.1, 0] });

    const doubleEnded = firstPath(
      compileToScene(
        {
          type: 'scene',
          version: 1,
          children: [
            {
              type: 'path',
              arrow: { start: { shape: 'straightBarb' }, end: { shape: 'straightBarb' } },
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [100, 0] },
              ],
            },
          ],
        },
        { arrows: [definition] },
      ).scene.primitives,
    );

    expect(doubleEnded?.commands).toEqual([
      { kind: 'move', to: [0.1, 0] },
      { kind: 'line', to: [99.9, 0] },
    ]);
  });

  it('通过扩展箭头集合发布 straightBarb', () => {
    const definition = ExtensionArrowDefinitions.find(candidate => candidate.name === 'straightBarb');
    const provider = ExtensionArrowProviders.find(
      candidate => candidate.key.capability === 'arrow' && candidate.key.name === 'straightBarb',
    );

    expect(definition).toBeDefined();
    expect(provider).toBeDefined();

    if (definition === undefined || provider === undefined) return;

    expect(provider.makeDefinition([])).toBe(definition);
  });

  it('使用 Core 标记放置来实现视觉覆盖、反向路线和双端点', () => {
    const customizedScene: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'path',
          arrow: { end: { shape: 'bar', length: 12, width: 18, lineWidth: 2, color: '#f00', opacity: 0.4 } },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      ],
    };
    const customized = firstPath(compileToScene(customizedScene, { arrows: [BarArrowDefinition] }).scene.primitives);

    expect(customized?.commands.at(-1)).toEqual({ kind: 'line', to: [99.3, 0] });
    expect(customized?.arrowEnd).toMatchObject({ markerWidth: 12, markerHeight: 18, opacity: 0.4 });
    expect(customized?.arrowEnd?.refX).toBeCloseTo(8 + (0.5 * 10) / 12);
    expect(customized?.arrowEnd?.marker[0]).toMatchObject({ stroke: '#f00', strokeWidth: 2 });

    const reversed = firstPath(
      compileToScene(
        {
          ...arrowScene('crowFoot'),
          children: [
            {
              type: 'path',
              arrow: { end: { shape: 'crowFoot' } },
              children: [
                { type: 'step', kind: 'move', to: [100, 0] },
                { type: 'step', kind: 'line', to: [0, 0] },
              ],
            },
          ],
        },
        { arrows: [CrowFootArrowDefinition] },
      ).scene.primitives,
    );

    expect(reversed?.commands.at(-1)).toEqual({ kind: 'line', to: [6.5, 0] });

    const doubleEnded = firstPath(
      compileToScene(
        {
          type: 'scene',
          version: 1,
          children: [
            {
              type: 'path',
              arrow: { start: { shape: 'bar' }, end: { shape: 'crowFoot' } },
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [100, 0] },
              ],
            },
          ],
        },
        { arrows: [BarArrowDefinition, CrowFootArrowDefinition] },
      ).scene.primitives,
    );

    expect(doubleEnded?.commands).toEqual([
      { kind: 'move', to: [0.1, 0] },
      { kind: 'line', to: [93.5, 0] },
    ]);
  });

  it.each([
    { definition: BarArrowDefinition, shape: 'bar' },
    { definition: CrowFootArrowDefinition, shape: 'crowFoot' },
  ])('使用 $shape 的共享 Core 视觉后置位置', ({ definition, shape }) => {
    const scene: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'path',
          arrow: { end: { shape, scale: 2, endpointOverlap: 1 } },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      ],
    };
    const primitive = firstPath(compileToScene(scene, { arrows: [definition] }).scene.primitives);

    expect(primitive?.commands.at(-1)).toEqual({ kind: 'line', to: [100, 0] });
  });

  it('导出每个可选箭头定义和静态提供者，无需隐式注册', () => {
    const definitions = [
      DiamondArrowDefinition,
      OpenDiamondArrowDefinition,
      BarArrowDefinition,
      CrowFootArrowDefinition,
      StraightBarbArrowDefinition,
      KiteArrowDefinition,
      OpenKiteArrowDefinition,
      SquareArrowDefinition,
      OpenSquareArrowDefinition,
    ];

    expect(definitions.map(definition => definition.name)).toEqual([
      'diamond',
      'openDiamond',
      'bar',
      'crowFoot',
      'straightBarb',
      'kite',
      'openKite',
      'square',
      'openSquare',
    ]);
    expect(DiamondArrowProvider.makeDefinition([])).toBe(DiamondArrowDefinition);
    expect(OpenDiamondArrowProvider.makeDefinition([])).toBe(OpenDiamondArrowDefinition);
    expect(BarArrowProvider.makeDefinition([])).toBe(BarArrowDefinition);
    expect(CrowFootArrowProvider.makeDefinition([])).toBe(CrowFootArrowDefinition);
    expect(StraightBarbArrowProvider.makeDefinition([])).toBe(StraightBarbArrowDefinition);
    expect(KiteArrowProvider.makeDefinition([])).toBe(KiteArrowDefinition);
    expect(OpenKiteArrowProvider.makeDefinition([])).toBe(OpenKiteArrowDefinition);
    expect(SquareArrowProvider.makeDefinition([])).toBe(SquareArrowDefinition);
    expect(OpenSquareArrowProvider.makeDefinition([])).toBe(OpenSquareArrowDefinition);
  });
});
