import type { IRScene } from '@retikz/core';
import { assert, describe, expect, it } from 'vitest';

import type { InputWeaveElement, WeaveBatch } from '../../src/weave';
import { readWeaveCurrent, WeaveManager } from '../../src/weave';
import { compileTestResult, compileTestSnapshot } from '../helpers/compilation';

/** 在内部编译测试中完成候选提交与事务清理 */
const commitUpdate = (manager: WeaveManager, batch: WeaveBatch) => {
  const prepared = manager.prepareUpdate(batch);
  prepared.commit();
  prepared.finish();
  return prepared;
};

describe('Weave 编译产物复用', () => {
  const equalInputs: Array<{ label: string; element: InputWeaveElement; consumers: Array<InputWeaveElement> }> = [
    {
      label: 'Coordinate',
      element: { type: 'coordinate', id: 'point', position: [10, 20] },
      consumers: [{ type: 'node', text: 'point', position: { of: 'point', direction: 'right', distance: 0 } }],
    },
    { label: 'Node', element: { type: 'node', id: 'body', text: 'body', position: [0, 0] }, consumers: [] },
    {
      label: 'Path',
      element: {
        type: 'path',
        id: 'line',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [80, 0] },
        ],
      },
      consumers: [],
    },
    {
      label: 'Scope',
      element: {
        type: 'scope',
        id: 'box',
        transforms: [{ kind: 'translate', x: 10, y: 20 }],
        children: [{ type: 'node', text: 'body' }],
      },
      consumers: [],
    },
  ];

  it.each(equalInputs)('$label 的同引用、浅等值和深等值更新复用编译产物', ({ element, consumers }) => {
    const source: IRScene = { type: 'scene', version: 1, children: [element, ...consumers] };
    const snapshot = JSON.stringify(source);
    const session = new WeaveManager(source);
    session.mount();
    const entry = readWeaveCurrent(session.root).children[0];
    if (entry.type === 'composite') throw new Error('Expected a base element');
    const before = readWeaveCurrent(entry);
    if (before.resolve === undefined || before.compile === undefined)
      throw new Error('Expected resolved and compiled products');
    const input = before.origin.own;
    const canonical = before.resolve.value;
    const compiled = before.compile.value;
    for (const identity of ['same', 'shallow', 'nested'] as const) {
      const next = identity === 'same' ? input : identity === 'shallow' ? { ...input } : structuredClone(input);
      const update = commitUpdate(session, {
        operations: [
          { kind: 'update', target: { kind: 'child', scopeId: session.root.scopeId, index: 0 }, input: next },
        ],
      });
      expect(update.compilation.result, identity).toEqual(compileTestResult(source));
      const current = readWeaveCurrent(entry);
      expect(current.compile?.value, identity).toBe(compiled);
      // 深等值只要求最终复用，不强制解析必须重算或必须创建新的外层对象
      if (identity !== 'nested') expect(current.resolve?.value, identity).toBe(canonical);
      expect(JSON.stringify(source), identity).toBe(snapshot);
    }
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
    const session = new WeaveManager(source, {}, { captureProvenance: true });
    session.mount();
    const root = session.root;
    const stable = root.current!.children[2];
    assert(stable.type === 'node');
    const product = stable.current!.compile?.value;
    const replacement = {
      type: 'node' as const,
      id: 'anchor',
      aliasIds: ['alias'],
      position: [50, 30] as [number, number],
    };
    const next = commitUpdate(session, {
      operations: [{ kind: 'update', target: { kind: 'id', scopeId: root.scopeId, id: 'anchor' }, input: replacement }],
    });
    expect(next.compilation.result).toEqual(
      compileTestResult({ ...source, children: [replacement, ...source.children.slice(1)] }),
    );
    expect(stable.current!.compile?.value).toBe(product);
    expect(root.current!.children[1].current!.dependencies.has(root.current!.children[0])).toBe(true);
    const moved = commitUpdate(session, {
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
    const session = new WeaveManager(source);
    session.mount();
    const keep = session.root.current!.children[0];
    assert(keep.type === 'node');
    const product = keep.current!.compile?.value;
    const updated = commitUpdate(session, {
      operations: [{ kind: 'remove', target: { kind: 'id', scopeId: session.root.scopeId, id: 'remove' } }],
    });
    expect(keep.current!.compile?.value).toBe(product);
    expect(updated.compilation.result).toEqual(compileTestResult({ ...source, children: source.children.slice(0, 1) }));
    expect([
      ...(updated.compilation.result.scene.resources?.paints ?? []),
      ...(updated.compilation.result.scene.resources?.clips ?? []),
    ]).toHaveLength(1);
  });

  it('回滚再更新时，未变化的子树同时恢复绘制和裁剪资源', () => {
    const source: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          id: 'stable',
          clip: { kind: 'rect', params: { x: -10, y: -10, width: 20, height: 20 } },
          children: [{ type: 'node', position: [0, 0], style: { fill: { kind: 'pattern', shape: 'dots' } } }],
        },
        { type: 'node', id: 'moving', position: [50, 0] },
      ],
    };
    const session = new WeaveManager(source);
    session.mount();
    const stable = session.root.current!.children[0];
    assert(stable.type === 'scope');
    const compilation = stable.current!.compile?.value;
    const replacement = { type: 'node' as const, id: 'moving', position: [80, 0] as [number, number] };
    const batch: WeaveBatch = {
      operations: [
        { kind: 'update', target: { kind: 'id', scopeId: session.root.scopeId, id: 'moving' }, input: replacement },
      ],
    };
    const expected = compileTestResult({ ...source, children: [source.children[0], replacement] });
    const discarded = session.prepareUpdate(batch);
    expect(discarded.compilation.result).toEqual(expected);
    discarded.rollback();

    const retried = commitUpdate(session, batch);
    expect(retried.compilation.result).toEqual(expected);
    expect(retried.compilation.result.scene.resources?.paints).toHaveLength(1);
    expect(retried.compilation.result.scene.resources?.clips).toHaveLength(1);
    expect(stable.current!.compile?.value).toBe(compilation);
  });
});
