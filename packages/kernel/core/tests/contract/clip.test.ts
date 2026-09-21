import { describe, expect, it } from 'vitest';
import type { ZodType } from 'zod';
import { literal, number, strictObject } from 'zod';

import type { ClipShape, IRScene, SceneClipPath } from '../../src';
import { compileToScene, defineClip } from '../../src';

type TicketClip = {
  kind: 'ticket';
  size: number;
};

type TicketClipShape = ClipShape & {
  kind: 'ticket';
  size: number;
};

const TicketClipSchema: ZodType<TicketClip> = strictObject({
  kind: literal('ticket'),
  size: number().positive(),
});

const TicketClipShapeSchema: ZodType<TicketClipShape> = strictObject({
  kind: literal('ticket'),
  size: number().positive(),
});

describe('Clip definition contract', () => {
  it.each(['', ' ', '\u2003', '\ufeff'])('rejects a blank clip kind (%j)', kind => {
    expect(() =>
      defineClip({
        kind,
        schema: strictObject({ kind: literal(kind) }),
        resolve: () => ({ kind }),
        shapeSchema: strictObject({ kind: literal(kind) }),
        lower: (): SceneClipPath => ({
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [1, 1] },
          ],
          fillRule: 'nonzero',
        }),
      }),
    ).toThrowError('clip provider key must be a non-empty string.');
  });

  it('keeps spec parsing, shape parsing, resolve, and lower on one typed definition', () => {
    const definition = defineClip<TicketClip, TicketClipShape>({
      kind: 'ticket',
      schema: TicketClipSchema,
      resolve: spec => ({ kind: 'ticket', size: spec.size }),
      shapeSchema: TicketClipShapeSchema,
      lower: shape => ({
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [shape.size, shape.size] },
        ],
        fillRule: 'nonzero',
      }),
    });

    expect(definition.shapeSchema).toBe(TicketClipShapeSchema);
    expect(
      definition.lower(
        { kind: 'ticket', size: 4 },
        {
          round: value => value,
          lower: () => {
            throw new Error('not used by this contract test');
          },
        },
      ),
    ).toEqual({
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [4, 4] },
      ],
      fillRule: 'nonzero',
    });
  });

  it('derives identity resolve and shapeSchema from a ClipShape schema', () => {
    const definition = defineClip({
      kind: 'ticket',
      schema: TicketClipShapeSchema,
      lower: shape => ({
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [shape.size, shape.size] },
        ],
        fillRule: 'nonzero',
      }),
    });
    const spec = { kind: 'ticket', size: 4 } as const;

    expect(definition.shapeSchema).toBe(TicketClipShapeSchema);
    expect(definition.resolve(spec, { round: value => value, resolve: () => spec })).toBe(spec);

    const scene: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'scope', clip: spec, children: [] }],
    };
    expect(compileToScene(scene, { clips: [definition] }).scene.resources).toMatchObject([
      {
        kind: 'clip',
        path: {
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [4, 4] },
          ],
        },
      },
    ]);
  });
});
