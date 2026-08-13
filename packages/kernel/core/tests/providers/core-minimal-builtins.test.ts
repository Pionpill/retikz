import { describe, expect, it } from 'vitest';

import type { IRScene } from '../../src';

import {
  BUILTIN_ARROWS,
  BUILTIN_CLIPS,
  BUILTIN_PATH_GENERATORS,
  BUILTIN_SHAPES,
  compileToScene,
} from '../../src';

const scene = (children: IRScene['children']): IRScene => ({ version: 1, type: 'scene', children });

describe('Core minimal builtin providers', () => {
  it('keeps only the base shape, arrow, clip, and path-generator collections', () => {
    expect(BUILTIN_SHAPES.map(definition => definition.name)).toEqual(['rectangle', 'ellipse', 'polygon']);
    expect(BUILTIN_ARROWS.map(definition => definition.name)).toEqual(['normal', 'stealth']);
    expect(BUILTIN_CLIPS.map(definition => definition.kind)).toEqual(['rect', 'circle', 'ellipse', 'polygon', 'path']);
    expect(BUILTIN_PATH_GENERATORS).toEqual([]);
  });

  it('requires optional Standard definitions when IR names an optional provider', () => {
    expect(() =>
      compileToScene(scene([{ type: 'node', position: [0, 0], shape: 'cross' }]), { padding: 0 }),
    ).toThrow(/Unknown shape 'cross'.*options\.shapes/i);

    expect(() =>
      compileToScene(
        scene([
          {
            type: 'path',
            marks: [{ pos: 1, mark: { kind: 'arrow', shape: 'open' } }],
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0] },
            ],
          },
        ]),
        { padding: 0 },
      ),
    ).toThrow(/Unknown arrow shape 'open'.*options\.arrows/i);

    expect(() =>
      compileToScene(
        scene([
          {
            type: 'scope',
            clip: { kind: 'compound', children: [{ kind: 'circle', cx: 0, cy: 0, r: 10 }] },
            children: [],
          },
        ]),
        { padding: 0 },
      ),
    ).toThrow(/Unknown clip 'compound'.*options\.clips/i);

    expect(() =>
      compileToScene(
        scene([
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'generator', name: 'parabola', to: [10, 0], params: { control: [5, -5] } },
            ],
          },
        ]),
        { padding: 0 },
      ),
    ).toThrow(/Unknown path generator 'parabola'.*options\.pathGenerators/i);
  });
});
