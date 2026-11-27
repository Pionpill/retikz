import type { IRScene } from '@retikz/core';
import { CompositeBaseSchema, defineComposite, naturalLayoutProposal, LayoutChildProbeKind } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import { ReconcilerMode, SceneReconciler } from '../../src';
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
  it('头插复用普通节点的编译结果，仍为别名和绘制来源登记新地址', () => {
    const source: IRScene = {
      type: 'scene',
      version: 1,
      children: [{ type: 'node', id: 'old', aliasIds: ['alias'], position: [12, 24] }],
    };
    const inserted = { type: 'node' as const, id: 'first' };
    const execution = { captureProvenance: true };
    let computed = 0;
    const session = new SceneReconciler(
      {},
      {
        ...execution,
        mode: ReconcilerMode.Incremental,
        trace: record => {
          if (record.phase === 'update' && record.unit === 'element-compile') computed += record.visited;
        },
      },
    );
    try {
      const first = session.mount(source);
      const scopeId = session.getScopeId();
      const after = session.update({
        operations: [{ kind: 'insert', parentId: scopeId, index: 0, elements: [inserted] }],
      });
      expect(computed).toBe(1);
      expect(after.compilation).toEqual(
        compileTestSnapshot({ ...source, children: [inserted, ...source.children] }, {}, execution),
      );
      const restored = session.update({
        operations: [{ kind: 'remove', target: { kind: 'child', scopeId, index: 0 } }],
      });
      expect(computed).toBe(1);
      expect(restored.compilation).toEqual(first.compilation);
      expect(first.compilation).toEqual(compileTestSnapshot(source, {}, execution));
    } finally {
      session.dispose();
    }
  });

  it('两种会话模式产生相同的完整结果和诊断', () => {
    const expected = compileTestSnapshot(input);
    for (const mode of [ReconcilerMode.Full, ReconcilerMode.Incremental]) {
      const session = new SceneReconciler({}, { mode });
      const actual = session.mount(input);
      expect(actual.compilation.result).toEqual(expected.result);
      expect(actual.compilation.diagnostics).toEqual(expected.diagnostics);
      session.dispose();
    }
    expect(compileTestResult(input)).toEqual(expected.result);
  });

  it('非增量会话支持完整替换但拒绝批次更新，拒绝后仍保留已发布结果', () => {
    const session = new SceneReconciler();
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
    const session = new SceneReconciler(options, { mode: ReconcilerMode.Incremental });
    const first = session.mount(source);
    expect(first.compilation.result).toEqual(compileTestResult(source, options));
    expect(() => session.getScopeId([2])).toThrow('authored Scope');
    const changed: IRScene = {
      ...source,
      children: [{ type: 'coordinate', id: 'origin', position: [25, 30] }, ...source.children.slice(1)],
    };
    const updated = session.update({
      operations: [
        {
          kind: 'update',
          target: { kind: 'id', scopeId: session.getScopeId(), id: 'origin' },
          input: { type: 'coordinate', id: 'origin', position: [25, 30] },
        },
      ],
    });
    expect(updated.compilation.result).toEqual(compileTestResult(changed, options));
    expect(updated.compilation.result.artifacts).toHaveLength(1);
    session.dispose();
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
      const session = new SceneReconciler(options, {
        mode: ReconcilerMode.Incremental,
        updateStrategy,
        captureProvenance: true,
      });
      const first = session.mount(source);
      const scopeId = session.getScopeId();
      expect(() =>
        session.update({
          operations: [{ kind: 'remove', target: { kind: 'child', scopeId, index: 1 } }],
        }),
      ).toThrow();
      expect(session.read()).toBe(first);
      expect(() =>
        session.update({
          operations: [{ kind: 'remove', target: { kind: 'id', scopeId, id: 'generated' } }],
        }),
      ).toThrow();
      expect(session.read()).toBe(first);
      const replacement = { type: 'coordinate' as const, id: 'origin', position: [70, 80] as [number, number] };
      const next = session.update({
        operations: [{ kind: 'update', target: { kind: 'id', scopeId, id: 'origin' }, input: replacement }],
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
