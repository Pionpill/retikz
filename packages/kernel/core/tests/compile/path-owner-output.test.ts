import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import type { CompileObserverDefinition, IRScene } from '../../src';
import * as core from '../../src';

const steps = [
  { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
  { type: 'step' as const, kind: 'line' as const, to: [10, 0] as [number, number] },
];

const scene = (children: IRScene['children']): IRScene => ({ version: 1, type: 'scene', children });

const observe = (ownerKind: 'path' | 'composite' = 'path'): CompileObserverDefinition => ({
  key: 'path-owner-output',
  createSession: () => ({
    select: site => site.owner.kind === ownerKind,
    observe: () => undefined,
    complete: () => null,
  }),
});

describe('Core Path 所属模块输出', () => {
  it('为非空 Path 请求并发布一次类型化输出', () => {
    let requested = false;
    let publishCount = 0;
    const kind = core.definePath<core.IRPathBase, { label: string }>({
      name: 'owner-output',
      schema: core.PathSchema.extend({ kind: literal('owner-output') }),
      ownerOutput: true,
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
      { paths: [kind], padding: 0 },
      [observe()],
    );

    expect(requested).toBe(true);
    expect(publishCount).toBe(1);
    expect(result.observerOutputs).toEqual([{ key: 'path-owner-output', value: null }]);
  });

  it('使普通编译的所属模块输出保持惰性', () => {
    let requested = true;
    let published = 0;
    const kind = core.definePath({
      name: 'lazy-owner-output',
      schema: core.PathSchema.extend({ kind: literal('lazy-owner-output') }),
      ownerOutput: true,
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
      paths: [kind],
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
  ])('当请求的非空 Path 具有 %s 时，会明确报错', (_label, publishOutput) => {
    const kind = core.definePath({
      name: `bad-owner-output-${_label.replace(' ', '-')}`,
      schema: core.PathSchema.extend({ kind: literal(`bad-owner-output-${_label.replace(' ', '-')}`) }),
      ownerOutput: true,
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
      compile(scene([{ type: 'path', kind: kind.name, children: steps }]), { paths: [kind], padding: 0 }, [observe()]),
    ).toThrow(/owner output|publish/i);
  });

  it('当 Path 返回 null 时拒绝所属模块输出', () => {
    const kind = core.definePath({
      name: 'null-owner-output',
      schema: core.PathSchema.extend({ kind: literal('null-owner-output') }),
      ownerOutput: true,
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
      compile(scene([{ type: 'path', kind: 'null-owner-output', children: steps }]), { paths: [kind], padding: 0 }, [
        observe(),
      ]),
    ).toThrow(/owner output|publish/i);
  });
});
