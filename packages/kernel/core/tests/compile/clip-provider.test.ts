import { describe, expect, it, vi } from 'vitest';
import type { ZodType } from 'zod';
import { literal, number, strictObject } from 'zod';

import type { ClipDefinition, IRClip, IRScene, PathCommand } from '../../src';
import { compileToScene, defineClip, resolveCoreProviderDependencies } from '../../src';

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

type RoundedRectClip = {
  kind: 'roundedRect';
  /** 裁剪参数 */
  params: {
    x: number;
    y: number;
    width: number;
    height: number;
    r: number;
  };
};

const roundedRectClip = (): ClipDefinition =>
  defineClip<RoundedRectClip>({
    kind: 'roundedRect',
    schema: strictObject({
      kind: literal('roundedRect'),
      params: strictObject({
        x: number(),
        y: number(),
        width: number().positive(),
        height: number().positive(),
        r: number().positive(),
      }),
    }),

    lower: spec => {
      const right = spec.params.x + spec.params.width;
      const bottom = spec.params.y + spec.params.height;
      const r = Math.min(spec.params.r, spec.params.width / 2, spec.params.height / 2);
      const commands: Array<PathCommand> = [
        { kind: 'move', to: [spec.params.x + r, spec.params.y] },
        { kind: 'line', to: [right - r, spec.params.y] },
        { kind: 'quad', control: [right, spec.params.y], to: [right, spec.params.y + r] },
        { kind: 'line', to: [right, bottom - r] },
        { kind: 'quad', control: [right, bottom], to: [right - r, bottom] },
        { kind: 'line', to: [spec.params.x + r, bottom] },
        { kind: 'quad', control: [spec.params.x, bottom], to: [spec.params.x, bottom - r] },
        { kind: 'line', to: [spec.params.x, spec.params.y + r] },
        { kind: 'quad', control: [spec.params.x, spec.params.y], to: [spec.params.x + r, spec.params.y] },
        { kind: 'close' },
      ];

      {
        const params = {
          fillRule: 'evenodd' as const,
          commands,
        };
        return {
          commands: params.commands,
          fillRule: params.fillRule,
        };
      }
    },
  });

describe('clip providers', () => {
  it('compiles one same-kind custom definition through options.clips only', () => {
    const scene = compileToScene(
      clippedIr({ kind: 'roundedRect', params: { x: 0, y: 0, width: 40, height: 30, r: 5 } }),
      {
        clips: [roundedRectClip()],
      },
    ).scene;

    expect(scene.resources ?? []).toHaveLength(1);
    expect((scene.resources ?? [])[0]).toMatchObject({
      kind: 'clip',
      id: 'clip-1',
      path: {
        fillRule: 'evenodd' as const,
      },
    });
    expect(scene.primitives[0]).toMatchObject({ type: 'group', clipRef: 'clip-1' });
  });

  it('custom clip kind is rejected at compile time when no provider is registered', () => {
    expect(
      () =>
        compileToScene(clippedIr({ kind: 'roundedRect', params: { x: 0, y: 0, width: 40, height: 30, r: 5 } })).scene,
    ).toThrow(/Unknown provider .*available: rect/i);
  });

  it('custom clip cannot override builtin clip kinds', () => {
    const rectOverride = defineClip({
      kind: 'rect',
      schema: strictObject({ kind: literal('rect'), params: strictObject({}) }),

      lower: () => {
        return {
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [1, 1] },
          ],
          fillRule: 'nonzero',
        };
      },
    });

    expect(
      () =>
        compileToScene(clippedIr({ kind: 'rect', params: { x: 0, y: 0, width: 10, height: 10 } }), {
          clips: [rectOverride],
        }).scene,
    ).toThrow(/duplicate clip registration/i);
  });

  it('rejects a provider key whose complete definition has another kind', () => {
    const definition = defineClip({
      kind: 'other',
      schema: strictObject({ kind: literal('other'), params: strictObject({}) }),

      lower: () => {
        return {
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [1, 1] },
          ],
          fillRule: 'nonzero',
        };
      },
    });

    expect(() =>
      resolveCoreProviderDependencies({
        contributions: [
          {
            roots: [{ capability: 'clip', name: 'roundedRect' }],
            providers: [
              {
                key: { capability: 'clip', name: 'roundedRect' },
                makeDefinition: () => definition,
              },
            ],
          },
        ],
      }),
    ).toThrow(/provider clip:roundedRect returned definition other/i);
  });

  it('rejects a provider schema that transforms the authored kind before lower', () => {
    const lower = vi.fn(() => ({
      commands: [
        { kind: 'move' as const, to: [0, 0] as [number, number] },
        { kind: 'line' as const, to: [1, 1] as [number, number] },
      ],
      fillRule: 'nonzero' as const,
    }));
    const definition = defineClip({
      kind: 'schemaTransform',
      schema: strictObject({ kind: literal('schemaTransform'), params: strictObject({}) }).transform(() => ({
        kind: 'other' as const,
        params: {},
      })) as unknown as ZodType<{ kind: 'schemaTransform'; params: Record<string, never> }>,
      lower,
    });

    expect(() => compileToScene(clippedIr({ kind: 'schemaTransform', params: {} }), { clips: [definition] })).toThrow(
      /clip:schemaTransform.*kind.*other/i,
    );
    expect(lower).not.toHaveBeenCalled();
  });

  it('compiles JSON schema transforms into clip path commands', () => {
    const definition = defineClip({
      kind: 'scaledClip',
      schema: strictObject({ kind: literal('scaledClip'), params: strictObject({ size: number() }) }).transform(
        spec => ({ kind: spec.kind, params: { diameter: spec.params.size * 2 } }),
      ),

      lower: spec => {
        const params = { radius: spec.params.diameter / 2 };
        return {
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [params.radius, params.radius] },
          ],
          fillRule: 'nonzero',
        };
      },
    });

    const { scene } = compileToScene(clippedIr({ kind: 'scaledClip', params: { size: 6 } }), { clips: [definition] });
    expect(scene.resources).toMatchObject([
      {
        kind: 'clip',
        path: {
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [6, 6] },
          ],
          fillRule: 'nonzero',
        },
      },
    ]);
  });
});
