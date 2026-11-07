import type { IRScene } from '@retikz/core';
import { CompositeBaseSchema, defineComposite, naturalLayoutProposal, LayoutChildProbeKind } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import { SceneReconciler } from '../../src';
import { compileTestResult, compileTestSnapshot } from '../helpers/compilation';

const input: IRScene = {
  version: 1,
  type: 'scene',
  children: [
    { type: 'coordinate', id: 'origin', position: [10, 20] },
    { type: 'node', id: 'label', position: { direction: 'right', of: 'origin', distance: 12 }, text: 'label' },
  ],
};

describe('统一编译模式', () => {
  it('两种会话模式产生相同的完整结果和诊断', () => {
    const expected = compileTestSnapshot(input);
    for (const incremental of [false, true]) {
      const session = new SceneReconciler({}, { incremental });
      const actual = session.mount(input);
      expect(actual.compilation.result).toEqual(expected.result);
      expect(actual.compilation.diagnostics).toEqual(expected.diagnostics);
      expect(actual.root !== undefined).toBe(incremental);
      session.dispose();
    }
    expect(compileTestResult(input)).toEqual(expected.result);
  });

  it('非增量会话支持完整替换但拒绝批次更新，拒绝后仍保留已发布结果', () => {
    const session = new SceneReconciler({}, { incremental: false });
    const initial = session.mount(input);
    expect(() => session.update({ operations: [] })).toThrow();
    expect(session.read()).toBe(initial);
    const replacement: IRScene = { version: 1, type: 'scene', children: [] };
    expect(session.replace(replacement).compilation.result).toEqual(compileTestResult(replacement));
    session.dispose();
  });

  it('含 Composite 的增量场景允许更新作者基础元素并保持领域产物', () => {
    const definition = defineComposite({
      namespace: 'mode-test',
      type: 'marker',
      schema: CompositeBaseSchema.extend({ namespace: literal('mode-test'), type: literal('marker') }),
      artifactSchema: literal('marker'),
      compile: () => ({
        children: [{ type: 'node', position: [40, 50], text: 'generated' }],
        artifact: 'marker',
      }),
    });
    const source: IRScene = {
      ...input,
      children: [...input.children, { namespace: 'mode-test', type: 'marker' }],
    };
    const options = { composites: [definition] };
    const session = new SceneReconciler(options, { incremental: true });
    const first = session.mount(source);
    expect(first.compilation.result).toEqual(compileTestResult(source, options));
    expect(first.root).toBeDefined();
    const changed: IRScene = {
      ...source,
      children: [{ type: 'coordinate', id: 'origin', position: [25, 30] }, ...source.children.slice(1)],
    };
    const updated = session.update({
      operations: [
        {
          kind: 'update',
          target: { kind: 'id', scopeId: first.root!.scopeId, id: 'origin' },
          input: { type: 'coordinate', id: 'origin', position: [25, 30] },
        },
      ],
    });
    expect(updated.compilation.result).toEqual(compileTestResult(changed, options));
    expect(updated.compilation.result.artifacts).toHaveLength(1);
    session.dispose();
  });
  it('别名引用更新与声明移动保留当前来源，并复用独立元素的阶段产物', () => {
    const source: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'anchor', aliasIds: ['alias'], position: [0, 0] },
        { type: 'coordinate', id: 'dependent', position: { direction: 'right', of: 'alias' } },
        { type: 'node', id: 'stable', position: [200, 0] },
      ],
    };
    const session = new SceneReconciler({}, { captureProvenance: true });
    const first = session.mount(source);
    const root = first.root!;
    const stable = root.current!.children[2];
    const product = stable.current!.compiled;
    const replacement = {
      type: 'node' as const,
      id: 'anchor',
      aliasIds: ['alias'],
      position: [50, 30] as [number, number],
    };
    const next = session.update({
      operations: [{ kind: 'update', target: { kind: 'id', scopeId: root.scopeId, id: 'anchor' }, input: replacement }],
    });
    expect(next.compilation.result).toEqual(
      compileTestResult({ ...source, children: [replacement, ...source.children.slice(1)] }),
    );
    expect(stable.current!.compiled).toBe(product);
    expect(root.current!.children[1].current!.dependencies.has(root.current!.children[0])).toBe(true);
    const moved = session.update({
      operations: [
        {
          kind: 'insert',
          parentId: root.scopeId,
          index: 0,
          elements: [{ type: 'coordinate', id: 'new', position: [0, 0] }],
        },
      ],
    });
    expect(moved.compilation).toEqual(
      compileTestSnapshot(
        {
          ...source,
          children: [{ type: 'coordinate', id: 'new', position: [0, 0] }, replacement, ...source.children.slice(1)],
        },
        {},
        { captureProvenance: true },
      ),
    );
    session.dispose();
  });

  it('删除同资源兄弟后，缓存元素仍携带完整资源', () => {
    const gradient = {
      kind: 'linearGradient' as const,
      angle: 0,
      stops: [
        { offset: 0, color: 'red' },
        { offset: 1, color: 'blue' },
      ],
    };
    const source: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'keep', position: [0, 0], style: { fill: gradient } },
        { type: 'node', id: 'remove', position: [100, 0], style: { fill: gradient } },
      ],
    };
    const session = new SceneReconciler();
    const first = session.mount(source);
    const keep = first.root!.current!.children[0];
    const product = keep.current!.compiled;
    const updated = session.update({
      operations: [{ kind: 'remove', target: { kind: 'id', scopeId: first.root!.scopeId, id: 'remove' } }],
    });
    expect(keep.current!.compiled).toBe(product);
    expect(updated.compilation.result).toEqual(compileTestResult({ ...source, children: source.children.slice(0, 1) }));
    expect(updated.compilation.result.scene.resources).toHaveLength(1);
    session.dispose();
  });

  it('非增量模式拒绝增量策略配置', () => {
    expect(() => new SceneReconciler({}, { incremental: false, updateStrategy: 'full' })).toThrow();
  });
  it('Composite 试算重放在基础元素更新后重新执行，失败候选保持旧结果', () => {
    const definition = defineComposite({
      namespace: 'mode-test',
      type: 'probe',
      schema: CompositeBaseSchema.extend({ namespace: literal('mode-test'), type: literal('probe') }),
      artifactSchema: literal('probe'),
      compile: (_input, context) => {
        const probe = context.layoutChild(
          { type: 'node', id: 'generated', position: { direction: 'right', of: 'origin' }, text: 'generated' },
          naturalLayoutProposal,
        );
        if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
        return { children: [context.replay(probe.result)], artifact: 'probe' };
      },
    });
    const source: IRScene = { ...input, children: [input.children[0], { namespace: 'mode-test', type: 'probe' }] };
    const options = { composites: [definition] };
    for (const updateStrategy of ['auto', 'full'] as const) {
      const session = new SceneReconciler(options, { updateStrategy, captureProvenance: true });
      const first = session.mount(source);
      const root = first.root!;
      expect(() =>
        session.update({
          operations: [{ kind: 'remove', target: { kind: 'child', scopeId: root.scopeId, index: 1 } }],
        }),
      ).toThrow();
      expect(session.read()).toBe(first);
      expect(() =>
        session.update({
          operations: [{ kind: 'remove', target: { kind: 'id', scopeId: root.scopeId, id: 'generated' } }],
        }),
      ).toThrow();
      expect(session.read()).toBe(first);
      const replacement = { type: 'coordinate' as const, id: 'origin', position: [70, 80] as [number, number] };
      const next = session.update({
        operations: [
          { kind: 'update', target: { kind: 'id', scopeId: root.scopeId, id: 'origin' }, input: replacement },
        ],
      });
      expect(next.compilation).toEqual(
        compileTestSnapshot({ ...source, children: [replacement, source.children[1]] }, options, {
          captureProvenance: true,
        }),
      );
      session.dispose();
    }
  });
});
