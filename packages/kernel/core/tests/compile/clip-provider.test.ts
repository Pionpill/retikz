import { describe, expect, it, vi } from 'vitest';
import type { ZodType } from 'zod';
import { literal, number, strictObject } from 'zod';

import type { ClipDefinition, ClipShape, IRClip, IRScene, PathCommand } from '../../src';
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

type RoundedRectClipShape = ClipShape & {
  kind: 'roundedRect';
  /** 裁剪参数 */
  params: {
    commands: Array<PathCommand>;
    fillRule: 'evenodd';
  };
};

const roundedRectClip = (): ClipDefinition =>
  defineClip<RoundedRectClip, RoundedRectClipShape>({
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
    resolve: spec => {
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

      return {
        kind: 'roundedRect',
        params: {
          fillRule: 'evenodd',
          commands,
        },
      };
    },
    lower: shape => ({
      commands: shape.params.commands,
      fillRule: shape.params.fillRule,
    }),
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
        fillRule: 'evenodd',
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
      resolve: () => ({ kind: 'rect', params: {} }),
      lower: () => ({
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [1, 1] },
        ],
        fillRule: 'nonzero',
      }),
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
      resolve: () => ({ kind: 'other', params: {} }),
      lower: () => ({
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [1, 1] },
        ],
        fillRule: 'nonzero',
      }),
    });

    expect(() =>
      resolveCoreProviderDependencies({
        contributions: [
          {
            roots: [{ capability: 'clip', name: 'roundedRect' }],
            providers: [
              {
                key: { capability: 'clip', name: 'roundedRect' },
                dependencies: [],
                datasets: {},
                makeDefinition: () => definition,
              },
            ],
          },
        ],
      }),
    ).toThrow(/provider clip:roundedRect returned definition other/i);
  });

  it('rejects a provider schema that transforms the authored kind before resolve', () => {
    const resolve = vi.fn(() => ({ kind: 'schemaTransform', params: {} }));
    const definition = defineClip({
      kind: 'schemaTransform',
      schema: strictObject({ kind: literal('schemaTransform'), params: strictObject({}) }).transform(() => ({
        kind: 'other' as const,
        params: {},
      })) as unknown as ZodType<{ kind: 'schemaTransform'; params: Record<string, never> }>,
      resolve,
      lower: () => ({
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [1, 1] },
        ],
        fillRule: 'nonzero',
      }),
    });

    expect(() => compileToScene(clippedIr({ kind: 'schemaTransform', params: {} }), { clips: [definition] })).toThrow(
      /clip:schemaTransform.*kind.*other/i,
    );
    expect(resolve).not.toHaveBeenCalled();
  });

  it('rejects a resolved shape whose kind differs before lower', () => {
    const lower = vi.fn(() => ({
      commands: [
        { kind: 'move' as const, to: [0, 0] as [number, number] },
        { kind: 'line' as const, to: [1, 1] as [number, number] },
      ],
      fillRule: 'nonzero' as const,
    }));
    const definition = defineClip({
      kind: 'resolvedMismatch',
      schema: strictObject({ kind: literal('resolvedMismatch'), params: strictObject({}) }),
      resolve: () => ({ kind: 'other', params: {} }),
      lower,
    });

    expect(() => compileToScene(clippedIr({ kind: 'resolvedMismatch', params: {} }), { clips: [definition] })).toThrow(
      /clip:resolvedMismatch.*kind.*other/i,
    );
    expect(lower).not.toHaveBeenCalled();
  });

  it('passes provider schema transform output directly to resolve', () => {
    const resolve = vi.fn(() => ({ kind: 'nonJsonSpec', params: {} }));
    const definition = defineClip({
      kind: 'nonJsonSpec',
      schema: strictObject({ kind: literal('nonJsonSpec'), params: strictObject({}) }).transform(spec => ({
        ...spec,
        params: { callback: () => undefined },
      })),
      resolve,
      lower: () => ({
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [1, 1] },
        ],
        fillRule: 'nonzero',
      }),
    });

    expect(() => compileToScene(clippedIr({ kind: 'nonJsonSpec', params: {} }), { clips: [definition] })).not.toThrow();
    expect(resolve).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'nonJsonSpec', params: { callback: expect.any(Function) } }),
      expect.any(Object),
    );
  });

  it('rejects non-JSON resolved shape output before lower', () => {
    const lower = vi.fn(() => ({
      commands: [
        { kind: 'move' as const, to: [0, 0] as [number, number] },
        { kind: 'line' as const, to: [1, 1] as [number, number] },
      ],
      fillRule: 'nonzero' as const,
    }));
    const definition = defineClip({
      kind: 'nonJsonShape',
      schema: strictObject({ kind: literal('nonJsonShape'), params: strictObject({}) }),
      resolve: () => ({ kind: 'nonJsonShape', params: { callback: () => undefined } }) as unknown as ClipShape,
      lower,
    });

    expect(() => compileToScene(clippedIr({ kind: 'nonJsonShape', params: {} }), { clips: [definition] })).toThrow(
      /JSON-safe|non-JSON|function/i,
    );
    expect(lower).not.toHaveBeenCalled();
  });
});
