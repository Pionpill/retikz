import type { IRScene } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { RibbonPathKindDefinition } from '../../src/ribbon';

const line = [
  { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
  { type: 'step' as const, kind: 'line' as const, to: [10, 0] as [number, number] },
];

const compile = (path: Record<string, unknown>) =>
  compileToScene({ version: 1, type: 'scene', children: [path] } as unknown as IRScene, {
    pathKinds: [RibbonPathKindDefinition],
  }).scene;

describe('Standard Ribbon definition', () => {
  it('maps master color to fill and preserves explicit stroke', () => {
    const scene = compile({
      type: 'path',
      kind: 'ribbon',
      kindOptions: { width: 4, samples: 2 },
      color: 'crimson',
      stroke: 'black',
      children: line,
    });
    expect(scene.primitives.find(value => value.type === 'path')).toMatchObject({
      fill: 'crimson',
      stroke: 'black',
    });
  });

  it('ignores host marks while materializing the centerline', () => {
    const scene = compile({
      type: 'path',
      kind: 'ribbon',
      kindOptions: { width: 4, samples: 2 },
      marks: [{ pos: 0.5, mark: { kind: 'arrow', shape: 'missing' } }],
      children: line,
    });
    expect(scene.primitives.filter(value => value.type === 'path')).toHaveLength(1);
  });

  it('emits a boundary ribbon from both explicit boundary paths', () => {
    const scene = compile({
      type: 'path',
      kind: 'ribbon',
      kindOptions: { mode: 'boundary', upper: line, lower: line.map(step => ({ ...step, to: [step.to[0], -2] })) },
    });
    expect(scene.primitives.find(value => value.type === 'path')).toMatchObject({ fill: 'currentColor' });
  });
});
