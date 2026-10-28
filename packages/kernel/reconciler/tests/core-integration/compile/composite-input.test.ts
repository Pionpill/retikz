import type { CompositeBoundChild, CompositeCompileContext, IRChild, IRScene } from '@retikz/core';
import {
  ChildSchema,
  compileToScene,
  CompositeBaseSchema,
  createCompositeInputBindings,
  defineComposite,
  LayoutChildProbeKind,
  naturalLayoutProposal,
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
  const result = context.layoutChild(child, naturalLayoutProposal);
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

describe('复合实例运行时输入', () => {
  it('分离相同的匿名源而不序列化运行时输入', () => {
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

  it('通过 schema 解析、重复探测和主题回放来承载编写的子绑定', () => {
    const source = sceneOf([{ namespace: 'fixture', type: 'container', child: leaf() }]);
    const compositeInputs = createCompositeInputBindings(source, [
      { path: ['children', 0, 'child'], input: 'nested-prepared' },
    ]);
    const output = compileToScene(source, { composites: [prepared, container], compositeInputs });

    expect(JSON.stringify(output.scene)).toContain('nested-prepared');
    expect(JSON.stringify(output.scene)).not.toContain('unbound');
  });

  it('显式转发生成的输入，而普通生成的子项保持未绑定状态', () => {
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

  it('在本地命名空间中保持相同的名称独立', () => {
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

  it('拒绝重复、缺失和非复合的绑定路径', () => {
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

  it('拒绝与更改的 Source 配对的绑定集，但接受保留的 JSON 捕获', () => {
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

  it('拒绝将一个绑定子项放置两次', () => {
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

  it('拒绝克隆和交叉回调绑定句柄', () => {
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

  it('拒绝两个编译路径中重复的作者放置', () => {
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

  it('重新编译相同 JSON 的更改输入并回滚不匹配的候选者', () => {
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
