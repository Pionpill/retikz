import { describe, expect, it } from 'vitest';

import type { IRClip, IRScene } from '../../src';

import { BUILTIN_ARROWS, BUILTIN_CLIPS, BUILTIN_PATH_GENERATORS, BUILTIN_SHAPES, compileToScene } from '../../src';

const scene = (children: IRScene['children']): IRScene => ({ version: 1, type: 'scene', children });

describe('Core minimal builtin providers', () => {
  it('keeps only the base shape, arrow, clip, and path-generator collections', () => {
    expect(BUILTIN_SHAPES.map(definition => definition.name)).toEqual(['rectangle', 'ellipse', 'polygon']);
    expect(BUILTIN_ARROWS.map(definition => definition.name)).toEqual([
      'normal',
      'open',
      'stealth',
      'openStealth',
      'circle',
      'openCircle',
    ]);
    expect(BUILTIN_CLIPS.map(definition => definition.kind)).toEqual(['rect']);
    expect(BUILTIN_CLIPS[0]).toEqual(
      expect.objectContaining({
        kind: 'rect',
        schema: expect.anything(),
        resolve: expect.any(Function),
        shapeSchema: expect.anything(),
        lower: expect.any(Function),
      }),
    );
    expect(BUILTIN_PATH_GENERATORS).toEqual([]);
  });

  it('requires optional Standard definitions when IR names an optional provider', () => {
    expect(() => compileToScene(scene([{ type: 'node', position: [0, 0], shape: 'cross' }]), { padding: 0 })).toThrow(
      /Unknown shape 'cross'.*options\.shapes/i,
    );

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

    const optionalClips: Array<{ kind: string; points?: Array<[number, number]>; commands?: Array<unknown> }> = [
      {
        kind: 'polygon',
        points: [
          [0, 0],
          [10, 0],
          [5, 10],
        ],
      },
      { kind: 'path', commands: [{ kind: 'move', to: [0, 0] }] },
    ];
    for (const clip of optionalClips) {
      expect(() => compileToScene(scene([{ type: 'scope', clip, children: [] } as never]), { padding: 0 })).toThrow(
        new RegExp(`Unknown clip '${clip.kind}'.*options\\.clips`, 'i'),
      );
    }

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

  it.each(['circle', 'ellipse'])('requires an optional definition for the %s clip operation', kind => {
    const clip: IRClip = kind === 'circle' ? { kind, cx: 0, cy: 0, r: 10 } : { kind, cx: 0, cy: 0, rx: 10, ry: 5 };

    expect(() => compileToScene(scene([{ type: 'scope', clip, children: [] }]), { padding: 0 })).toThrow(
      new RegExp(`Unknown clip '${kind}'.*options\\.clips`, 'i'),
    );
  });

  it('compiles the built-in hollow stealth arrow without an injected definition', () => {
    expect(() =>
      compileToScene(
        scene([
          {
            type: 'path',
            marks: [{ pos: 1, mark: { kind: 'arrow', shape: 'openStealth' } }],
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [100, 0] },
            ],
          },
        ]),
        { padding: 0 },
      ),
    ).not.toThrow();
  });

  it('compiles the built-in hollow triangle arrow without an injected definition', () => {
    expect(() =>
      compileToScene(
        scene([
          {
            type: 'path',
            marks: [{ pos: 1, mark: { kind: 'arrow', shape: 'open' } }],
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [100, 0] },
            ],
          },
        ]),
        { padding: 0 },
      ),
    ).not.toThrow();
  });

  it('compiles the built-in circle arrows without injected definitions', () => {
    expect(() =>
      compileToScene(
        scene([
          {
            type: 'path',
            marks: [
              { pos: 0, mark: { kind: 'arrow', shape: 'circle' } },
              { pos: 1, mark: { kind: 'arrow', shape: 'openCircle' } },
            ],
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [100, 0] },
            ],
          },
        ]),
        { padding: 0 },
      ),
    ).not.toThrow();
  });
});
