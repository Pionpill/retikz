import type { ClipDefinition, IRScene } from '@retikz/core';

import { compileToScene, defineClip } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { CompoundClipDefinition, CompoundClipProvider, CompoundClipSchema } from '../../src/clip';

const roundedRectClip = (): ClipDefinition =>
  defineClip({
    kind: 'roundedRect',
    schema: z.strictObject({
      kind: z.literal('roundedRect'),
      x: z.number(),
      y: z.number(),
      width: z.number().positive(),
      height: z.number().positive(),
      radius: z.number().positive(),
    }),
    resolve: spec => ({
      kind: 'path',
      commands: [
        { kind: 'move', to: [spec.x, spec.y] },
        { kind: 'line', to: [spec.x + spec.width, spec.y] },
        { kind: 'line', to: [spec.x + spec.width, spec.y + spec.height] },
        { kind: 'close' },
      ],
    }),
  });

describe('Standard compound clip definition', () => {
  it('parses recursive compound children and delegates a custom child to Core registry resolution', () => {
    const clip = CompoundClipSchema.parse({
      kind: 'compound',
      fillRule: 'evenodd',
      children: [
        { kind: 'circle', cx: 20, cy: 20, r: 10 },
        { kind: 'compound', children: [{ kind: 'ellipse', cx: 20, cy: 20, rx: 8, ry: 6 }] },
        { kind: 'roundedRect', x: 0, y: 0, width: 40, height: 40, radius: 4 },
      ],
    });
    const scene: IRScene = {
      type: 'scene',
      version: 1,
      children: [{ type: 'scope', clip, children: [] }],
    };

    const compiled = compileToScene(scene, { clips: [CompoundClipDefinition, roundedRectClip()] }).scene;
    expect(compiled.resources?.[0]).toMatchObject({
      kind: 'clip',
      shape: {
        kind: 'compound',
        fillRule: 'evenodd',
        children: [{ kind: 'circle' }, { kind: 'compound', children: [{ kind: 'ellipse' }] }, { kind: 'path' }],
      },
    });
  });

  it('keeps the compound provider isolated to its static definition', () => {
    expect(CompoundClipProvider.makeDefinition({})).toBe(CompoundClipDefinition);
  });

  it('reports the Standard compound schema diagnostic before compile when children are empty', () => {
    expect(() => CompoundClipSchema.parse({ kind: 'compound', children: [] })).toThrow(/children/i);
  });

  it('requires the Compound definition to be explicitly injected into Core clip resolution', () => {
    const scene: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'scope',
          clip: { kind: 'compound', children: [{ kind: 'circle', cx: 20, cy: 20, r: 10 }] },
          children: [],
        },
      ],
    };

    expect(() => compileToScene(scene)).toThrow(/Unknown clip 'compound'.*options\.clips/i);
  });
});
