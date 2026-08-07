import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { CompileObservation, CompileObserverDefinition, IRScene, LayoutChildProbeKindValue } from '../../src';

import * as core from '../../src';

const scene = (children: IRScene['children']): IRScene => ({ version: 1, type: 'scene', children });

const observedCompile = (
  ir: IRScene,
  options: Record<string, unknown>,
  observers: ReadonlyArray<CompileObserverDefinition>,
) => {
  const compile = Reflect.get(core, 'observeCompileToScene') as
    | ((
        source: IRScene,
        compileOptions: Record<string, unknown>,
        definitions: ReadonlyArray<CompileObserverDefinition>,
      ) => unknown)
    | undefined;
  expect(compile).toBeTypeOf('function');
  if (compile === undefined) throw new Error('observeCompileToScene is not available');
  return compile(ir, options, observers) as {
    primary: { scene: unknown; artifacts: ReadonlyArray<unknown> };
    observerOutputs: ReadonlyArray<{ key: string; value: unknown }>;
  };
};

const observableComposite = core.defineComposite({
  namespace: 'test',
  type: 'observable',
  schema: core.CompositeBaseSchema.extend({
    namespace: z.literal('test'),
    type: z.literal('observable'),
  }),
  artifactSchema: z.strictObject({ label: z.string() }),
  compile: () => ({
    artifact: { label: 'settled' },
    children: [{ type: 'node', position: [0, 0], text: 'visible' }],
  }),
});

const probeReplayComposite = core.defineComposite({
  namespace: 'test',
  type: 'probeReplay',
  schema: core.CompositeBaseSchema.extend({
    namespace: z.literal('test'),
    type: z.literal('probeReplay'),
  }),
  artifactSchema: z.strictObject({ chosen: z.string() }),
  compile: (_, context) => {
    context.layoutChild({ type: 'node', position: [0, 0], text: 'discarded' }, core.NaturalLayoutProposal);
    const selected = context.layoutChild(
      { type: 'node', position: [0, 0], text: 'selected' },
      core.NaturalLayoutProposal,
    );
    if (selected.kind !== core.LayoutChildProbeKind.Resolved) return { children: [] };
    return {
      artifact: { chosen: 'selected' },
      children: [context.replay(selected.result)],
    };
  },
});

describe('Core observed compile', () => {
  it('keeps ordinary compile free of observers and publishes final owner output only', () => {
    const events: Array<CompileObservation> = [];
    let sessions = 0;
    let completes = 0;
    const observer: CompileObserverDefinition = {
      key: 'test/owner-output',
      createSession: () => {
        sessions += 1;
        return {
          select: site => site.owner.kind === 'composite',
          observe: observation => events.push(observation),
          complete: () => {
            completes += 1;
            return { count: events.length };
          },
        };
      },
    };

    const ordinary = core.compileToScene(scene([{ namespace: 'test', type: 'observable' }]), {
      composites: [observableComposite],
      padding: 0,
    });
    expect('inspection' in ordinary).toBe(false);
    expect(sessions).toBe(0);

    const result = observedCompile(
      scene([{ namespace: 'test', type: 'observable' }]),
      { composites: [observableComposite], padding: 0 },
      [observer],
    );

    expect(sessions).toBe(1);
    expect(completes).toBe(1);
    expect(result.observerOutputs).toEqual([{ key: 'test/owner-output', value: { count: 1 } }]);
    expect(events).toHaveLength(1);
    expect(events[0]?.owner).toEqual({ kind: 'composite', namespace: 'test', type: 'observable' });
    expect(events[0]?.value).toEqual({ label: 'settled' });
    expect(events[0]?.provenance.final).toEqual(events[0]?.occurrence);
    expect(events[0]?.provenance.origin).toEqual(events[0]?.occurrence);
    expect(Object.isFrozen(events[0]?.value)).toBe(true);
    expect(result.primary.scene).toEqual(ordinary.scene);
    expect(result.primary.artifacts).toEqual(ordinary.artifacts);
  });

  it('dispatches only the replayed occurrence and sorts observers by owner key', () => {
    const order: Array<string> = [];
    const observer: CompileObserverDefinition = {
      key: 'test/ordered',
      createSession: () => ({
        select: () => true,
        observe: observation => {
          order.push(
            `${observation.owner.kind}:${observation.occurrence.expansionPath.map(segment => segment.kind).join('/')}`,
          );
        },
        complete: () => order.slice(),
      }),
    };

    const result = observedCompile(
      scene([{ namespace: 'test', type: 'probeReplay' }]),
      { composites: [probeReplayComposite], padding: 0 },
      [observer],
    );

    expect(order).toHaveLength(1);
    expect(order[0]).toContain('composite');
    expect(result.observerOutputs[0]?.value).toEqual(order);
  });

  it('fails before producing a primary result when observer keys repeat', () => {
    const definition: CompileObserverDefinition = {
      key: 'duplicate',
      createSession: () => ({ select: () => false, observe: () => undefined, complete: () => null }),
    };
    expect(() => observedCompile(scene([]), {}, [definition, definition])).toThrow(/duplicate.*key|key.*duplicate/i);
  });

  it('completes an observer with no selected events', () => {
    let completed = 0;
    const result = observedCompile(scene([]), {}, [
      {
        key: 'empty',
        createSession: () => ({
          select: () => false,
          observe: () => undefined,
          complete: () => {
            completed += 1;
            return [];
          },
        }),
      },
    ]);
    expect(completed).toBe(1);
    expect(result.observerOutputs).toEqual([{ key: 'empty', value: [] }]);
  });

  it('dispatches primary warnings through onWarn during observed compile', () => {
    const warnings: Array<unknown> = [];
    const observer: CompileObserverDefinition = {
      key: 'test/warnings',
      createSession: () => ({ select: () => false, observe: () => undefined, complete: () => null }),
    };

    observedCompile(
      scene([{ namespace: 'missing', type: 'composite' }]),
      { onWarn: (warning: unknown) => warnings.push(warning) },
      [observer],
    );

    expect(warnings).toHaveLength(1);
  });
});

void (undefined as unknown as LayoutChildProbeKindValue);
