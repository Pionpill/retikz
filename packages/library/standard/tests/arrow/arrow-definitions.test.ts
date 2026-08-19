import type { IRScene, PathPrim, ScenePrimitive } from '@retikz/core';

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
} from '../../src/arrow';

const arrowScene = (shape: string): IRScene => ({
  type: 'scene',
  version: 1,
  children: [
    {
      type: 'path',
      marks: [{ pos: 1, mark: { kind: 'arrow', shape } }],
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [100, 0] },
      ],
    },
  ],
});

const firstPath = (primitives: ReadonlyArray<ScenePrimitive>): PathPrim | undefined => {
  for (const primitive of primitives) {
    if (primitive.type === 'path') return primitive;
    if (primitive.type === 'group') {
      const path = firstPath(primitive.children);
      if (path !== undefined) return path;
    }
  }
  return undefined;
};

describe('Standard optional arrow definitions', () => {
  it('keeps every explicit optional arrow definition as its own compiled marker geometry', () => {
    const definitions = [
      DiamondArrowDefinition,
      OpenDiamondArrowDefinition,
      BarArrowDefinition,
      CrowFootArrowDefinition,
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
      'kite',
      'openKite',
      'square',
      'openSquare',
    ]);
    expect(compiled.map(path => path?.commands.at(-1))).toEqual([
      { kind: 'line', to: [94.5, 0] },
      { kind: 'line', to: [95.25, 0] },
      { kind: 'line', to: [100.05, 0] },
      { kind: 'line', to: [95.25, 0] },
      { kind: 'line', to: [94.5, 0] },
      { kind: 'line', to: [95.25, 0] },
      { kind: 'line', to: [94.5, 0] },
      { kind: 'line', to: [95.25, 0] },
    ]);
    expect(compiled[0]?.arrowEnd?.marker[0]).toMatchObject({
      type: 'path',
      fill: { kind: 'contextStroke' },
    });
    expect(compiled[1]?.arrowEnd?.marker[0]).toMatchObject({
      type: 'path',
      strokeLinejoin: 'round',
    });
  });

  it('emits TikZ diamond and kite families with their frozen solid and open geometry', () => {
    const context = {
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
          { kind: 'line', to: [5, 2.5] },
          { kind: 'line', to: [10, 5] },
          { kind: 'line', to: [5, 7.5] },
          { kind: 'close' },
        ],
        fill: '#abcdef',
      },
    ]);
    expect([...OpenDiamondArrowDefinition.emit(context)]).toEqual([
      {
        type: 'path',
        commands: [
          { kind: 'move', to: [1, 5] },
          { kind: 'line', to: [5, 3] },
          { kind: 'line', to: [9, 5] },
          { kind: 'line', to: [5, 7] },
          { kind: 'close' },
        ],
        stroke: '#123456',
        strokeWidth: 2,
        strokeLinejoin: 'round',
      },
    ]);
    expect([...KiteArrowDefinition.emit(context)]).toEqual([
      {
        type: 'path',
        commands: [
          { kind: 'move', to: [0, 5] },
          { kind: 'line', to: [2.5, 2.5] },
          { kind: 'line', to: [10, 5] },
          { kind: 'line', to: [2.5, 7.5] },
          { kind: 'close' },
        ],
        fill: '#abcdef',
      },
    ]);
    expect([...OpenKiteArrowDefinition.emit(context)]).toEqual([
      {
        type: 'path',
        commands: [
          { kind: 'move', to: [1, 5] },
          { kind: 'line', to: [3, 3] },
          { kind: 'line', to: [9, 5] },
          { kind: 'line', to: [3, 7] },
          { kind: 'close' },
        ],
        stroke: '#123456',
        strokeWidth: 2,
        strokeLinejoin: 'round',
      },
    ]);
    expect(DiamondArrowDefinition).toMatchObject({ lineContactX: 0 });
    expect(OpenDiamondArrowDefinition).toMatchObject({ hollow: true, lineContactX: 1, tipX: 9 });
    expect(KiteArrowDefinition).toMatchObject({ lineContactX: 0 });
    expect(OpenKiteArrowDefinition).toMatchObject({ hollow: true, lineContactX: 1, tipX: 9 });
  });

  it('emits TikZ square solid and open geometry with independent length and width scaling', () => {
    const context = {
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
        stroke: '#123456',
        strokeWidth: 2,
        strokeLinejoin: 'round',
      },
    ]);

    const customizedScene: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'path',
          marks: [
            {
              pos: 1,
              mark: { kind: 'arrow', shape: 'openSquare', length: 12, width: 18, lineWidth: 2 },
            },
          ],
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
    expect(customized?.arrowEnd).toMatchObject({ refX: 0, markerWidth: 12, markerHeight: 18 });
    expect(SquareArrowDefinition).toMatchObject({ lineContactX: 0 });
    expect(OpenSquareArrowDefinition).toMatchObject({ hollow: true, lineContactX: 1, tipX: 9 });
  });

  it('places the new solid and open families at both ends of a reversed route', () => {
    const reversed = firstPath(
      compileToScene(
        {
          type: 'scene',
          version: 1,
          children: [
            {
              type: 'path',
              marks: [
                { pos: 0, mark: { kind: 'arrow', shape: 'kite' } },
                { pos: 1, mark: { kind: 'arrow', shape: 'openSquare' } },
              ],
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
      { kind: 'move', to: [94.5, 0] },
      { kind: 'line', to: [4.75, 0] },
    ]);
    expect(reversed?.arrowStart?.shape).toBe('kite');
    expect(reversed?.arrowEnd?.shape).toBe('openSquare');
  });

  it('emits bar and crowFoot as deterministic open stroke geometry', () => {
    const context = {
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
        stroke: { kind: 'contextStroke' },
        strokeWidth: 2,
      },
    ]);
    expect(BarArrowDefinition).toMatchObject({ hollow: true, lineContactX: 9, tipX: 9 });
    expect(CrowFootArrowDefinition).toMatchObject({ hollow: true, lineContactX: 1, tipX: 9 });
  });

  it('uses Core marker placement for visual overrides, reverse routes, and double endpoints', () => {
    const customizedScene: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'path',
          marks: [
            {
              pos: 1,
              mark: {
                kind: 'arrow',
                shape: 'bar',
                length: 12,
                width: 18,
                lineWidth: 2,
                color: '#f00',
                opacity: 0.4,
              },
            },
          ],
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      ],
    };
    const customized = firstPath(compileToScene(customizedScene, { arrows: [BarArrowDefinition] }).scene.primitives);
    expect(customized?.commands.at(-1)).toEqual({ kind: 'line', to: [99.3, 0] });
    expect(customized?.arrowEnd).toMatchObject({ refX: 8, markerWidth: 12, markerHeight: 18, opacity: 0.4 });
    expect(customized?.arrowEnd?.marker[0]).toMatchObject({ stroke: '#f00', strokeWidth: 2 });

    const reversed = firstPath(
      compileToScene(
        {
          ...arrowScene('crowFoot'),
          children: [
            {
              type: 'path',
              marks: [{ pos: 1, mark: { kind: 'arrow', shape: 'crowFoot' } }],
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
    expect(reversed?.commands.at(-1)).toEqual({ kind: 'line', to: [4.75, 0] });

    const doubleEnded = firstPath(
      compileToScene(
        {
          type: 'scene',
          version: 1,
          children: [
            {
              type: 'path',
              marks: [
                { pos: 0, mark: { kind: 'arrow', shape: 'bar' } },
                { pos: 1, mark: { kind: 'arrow', shape: 'crowFoot' } },
              ],
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
      { kind: 'move', to: [-0.05, 0] },
      { kind: 'line', to: [95.25, 0] },
    ]);
  });

  it('exports every optional arrow definition and static provider without implicit registration', () => {
    const definitions = [
      DiamondArrowDefinition,
      OpenDiamondArrowDefinition,
      BarArrowDefinition,
      CrowFootArrowDefinition,
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
      'kite',
      'openKite',
      'square',
      'openSquare',
    ]);
    expect(DiamondArrowProvider.makeDefinition({})).toBe(DiamondArrowDefinition);
    expect(OpenDiamondArrowProvider.makeDefinition({})).toBe(OpenDiamondArrowDefinition);
    expect(BarArrowProvider.makeDefinition({})).toBe(BarArrowDefinition);
    expect(CrowFootArrowProvider.makeDefinition({})).toBe(CrowFootArrowDefinition);
    expect(KiteArrowProvider.makeDefinition({})).toBe(KiteArrowDefinition);
    expect(OpenKiteArrowProvider.makeDefinition({})).toBe(OpenKiteArrowDefinition);
    expect(SquareArrowProvider.makeDefinition({})).toBe(SquareArrowDefinition);
    expect(OpenSquareArrowProvider.makeDefinition({})).toBe(OpenSquareArrowDefinition);
  });
});
