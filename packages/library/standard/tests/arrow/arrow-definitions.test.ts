import type { IRScene, PathPrim, ScenePrimitive } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import {
  DiamondArrowDefinition,
  DiamondArrowProvider,
  OpenDiamondArrowDefinition,
  OpenDiamondArrowProvider,
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
    const definitions = [DiamondArrowDefinition, OpenDiamondArrowDefinition];
    const compiled = definitions.map(definition =>
      firstPath(compileToScene(arrowScene(definition.name), { arrows: [definition] }).scene.primitives),
    );

    expect(compiled.map(path => path?.arrowEnd?.shape)).toEqual(['diamond', 'openDiamond']);
    expect(compiled.map(path => path?.commands.at(-1))).toEqual([
      { kind: 'line', to: [94, 0] },
      { kind: 'line', to: [94.75, 0] },
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

  it('exports every optional arrow definition and static provider without implicit registration', () => {
    const definitions = [DiamondArrowDefinition, OpenDiamondArrowDefinition];

    expect(definitions.map(definition => definition.name)).toEqual(['diamond', 'openDiamond']);
    expect(DiamondArrowProvider.makeDefinition({})).toBe(DiamondArrowDefinition);
    expect(OpenDiamondArrowProvider.makeDefinition({})).toBe(OpenDiamondArrowDefinition);
  });
});
