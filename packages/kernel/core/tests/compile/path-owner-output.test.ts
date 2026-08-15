import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { CompileObserverDefinition, IRScene } from '../../src';

import * as core from '../../src';

const steps = [
  { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
  { type: 'step' as const, kind: 'line' as const, to: [10, 0] as [number, number] },
];

const scene = (children: IRScene['children']): IRScene => ({ version: 1, type: 'scene', children });

const observe = (ownerKind: 'pathKind' | 'composite' = 'pathKind'): CompileObserverDefinition => ({
  key: 'path-owner-output',
  createSession: () => ({
    select: site => site.owner.kind === ownerKind,
    observe: () => undefined,
    complete: () => null,
  }),
});

describe('Core Path owner output', () => {
  it('requests and publishes a typed output exactly once for a non-empty Path', () => {
    let requested = false;
    let publishCount = 0;
    const ownerOutput = { schema: z.strictObject({ label: z.string() }) };
    const kind = core.definePathKind({
      name: 'owner-output',
      schema: core.PathSchema.extend({ kind: z.literal('owner-output') }),
      ownerOutput,
      compile: context => {
        requested = context.ownerOutput.requested;
        context.ownerOutput.publish({ label: 'path-output' });
        publishCount += 1;
        return {
          primitives: [{ type: 'rect', x: 0, y: 0, width: 10, height: 1 }],
          boundsPoints: [
            [0, 0],
            [10, 1],
          ],
        };
      },
    });
    const compile = Reflect.get(core, 'observeCompileToScene') as
      | ((
          ir: IRScene,
          options: Record<string, unknown>,
          observers: ReadonlyArray<CompileObserverDefinition>,
        ) => {
          observerOutputs: ReadonlyArray<{ key: string; value: unknown }>;
        })
      | undefined;
    expect(compile).toBeTypeOf('function');
    if (compile === undefined) throw new Error('observeCompileToScene is not available');

    const result = compile(
      scene([{ type: 'path', kind: 'owner-output', children: steps }]),
      { pathKinds: [kind], padding: 0 },
      [observe()],
    );

    expect(requested).toBe(true);
    expect(publishCount).toBe(1);
    expect(result.observerOutputs).toEqual([{ key: 'path-owner-output', value: null }]);
  });

  it('keeps owner output lazy for an ordinary compile', () => {
    let requested = true;
    let published = 0;
    const kind = core.definePathKind({
      name: 'lazy-owner-output',
      schema: core.PathSchema.extend({ kind: z.literal('lazy-owner-output') }),
      ownerOutput: { schema: z.strictObject({ value: z.number() }) },
      compile: context => {
        requested = context.ownerOutput.requested;
        if (context.ownerOutput.requested) {
          context.ownerOutput.publish({ value: 1 });
          published += 1;
        }
        return { primitives: [], boundsPoints: [] };
      },
    });

    const result = core.compileToScene(scene([{ type: 'path', kind: 'lazy-owner-output', children: steps }]), {
      pathKinds: [kind],
      padding: 0,
    });
    expect(result.scene.primitives).toEqual([]);
    expect(requested).toBe(false);
    expect(published).toBe(0);
  });

  it.each([
    ['missing publish', (publish: (value: { value: number }) => void) => void publish],
    [
      'duplicate publish',
      (publish: (value: { value: number }) => void) => {
        publish({ value: 1 });
        publish({ value: 2 });
      },
    ],
  ])('fails loudly when a requested non-empty Path has %s', (_label, publishOutput) => {
    const kind = core.definePathKind({
      name: `bad-owner-output-${_label.replace(' ', '-')}`,
      schema: core.PathSchema.extend({ kind: z.literal(`bad-owner-output-${_label.replace(' ', '-')}`) }),
      ownerOutput: { schema: z.strictObject({ value: z.number() }) },
      compile: context => {
        publishOutput(context.ownerOutput.publish);
        return {
          primitives: [{ type: 'rect', x: 0, y: 0, width: 1, height: 1 }],
          boundsPoints: [
            [0, 0],
            [1, 1],
          ],
        };
      },
    });
    const compile = Reflect.get(core, 'observeCompileToScene') as
      | ((
          ir: IRScene,
          options: Record<string, unknown>,
          observers: ReadonlyArray<CompileObserverDefinition>,
        ) => unknown)
      | undefined;
    expect(compile).toBeTypeOf('function');
    if (compile === undefined) throw new Error('observeCompileToScene is not available');
    expect(() =>
      compile(scene([{ type: 'path', kind: kind.name, children: steps }]), { pathKinds: [kind], padding: 0 }, [
        observe(),
      ]),
    ).toThrow(/owner output|publish/i);
  });

  it('rejects owner output when a Path kind returns null', () => {
    const kind = core.definePathKind({
      name: 'null-owner-output',
      schema: core.PathSchema.extend({ kind: z.literal('null-owner-output') }),
      ownerOutput: { schema: z.strictObject({ value: z.number() }) },
      compile: context => {
        context.ownerOutput.publish({ value: 1 });
        return null;
      },
    });
    const compile = Reflect.get(core, 'observeCompileToScene') as
      | ((
          ir: IRScene,
          options: Record<string, unknown>,
          observers: ReadonlyArray<CompileObserverDefinition>,
        ) => unknown)
      | undefined;
    expect(compile).toBeTypeOf('function');
    if (compile === undefined) throw new Error('observeCompileToScene is not available');

    expect(() =>
      compile(
        scene([{ type: 'path', kind: 'null-owner-output', children: steps }]),
        { pathKinds: [kind], padding: 0 },
        [observe()],
      ),
    ).toThrow(/owner output|publish/i);
  });
});
