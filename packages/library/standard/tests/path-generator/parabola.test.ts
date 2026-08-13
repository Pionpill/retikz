import type { IRScene, ScenePrimitive } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { ParabolaPathGeneratorDefinition, ParabolaPathGeneratorProvider } from '../../src/path-generator';

const firstPath = (
  primitives: ReadonlyArray<ScenePrimitive>,
): Extract<ScenePrimitive, { type: 'path' }> | undefined => {
  for (const primitive of primitives) {
    if (primitive.type === 'path') return primitive;
    if (primitive.type === 'group') {
      const path = firstPath(primitive.children);
      if (path !== undefined) return path;
    }
  }
  return undefined;
};

describe('Standard parabola path generator definition', () => {
  it('resolves the control target and emits a quadratic command', () => {
    const scene: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        { type: 'coordinate', id: 'control', position: [50, 60] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'generator', name: 'parabola', to: [100, 0], params: { control: { id: 'control' } } },
          ],
        },
      ],
    };

    expect(
      firstPath(compileToScene(scene, { pathGenerators: [ParabolaPathGeneratorDefinition] }).scene.primitives)
        ?.commands,
    ).toEqual([
      { kind: 'move', to: [0, 0] },
      { kind: 'quad', control: [50, 60], to: [100, 0] },
    ]);
  });

  it('keeps the missing destination diagnostic and static provider identity', () => {
    const scene: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'generator', name: 'parabola', params: { control: [50, 60] } },
          ],
        },
      ],
    };

    expect(() => compileToScene(scene, { pathGenerators: [ParabolaPathGeneratorDefinition] })).toThrow(
      'path generator "parabola" requires step.to.',
    );
    expect(ParabolaPathGeneratorProvider.makeDefinition({})).toBe(ParabolaPathGeneratorDefinition);
  });

  it('requires the Standard Parabola definition to be explicitly injected', () => {
    const scene: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'generator', name: 'parabola', to: [100, 0], params: { control: [50, 60] } },
          ],
        },
      ],
    };

    expect(() => compileToScene(scene)).toThrow(/Unknown path generator 'parabola'.*options\.pathGenerators/i);
  });

  it('keeps control payload validation on the explicitly injected Definition', () => {
    const scene: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            {
              type: 'step',
              kind: 'generator',
              name: 'parabola',
              to: [100, 0],
              params: { control: 'not-a-target' },
            },
          ],
        },
      ],
    };

    expect(() => compileToScene(scene, { pathGenerators: [ParabolaPathGeneratorDefinition] })).toThrow(
      /path generator 'parabola' failed params validation[\s\S]*control/i,
    );
  });
});
