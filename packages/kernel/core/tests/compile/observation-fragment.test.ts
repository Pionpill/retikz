import { describe, expect, it } from 'vitest';
import { literal, strictObject, string } from 'zod';

import type { CompileObserverDefinition, IRScene } from '../../src';

import * as core from '../../src';

const scene = (children: IRScene['children']): IRScene => ({ version: 1, type: 'scene', children });

const observableComposite = core.defineComposite({
  namespace: 'test',
  type: 'fragment-owner',
  schema: core.CompositeBaseSchema.extend({
    namespace: literal('test'),
    type: literal('fragment-owner'),
  }),
  artifactSchema: strictObject({ label: string() }),
  compile: () => ({
    artifact: { label: 'fragment-owner' },
    children: [{ type: 'node', position: [0, 0], text: 'owner' }],
  }),
});

describe('Core isolated observation fragments', () => {
  it('inherits compile context while isolating resources, artifacts, and observers', () => {
    let selectionCalls = 0;
    const observer: CompileObserverDefinition = {
      key: 'fragment-test',
      createSession: () => ({
        select: site => {
          selectionCalls += 1;
          return site.owner.kind === 'composite';
        },
        observe: (_observation, context) => {
          const fragment = context.compileFragment({
            type: 'node',
            id: 'fragment-node',
            position: [0, 0],
            text: 'fragment',
            fill: {
              kind: 'linearGradient',
              stops: [
                { offset: 0, color: '#111111' },
                { offset: 1, color: '#eeeeee' },
              ],
            },
          });
          expect(fragment.scene.primitives).toHaveLength(1);
          expect(fragment.scene.resources).toHaveLength(1);
          expect(fragment.artifacts).toEqual([]);
          expect(fragment.diagnostics).toEqual([]);
        },
        complete: () => ({ selectionCalls }),
      }),
    };

    const compile = Reflect.get(core, 'observeCompileToScene') as
      | ((
          ir: IRScene,
          options: Record<string, unknown>,
          observers: ReadonlyArray<CompileObserverDefinition>,
        ) => {
          primary: { scene: { resources?: unknown } };
          observerOutputs: ReadonlyArray<{ key: string; value: unknown }>;
        })
      | undefined;
    expect(compile).toBeTypeOf('function');
    if (compile === undefined) throw new Error('observeCompileToScene is not available');

    const result = compile(
      scene([{ namespace: 'test', type: 'fragment-owner' }]),
      { composites: [observableComposite], padding: 0 },
      [observer],
    );
    expect(result.primary.scene.resources).toBeUndefined();
    expect(result.observerOutputs).toEqual([{ key: 'fragment-test', value: { selectionCalls: 1 } }]);
  });

  it('does not allow a fragment to read the primary namespace', () => {
    const observer: CompileObserverDefinition = {
      key: 'fragment-namespace',
      createSession: () => ({
        select: () => true,
        observe: (_observation, context) => {
          expect(() =>
            context.compileFragment({
              type: 'node',
              position: { kind: 'anchor', target: { id: 'primary-node' } },
              text: 'invalid fragment reference',
            }),
          ).toThrow();
        },
        complete: () => null,
      }),
    };

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
        scene([
          { namespace: 'test', type: 'fragment-owner' },
          { type: 'node', id: 'primary-node', position: [0, 0], text: 'primary' },
        ]),
        { composites: [observableComposite], padding: 0 },
        [observer],
      ),
    ).not.toThrow();
  });
});
