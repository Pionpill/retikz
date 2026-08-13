import type { IRScene, MarkerEllipsePrim, MarkerPathPrim, PathPrim, ScenePrimitive } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import {
  CircleArrowDefinition,
  CircleArrowProvider,
  DiamondArrowDefinition,
  DiamondArrowProvider,
  OpenArrowDefinition,
  OpenArrowProvider,
  OpenCircleArrowDefinition,
  OpenCircleArrowProvider,
  OpenDiamondArrowDefinition,
  OpenDiamondArrowProvider,
  OpenStealthArrowDefinition,
  OpenStealthArrowProvider,
} from '../../src/arrow';

const scene: IRScene = {
  type: 'scene',
  version: 1,
  children: [
    {
      type: 'path',
      marks: [{ pos: 1, mark: { kind: 'arrow', shape: 'openStealth' } }],
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [100, 0] },
      ],
    },
  ],
};

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
  it('compiles openStealth with its hollow marker and shrink geometry', () => {
    const path = firstPath(compileToScene(scene, { arrows: [OpenStealthArrowDefinition] }).scene.primitives);
    const marker = path?.arrowEnd?.marker.find((primitive): primitive is MarkerPathPrim => primitive.type === 'path');

    expect(path?.commands.at(-1)).toEqual({ kind: 'line', to: [95.95, 0] });
    expect(marker?.commands).toEqual([
      { kind: 'move', to: [1, 1] },
      { kind: 'line', to: [9, 5] },
      { kind: 'line', to: [1, 9] },
      { kind: 'line', to: [3, 5] },
      { kind: 'close' },
    ]);
    expect(marker?.strokeLinejoin).toBe('miter');
  });

  it('keeps every explicit optional arrow definition as its own compiled marker geometry', () => {
    const definitions = [
      OpenArrowDefinition,
      OpenStealthArrowDefinition,
      DiamondArrowDefinition,
      OpenDiamondArrowDefinition,
      CircleArrowDefinition,
      OpenCircleArrowDefinition,
    ];
    const compiled = definitions.map(definition =>
      firstPath(compileToScene(arrowScene(definition.name), { arrows: [definition] }).scene.primitives),
    );

    expect(compiled.map(path => path?.arrowEnd?.shape)).toEqual([
      'open',
      'openStealth',
      'diamond',
      'openDiamond',
      'circle',
      'openCircle',
    ]);
    expect(compiled.map(path => path?.commands.at(-1))).toEqual([
      { kind: 'line', to: [94.75, 0] },
      { kind: 'line', to: [95.95, 0] },
      { kind: 'line', to: [94, 0] },
      { kind: 'line', to: [94.75, 0] },
      { kind: 'line', to: [94, 0] },
      { kind: 'line', to: [94, 0] },
    ]);
    expect(compiled[0]?.arrowEnd?.marker[0]).toMatchObject({
      type: 'path',
      stroke: { kind: 'contextStroke' },
      strokeWidth: 1.5,
    });
    expect(compiled[2]?.arrowEnd?.marker[0]).toMatchObject({
      type: 'path',
      fill: { kind: 'contextStroke' },
    });
    expect(compiled[3]?.arrowEnd?.marker[0]).toMatchObject({
      type: 'path',
      strokeLinejoin: 'round',
    });
    const filledCircle = compiled[4]?.arrowEnd?.marker[0] as MarkerEllipsePrim | undefined;
    const hollowCircle = compiled[5]?.arrowEnd?.marker[0] as MarkerEllipsePrim | undefined;
    expect(filledCircle).toMatchObject({ type: 'ellipse', cx: 5, cy: 5, rx: 5, ry: 5 });
    expect(hollowCircle).toMatchObject({ type: 'ellipse', cx: 5, cy: 5, rx: 4.25, ry: 4.25, strokeWidth: 1.5 });
  });

  it('exports every optional arrow definition and static provider without implicit registration', () => {
    const definitions = [
      OpenArrowDefinition,
      OpenStealthArrowDefinition,
      DiamondArrowDefinition,
      OpenDiamondArrowDefinition,
      CircleArrowDefinition,
      OpenCircleArrowDefinition,
    ];

    expect(definitions.map(definition => definition.name)).toEqual([
      'open',
      'openStealth',
      'diamond',
      'openDiamond',
      'circle',
      'openCircle',
    ]);
    expect(OpenArrowProvider.makeDefinition({})).toBe(OpenArrowDefinition);
    expect(OpenStealthArrowProvider.makeDefinition({})).toBe(OpenStealthArrowDefinition);
    expect(DiamondArrowProvider.makeDefinition({})).toBe(DiamondArrowDefinition);
    expect(OpenDiamondArrowProvider.makeDefinition({})).toBe(OpenDiamondArrowDefinition);
    expect(CircleArrowProvider.makeDefinition({})).toBe(CircleArrowDefinition);
    expect(OpenCircleArrowProvider.makeDefinition({})).toBe(OpenCircleArrowDefinition);
  });
});
