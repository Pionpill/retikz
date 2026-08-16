import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { ClipDefinition, ClipShape, IRClip, IRScene, PathCommand } from '../../src';

import { compileToScene, defineClip, PathCommandSchema, resolveCoreProviderDependencies } from '../../src';

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
  x: number;
  y: number;
  width: number;
  height: number;
  r: number;
};

type RoundedRectClipShape = ClipShape & {
  kind: 'roundedRect';
  commands: Array<PathCommand>;
  fillRule: 'evenodd';
};

const RoundedRectClipShapeSchema: z.ZodType<RoundedRectClipShape> = z.strictObject({
  kind: z.literal('roundedRect'),
  fillRule: z.literal('evenodd'),
  commands: z.array(PathCommandSchema),
});

const roundedRectClip = (): ClipDefinition =>
  defineClip<RoundedRectClip, RoundedRectClipShape>({
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
      const commands: Array<PathCommand> = [
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
      ];
      return {
        kind: 'roundedRect',
        fillRule: 'evenodd',
        commands,
      };
    },
    shapeSchema: RoundedRectClipShapeSchema,
    lower: shape => ({
      commands: shape.commands,
      fillRule: shape.fillRule,
    }),
  });

describe('clip providers', () => {
  it.each(['', ' ', '\u2003', '\ufeff'])('rejects a blank clip provider key with the established error (%j)', kind => {
    expect(() =>
      defineClip({
        kind,
        schema: z.strictObject({ kind: z.literal(kind) }),
        resolve: () => ({ kind }),
        shapeSchema: z.strictObject({ kind: z.literal(kind) }),
        lower: () => ({
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [1, 1] },
          ],
          fillRule: 'nonzero',
        }),
      }),
    ).toThrowError('clip provider key must be a non-empty string.');
  });

  it('compiles one same-kind custom definition through options.clips only', () => {
    const scene = compileToScene(clippedIr({ kind: 'roundedRect', x: 0, y: 0, width: 40, height: 30, r: 5 }), {
      clips: [roundedRectClip()],
    }).scene;
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
      () => compileToScene(clippedIr({ kind: 'roundedRect', x: 0, y: 0, width: 40, height: 30, r: 5 })).scene,
    ).toThrow(/options\.clips/i);
  });

  it('custom clip cannot override builtin clip kinds', () => {
    const rectOverride = defineClip({
      kind: 'rect',
      schema: z.strictObject({ kind: z.literal('rect') }),
      resolve: () => ({ kind: 'rect' }),
      shapeSchema: z.strictObject({ kind: z.literal('rect') }),
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
        compileToScene(clippedIr({ kind: 'rect', x: 0, y: 0, width: 10, height: 10 }), { clips: [rectOverride] }).scene,
    ).toThrow(/duplicate clip registration/i);
  });

  it('rejects a provider key whose complete definition has another kind', () => {
    const definition = defineClip({
      kind: 'other',
      schema: z.strictObject({ kind: z.literal('other') }),
      resolve: () => ({ kind: 'other' }),
      shapeSchema: z.strictObject({ kind: z.literal('other') }),
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
    const resolve = vi.fn(() => ({ kind: 'schemaTransform' }));
    const definition = defineClip({
      kind: 'schemaTransform',
      schema: z.strictObject({ kind: z.literal('schemaTransform') }).transform(() => ({
        kind: 'other' as const,
      })) as unknown as z.ZodType<{ kind: 'schemaTransform' }>,
      resolve,
      shapeSchema: z.strictObject({ kind: z.literal('schemaTransform') }),
      lower: () => ({
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [1, 1] },
        ],
        fillRule: 'nonzero',
      }),
    });

    expect(() => compileToScene(clippedIr({ kind: 'schemaTransform' }), { clips: [definition] })).toThrow(
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
      schema: z.strictObject({ kind: z.literal('resolvedMismatch') }),
      resolve: () => ({ kind: 'other' }),
      shapeSchema: z.strictObject({ kind: z.string() }),
      lower,
    });

    expect(() => compileToScene(clippedIr({ kind: 'resolvedMismatch' }), { clips: [definition] })).toThrow(
      /clip:resolvedMismatch.*kind.*other/i,
    );
    expect(lower).not.toHaveBeenCalled();
  });

  it('rejects a shape schema that transforms the resolved kind before lower', () => {
    const lower = vi.fn(() => ({
      commands: [
        { kind: 'move' as const, to: [0, 0] as [number, number] },
        { kind: 'line' as const, to: [1, 1] as [number, number] },
      ],
      fillRule: 'nonzero' as const,
    }));
    const definition = defineClip({
      kind: 'shapeTransform',
      schema: z.strictObject({ kind: z.literal('shapeTransform') }),
      resolve: () => ({ kind: 'shapeTransform' }),
      shapeSchema: z.strictObject({ kind: z.literal('shapeTransform') }).transform(() => ({ kind: 'other' as const })),
      lower,
    });

    expect(() => compileToScene(clippedIr({ kind: 'shapeTransform' }), { clips: [definition] })).toThrow(
      /clip:shapeTransform.*kind.*other/i,
    );
    expect(lower).not.toHaveBeenCalled();
  });

  it('rejects non-JSON provider schema output before resolve', () => {
    const resolve = vi.fn(() => ({ kind: 'nonJsonSpec' }));
    const definition = defineClip({
      kind: 'nonJsonSpec',
      schema: z
        .strictObject({ kind: z.literal('nonJsonSpec') })
        .transform(spec => ({ ...spec, callback: () => undefined })),
      resolve,
      shapeSchema: z.strictObject({ kind: z.literal('nonJsonSpec') }),
      lower: () => ({
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [1, 1] },
        ],
        fillRule: 'nonzero',
      }),
    });

    expect(() => compileToScene(clippedIr({ kind: 'nonJsonSpec' }), { clips: [definition] })).toThrow(
      /JSON-safe|non-JSON/i,
    );
    expect(resolve).not.toHaveBeenCalled();
  });

  it('rejects non-JSON resolved shape output before shape parsing and lower', () => {
    const lower = vi.fn(() => ({
      commands: [
        { kind: 'move' as const, to: [0, 0] as [number, number] },
        { kind: 'line' as const, to: [1, 1] as [number, number] },
      ],
      fillRule: 'nonzero' as const,
    }));
    const definition = defineClip({
      kind: 'nonJsonShape',
      schema: z.strictObject({ kind: z.literal('nonJsonShape') }),
      resolve: () => ({ kind: 'nonJsonShape', callback: () => undefined }) as unknown as ClipShape,
      shapeSchema: z.strictObject({ kind: z.literal('nonJsonShape') }),
      lower,
    });

    expect(() => compileToScene(clippedIr({ kind: 'nonJsonShape' }), { clips: [definition] })).toThrow(
      /JSON-safe|non-JSON|function/i,
    );
    expect(lower).not.toHaveBeenCalled();
  });

  it('rejects non-JSON shape schema output before lower', () => {
    const lower = vi.fn(() => ({
      commands: [
        { kind: 'move' as const, to: [0, 0] as [number, number] },
        { kind: 'line' as const, to: [1, 1] as [number, number] },
      ],
      fillRule: 'nonzero' as const,
    }));
    const definition = defineClip({
      kind: 'nonJsonParsedShape',
      schema: z.strictObject({ kind: z.literal('nonJsonParsedShape') }),
      resolve: () => ({ kind: 'nonJsonParsedShape' }),
      shapeSchema: z
        .strictObject({ kind: z.literal('nonJsonParsedShape') })
        .transform(shape => ({ ...shape, callback: () => undefined })),
      lower,
    });

    expect(() => compileToScene(clippedIr({ kind: 'nonJsonParsedShape' }), { clips: [definition] })).toThrow(
      /shapeSchema.*non-JSON/i,
    );
    expect(lower).not.toHaveBeenCalled();
  });
});
