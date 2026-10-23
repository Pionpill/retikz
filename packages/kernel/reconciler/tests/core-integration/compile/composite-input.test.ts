import type { CompositeBoundChild, IRChild, IRScene, CompositeCompileContext } from '@retikz/core';
import {
  ChildSchema,
  compileToScene,
  CompositeBaseSchema,
  createCompositeInputBindings,
  defineComposite,
  LayoutChildProbeKind,
  NaturalLayoutProposal,
  RetikzCoreError,
} from '@retikz/core';
import { ReconcilerSession } from '@retikz/reconciler';
import { describe, expect, it } from 'vitest';
import { literal, string } from 'zod';

const leaf = (): IRChild => ({ namespace: 'fixture', type: 'prepared' });

const sceneOf = (children: Array<IRChild>): IRScene => ({ type: 'scene', version: 1, children });

const prepared = defineComposite({
  namespace: 'fixture',
  type: 'prepared',
  schema: CompositeBaseSchema.extend({
    namespace: literal('fixture'),
    type: literal('prepared'),
    id: string().optional(),
  }),
  compile: (_node, context) => ({
    children: [{ type: 'node', position: [0, 0], text: String(context.runtimeInput ?? 'unbound') }],
  }),
});

const probe = (context: CompositeCompileContext, child: CompositeBoundChild) => {
  const result = context.layoutChild(child, NaturalLayoutProposal);
  if (result.kind === LayoutChildProbeKind.Failed) return context.raise(result.failure);
  return result.result;
};

const container = defineComposite({
  namespace: 'fixture',
  type: 'container',
  schema: CompositeBaseSchema.extend({
    namespace: literal('fixture'),
    type: literal('container'),
    child: ChildSchema,
  }),
  compile: (_node, context) => {
    const child = context.selectSourceChild(['child']);
    const first = probe(context, child);
    const second = probe(context, child);

    expect(second.allocationBounds).toEqual(first.allocationBounds);

    return { children: [context.createScope({ theme: { mode: 'dark' } }, [context.replay(second)])] };
  },
});

