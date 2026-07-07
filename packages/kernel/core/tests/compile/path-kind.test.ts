import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { IRScene, PathPrim, ScenePrimitive } from '../../src';

import { compileToScene, definePathKind } from '../../src';

const steps = [
  { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
  { type: 'step' as const, kind: 'line' as const, to: [100, 0] as [number, number] },
];

const scene = (children: IRScene['children']): IRScene => ({
  version: 1,
  type: 'scene',
  children,
});

const flatten = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> => {
  const out: Array<ScenePrimitive> = [];
  for (const primitive of primitives) {
    out.push(primitive);
    if (primitive.type === 'group') out.push(...flatten(primitive.children));
  }
  return out;
};

const pathPrims = (ir: IRScene, options?: Parameters<typeof compileToScene>[1]): Array<PathPrim> =>
  flatten(compileToScene(ir, { padding: 0, ...options }).primitives).filter(
    (primitive): primitive is PathPrim => primitive.type === 'path',
  );

describe('Path kind registry', () => {
  it('compiles omitted kind as the built-in stroke path kind', () => {
    const [prim] = pathPrims(scene([{ type: 'path', stroke: 'crimson', children: steps }]));

    expect(prim.stroke).toBe('crimson');
    expect(prim.fill).toBe('none');
  });

  it('compiles kind=ribbon through Path with ribbon options', () => {
    const [prim] = pathPrims(
      scene([
        {
          type: 'path',
          kind: 'ribbon',
          color: 'teal',
          ribbon: { width: 10, samples: 2 },
          children: steps,
        },
      ]),
    );

    expect(prim.fill).toBe('teal');
    expect(prim.stroke).toBeUndefined();
    expect(prim.commands.at(-1)).toEqual({ kind: 'close' });
  });

  it('supports boundary ribbon as Path kind=ribbon with ribbon.mode=boundary', () => {
    const [prim] = pathPrims(
      scene([
        {
          type: 'path',
          kind: 'ribbon',
          fill: '#bfdbfe',
          ribbon: {
            mode: 'boundary',
            upper: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0] },
            ],
            lower: [
              { type: 'step', kind: 'move', to: [0, 4] },
              { type: 'step', kind: 'line', to: [10, 4] },
            ],
          },
        },
      ] as IRScene['children']),
    );

    expect(prim.fill).toBe('#bfdbfe');
    expect(prim.commands.at(-1)).toEqual({ kind: 'close' });
  });

  it('throws for unknown path kinds until a provider is registered', () => {
    expect(() =>
      compileToScene(
        scene([{ type: 'path', kind: 'missing', kindOptions: {}, children: steps }] as IRScene['children']),
      ),
    ).toThrow(/Unknown path kind 'missing'/);
  });

  it('lets custom path kinds reuse the built-in stroke emitter', () => {
    const highlight = definePathKind({
      schema: z.object({ kind: z.literal('highlight') }),
      optionsSchema: z.object({ stroke: z.string().min(1) }).strict(),
      compile: context => {
        const base = context.emitStroke(context.path);
        if (base === null) return null;
        return {
          ...base,
          primitives: base.primitives.map(primitive =>
            primitive.type === 'path' ? { ...primitive, stroke: context.options.stroke } : primitive,
          ),
        };
      },
    });

    const [prim] = pathPrims(
      scene([
        {
          type: 'path',
          kind: 'highlight',
          kindOptions: { stroke: 'gold' },
          children: steps,
        },
      ] as IRScene['children']),
      { pathKinds: [highlight] },
    );

    expect(prim.stroke).toBe('gold');
  });

  it('custom_path_kind_options_error_contains_provider_and_ir_path', () => {
    const highlight = definePathKind({
      schema: z.object({ kind: z.literal('highlight') }),
      optionsSchema: z.object({ stroke: z.string().min(1) }).strict(),
      compile: context => context.emitStroke(context.path),
    });
    const ir = scene([
      {
        type: 'path',
        kind: 'highlight',
        kindOptions: { stroke: 42 },
        children: steps,
      },
    ] as IRScene['children']);

    expect(() => compileToScene(ir, { pathKinds: [highlight] })).toThrow(/path kind 'highlight'/);
    expect(() => compileToScene(ir, { pathKinds: [highlight] })).toThrow(/children\[0\]\.path\.kindOptions/);
  });
});
