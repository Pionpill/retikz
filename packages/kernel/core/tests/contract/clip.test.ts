import { describe, expect, it } from 'vitest';
import type { ZodType } from 'zod';
import { literal, number, strictObject } from 'zod';

import type { IRScene } from '../../src';
import { compileToScene, defineClip } from '../../src';

type TicketClip = {
  kind: 'ticket';
  /** 裁剪参数 */
  params: {
    size: number;
  };
};

const TicketClipSchema: ZodType<TicketClip> = strictObject({
  kind: literal('ticket'),
  params: strictObject({
    size: number().positive(),
  }),
});

describe('Clip definition contract', () => {
  it('keeps spec parsing and typed lowering on one typed definition', () => {
    const definition = defineClip<TicketClip>({
      kind: 'ticket',
      schema: TicketClipSchema,

      lower: spec => {
        const params = { size: spec.params.size };
        return {
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [params.size, params.size] },
          ],
          fillRule: 'nonzero',
        };
      },
    });

    expect(
      definition.lower(
        { kind: 'ticket', params: { size: 4 } },
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

  it('compiles a clip directly from parsed parameters', () => {
    const definition = defineClip({
      kind: 'ticket',
      schema: TicketClipSchema,

      lower: spec => {
        return {
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [spec.params.size, spec.params.size] },
          ],
          fillRule: 'nonzero',
        };
      },
    });
    const spec = { kind: 'ticket', params: { size: 4 } } as const;

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