describe('composite instance runtime input', () => {
  it('separates identical anonymous sources without serializing runtime input', () => {
    const source = sceneOf([leaf(), leaf()]);
    const original = JSON.stringify(source);
    const compositeInputs = createCompositeInputBindings(source, [
      { path: ['children', 0], input: 'first-prepared' },
      { path: ['children', 1], input: 'second-prepared' },
    ]);
    const output = compileToScene(source, { composites: [prepared], compositeInputs });

    expect(JSON.stringify(output.scene)).toContain('first-prepared');
    expect(JSON.stringify(output.scene)).toContain('second-prepared');
    expect(JSON.stringify(source)).toBe(original);
    expect(JSON.stringify(output)).not.toContain('runtimeInput');
  });

  it('carries authored child bindings through schema parsing, repeated probes and themed replay', () => {
    const source = sceneOf([{ namespace: 'fixture', type: 'container', child: leaf() }]);
    const compositeInputs = createCompositeInputBindings(source, [
      { path: ['children', 0, 'child'], input: 'nested-prepared' },
    ]);
    const output = compileToScene(source, { composites: [prepared, container], compositeInputs });

    expect(JSON.stringify(output.scene)).toContain('nested-prepared');
    expect(JSON.stringify(output.scene)).not.toContain('unbound');
  });

  it('forwards generated input explicitly while ordinary generated children remain unbound', () => {
    const generated = defineComposite({
      namespace: 'fixture',
      type: 'generated',
      schema: CompositeBaseSchema.extend({ namespace: literal('fixture'), type: literal('generated') }),
      compile: (_node, context) => ({
        children: [context.bindChild(leaf(), [{ path: [], input: 'generated-prepared' }]), leaf()],
      }),
    });
    const source = sceneOf([{ namespace: 'fixture', type: 'generated' }]);
    const output = compileToScene(source, {
      composites: [prepared, generated],
      compositeInputs: createCompositeInputBindings(source, [{ path: ['children', 0], input: 'parent-only' }]),
    });

    expect(JSON.stringify(output.scene)).toContain('generated-prepared');
    expect(JSON.stringify(output.scene)).toContain('unbound');
    expect(JSON.stringify(output.scene)).not.toContain('parent-only');
  });

  it('keeps same names in local namespaces independent', () => {
    const source = sceneOf([
      { type: 'scope', id: 'a', localNamespace: true, children: [{ ...leaf(), id: 'shared' }] },
      { type: 'scope', id: 'b', localNamespace: true, children: [{ ...leaf(), id: 'shared' }] },
    ]);
    const output = compileToScene(source, {
      composites: [prepared],
      compositeInputs: createCompositeInputBindings(source, [
        { path: ['children', 0, 'children', 0], input: 'scope-a' },
        { path: ['children', 1, 'children', 0], input: 'scope-b' },
      ]),
    });

    expect(JSON.stringify(output.scene)).toContain('scope-a');
    expect(JSON.stringify(output.scene)).toContain('scope-b');
  });

  it('rejects duplicate, missing and non-composite binding paths', () => {
    const source = sceneOf([leaf(), { type: 'node', text: 'plain' }]);

    expect(() =>
      createCompositeInputBindings(source, [
        { path: ['children', 0], input: 1 },
        { path: ['children', 0], input: 2 },
      ]),
    ).toThrow(/duplicate/i);
    expect(() => createCompositeInputBindings(source, [{ path: ['children', 8], input: 1 }])).toThrow(/path/i);
    expect(() => createCompositeInputBindings(source, [{ path: ['children', 1], input: 1 }])).toThrow(/composite/i);
  });

  it('rejects a binding set paired with a changed Source but accepts retained JSON capture', () => {
    const source = sceneOf([leaf()]);
    const compositeInputs = createCompositeInputBindings(source, [{ path: ['children', 0], input: 'ready' }]);

    expect(
      JSON.stringify(
        compileToScene(JSON.parse(JSON.stringify(source)), { composites: [prepared], compositeInputs }).scene,
      ),
    ).toContain('ready');
    expect(() => compileToScene(sceneOf([leaf(), leaf()]), { composites: [prepared], compositeInputs })).toThrow(
      /source/i,
    );
  });

  it('rejects placing one bound child twice', () => {
    const duplicate = defineComposite({
      namespace: 'fixture',
      type: 'duplicate',
      schema: CompositeBaseSchema.extend({ namespace: literal('fixture'), type: literal('duplicate') }),
      compile: (_node, context) => {
        const child = context.bindChild(leaf(), [{ path: [], input: 'ready' }]);
        return { children: [child, child] };
      },
    });

    expect(() =>
      compileToScene(sceneOf([{ namespace: 'fixture', type: 'duplicate' }]), { composites: [prepared, duplicate] }),
    ).toThrow(/more than once/i);
  });

  it('rejects cloned and cross-callback bound handles', () => {
    for (const cloned of [false, true]) {
      let previous: CompositeBoundChild | undefined;
      const holder = defineComposite({
        namespace: 'fixture',
        type: 'holder',
        schema: CompositeBaseSchema.extend({ namespace: literal('fixture'), type: literal('holder') }),
        compile: (_node, context) => {
          if (previous !== undefined) return { children: [cloned ? structuredClone(previous) : previous] };
          previous = context.bindChild(leaf(), [{ path: [], input: 'ready' }]);
          return { children: [previous] };
        },
      });

      expect(() =>
        compileToScene(
          sceneOf([
            { namespace: 'fixture', type: 'holder' },
            { namespace: 'fixture', type: 'holder' },
          ]),
          { composites: [prepared, holder] },
        ),
      ).toThrow(RetikzCoreError);
    }
  });

  it('rejects repeated author placement in both compilation paths', () => {
    const duplicate = defineComposite({
      namespace: 'fixture',
      type: 'duplicateSource',
      schema: CompositeBaseSchema.extend({
        namespace: literal('fixture'),
        type: literal('duplicateSource'),
        child: ChildSchema,
      }),
      compile: (_node, context) => ({
        children: [context.selectSourceChild(['child']), context.selectSourceChild(['child'])],
      }),
    });
    const source = sceneOf([{ namespace: 'fixture', type: 'duplicateSource', child: leaf() }]);

    expect(() => compileToScene(source, { composites: [duplicate, prepared] })).toThrow(/more than once/i);
  });

  it('preserves the spatial Scope restriction for bound expand output', () => {
    const spatial = defineComposite({
      namespace: 'fixture',
      type: 'boundSpatial',
      schema: CompositeBaseSchema.extend({ namespace: literal('fixture'), type: literal('boundSpatial') }),
      compile: (_node, context) => ({
        children: [
          context.bindChild({ type: 'scope', transforms: [{ kind: 'translate', x: 2, y: 3 }], children: [leaf()] }, [
            { path: ['children', 0], input: 'ready' },
          ]),
        ],
        spatialHandles: [{ id: 'body', role: 'fixture', bounds: { x: 0, y: 0, width: 10, height: 10 } }],
      }),
    });

    expect(() =>
      compileToScene(sceneOf([{ namespace: 'fixture', type: 'boundSpatial' }]), { composites: [spatial, prepared] }),
    ).toThrow(/Scope with placement or transforms/);
  });

  it('recompiles changed inputs for identical JSON and rolls back a mismatched candidate', () => {
    const source = sceneOf([leaf()]);
    const inputs = (text: string) => createCompositeInputBindings(source, [{ path: ['children', 0], input: text }]);
    const session = new ReconcilerSession({ composites: [prepared], compositeInputs: inputs('initial-ready') });
    session.mount(source);
    session.replace(source, { composites: [prepared], compositeInputs: inputs('updated-ready') });

    expect(JSON.stringify(session.read().compilation.result.scene)).toContain('updated-ready');

    const committed = session.read().compilation.result;
    const revision = session.read().revision;

    expect(() =>
      session.replace(sceneOf([leaf(), leaf()]), { composites: [prepared], compositeInputs: inputs('mismatched') }),
    ).toThrow();
    expect(session.read().revision).toBe(revision);
    expect(session.read().compilation.result).toBe(committed);

    session.dispose();
  });
});
