import { describe, expect, it } from 'vitest';

import type { IRClip, IRScene, PathCommand } from '../../src';

import { compileToScene } from '../../src';

const clippedIr = (clip: IRClip): IRScene => ({
  version: 1,
  type: 'scene',
  children: [{ type: 'scope', clip, children: [{ type: 'node', position: [0, 0], text: 'A' }] }],
});

const rectCommands: Array<PathCommand> = [
  { kind: 'move', to: [1, 2] },
  { kind: 'line', to: [4, 2] },
  { kind: 'line', to: [4, 6] },
  { kind: 'line', to: [1, 6] },
  { kind: 'close' },
];

describe('Core rect Clip definition', () => {
  it('resolves and lowers rect through the complete builtin definition', () => {
    const scene = compileToScene(clippedIr({ kind: 'rect', x: 1, y: 2, width: 3, height: 4 })).scene;

    expect(scene.resources).toEqual([
      {
        kind: 'clip',
        id: 'clip-1',
        path: { commands: rectCommands, fillRule: 'nonzero' },
      },
    ]);
  });

  it('keeps a zero-width rect as a canonical empty clip path', () => {
    const scene = compileToScene(clippedIr({ kind: 'rect', x: 1, y: 2, width: 0, height: 4 })).scene;

    expect(scene.resources).toEqual([
      {
        kind: 'clip',
        id: 'clip-1',
        path: {
          commands: [
            { kind: 'move', to: [1, 2] },
            { kind: 'line', to: [1, 2] },
            { kind: 'line', to: [1, 6] },
            { kind: 'line', to: [1, 6] },
            { kind: 'close' },
          ],
          fillRule: 'nonzero',
        },
      },
    ]);
  });
});
