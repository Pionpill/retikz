import { describe, expect, it } from 'vitest';
import { literal, strictObject, string } from 'zod';

import type {
  CompileObservation,
  CompileObservationContext,
  CompileObserverDefinition,
  IRScene,
  LayoutChildProbeKind,
} from '../../src';
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
    namespace: literal('test'),
    type: literal('observable'),
  }),
  artifactSchema: strictObject({ label: string() }),
  compile: () => ({
    artifact: { label: 'settled' },
    children: [{ type: 'node', position: [0, 0], text: 'visible' }],
  }),
});

const probeReplayComposite = core.defineComposite({
  namespace: 'test',
  type: 'probeReplay',
  schema: core.CompositeBaseSchema.extend({
    namespace: literal('test'),
    type: literal('probeReplay'),
  }),
  artifactSchema: strictObject({ chosen: string() }),
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

describe('Core 观察编译', () => {
  it('保持普通编译不受观察者影响，仅发布最终所属模块输出', () => {
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

  it('仅调度回放的实例并按所属模块键对观察者进行排序', () => {
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

    expect(order).toEqual(['composite:', 'node:replay']);
    expect(result.observerOutputs[0]?.value).toEqual(order);
  });

  it('当观察者按键重复时，在生成主要结果之前失败', () => {
    const definition: CompileObserverDefinition = {
      key: 'duplicate',
      createSession: () => ({ select: () => false, observe: () => undefined, complete: () => null }),
    };

    expect(() => observedCompile(scene([]), {}, [definition, definition])).toThrow(/duplicate.*key|key.*duplicate/i);
  });

  it('完成没有选定事件的观察者', () => {
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

  it('在观察编译期间通过 onWarn 发送主要警告', () => {
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

  it('通过观察上下文暴露出现的 Theme', () => {
    let observedContext: CompileObservationContext | undefined;
    const observer: CompileObserverDefinition = {
      key: 'test/theme-context',
      createSession: () => ({
        select: () => true,
        observe: (_observation, context) => {
          observedContext = context;
        },
        complete: () => null,
      }),
    };

    observedCompile(
      { ...scene([{ namespace: 'test', type: 'observable' }]), theme: { mode: 'dark' } },
      { composites: [observableComposite], padding: 0 },
      [observer],
    );

    expect(observedContext?.theme).toMatchObject({
      mode: 'dark',
      colors: { semantic: { guide: 'hsl(215, 14%, 68%)' } },
    });
    expect(Object.isFrozen(observedContext?.theme)).toBe(true);
  });
});

void (undefined as unknown as LayoutChildProbeKind);
