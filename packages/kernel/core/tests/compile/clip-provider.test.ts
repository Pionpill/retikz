import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { ClipDefinition, IRClip, IRScene } from '../../src';

import { compileToScene, defineClip } from '../../src';

const clippedIr = (clip: IRClip): IRScene => ({
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'scope',
      clip,
      children: [{ type: 'node', id: 'a', position: [0, 0], text: 'A' }],
    },
  ],
});

const roundedRectClip = (): ClipDefinition =>
  defineClip({
    kind: 'roundedRect',
    schema: z.strictObject({
      kind: z.literal('roundedRect'),
      x: z.number(),
      y: z.number(),
      width: z.number().positive(),
      height: z.number().positive(),
      r: z.number().positive(),
    }),
    resolve: spec => {
      const right = spec.x + spec.width;
      const bottom = spec.y + spec.height;
      const r = Math.min(spec.r, spec.width / 2, spec.height / 2);
      return {
        kind: 'path',
        fillRule: 'evenodd',
        commands: [
          { kind: 'move', to: [spec.x + r, spec.y] },
          { kind: 'line', to: [right - r, spec.y] },
          { kind: 'quad', control: [right, spec.y], to: [right, spec.y + r] },
          { kind: 'line', to: [right, bottom - r] },
          { kind: 'quad', control: [right, bottom], to: [right - r, bottom] },
          { kind: 'line', to: [spec.x + r, bottom] },
          { kind: 'quad', control: [spec.x, bottom], to: [spec.x, bottom - r] },
          { kind: 'line', to: [spec.x, spec.y + r] },
          { kind: 'quad', control: [spec.x, spec.y], to: [spec.x + r, spec.y] },
          { kind: 'close' },
        ],
      };
    },
  });

describe('clip providers', () => {
  it.each(['', ' ', '\u2003', '\ufeff'])('rejects a blank clip provider key with the established error (%j)', kind => {
    expect(() =>
      defineClip({
        kind,
        schema: z.strictObject({ kind: z.literal(kind) }),
        resolve: () => ({ kind: 'circle', cx: 0, cy: 0, r: 1 }),
      }),
    ).toThrowError('clip provider key must be a non-empty string.');
  });

  it('custom clip kind compiles through options.clips into a path clip resource', () => {
    const scene = compileToScene(clippedIr({ kind: 'roundedRect', x: 0, y: 0, width: 40, height: 30, r: 5 }), {
      clips: [roundedRectClip()],
    }).scene;
    expect(scene.resources ?? []).toHaveLength(1);
    expect((scene.resources ?? [])[0]).toMatchObject({
      kind: 'clip',
      id: 'clip-1',
      shape: {
        kind: 'path',
        fillRule: 'evenodd',
      },
    });
    expect(scene.primitives[0]).toMatchObject({ type: 'group', clipRef: 'clip-1' });
  });

  it('custom clip kind is rejected at compile time when no provider is registered', () => {
    expect(
      () => compileToScene(clippedIr({ kind: 'roundedRect', x: 0, y: 0, width: 40, height: 30, r: 5 })).scene,
    ).toThrow(/options\.clips/i);
  });

  it('custom clip cannot override builtin clip kinds', () => {
    const rectOverride = defineClip({
      kind: 'rect',
      schema: z.strictObject({ kind: z.literal('rect') }),
      resolve: () => ({ kind: 'circle', cx: 0, cy: 0, r: 1 }),
    });
    expect(
      () =>
        compileToScene(clippedIr({ kind: 'rect', x: 0, y: 0, width: 10, height: 10 }), { clips: [rectOverride] }).scene,
    ).toThrow(/duplicate clip registration/i);
  });

});
