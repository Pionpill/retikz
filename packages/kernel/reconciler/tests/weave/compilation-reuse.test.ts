import type { IRScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { WeaveBatch } from '../../src/weave';
import { WeaveManager } from '../../src/weave';
import { compileTestResult, compileTestSnapshot } from '../helpers/compilation';

/** 在内部编译测试中完成候选提交与事务清理 */
const commitUpdate = (manager: WeaveManager, batch: WeaveBatch) => {
  const prepared = manager.update(batch);
  prepared.commit();
  prepared.finish();
  return prepared;
};

describe('Weave 编译产物复用', () => {
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
    const first = session.mount();
    const root = first.root;
    const stable = root.current!.children[2];
    const product = stable.current!.compiled;
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
    expect(stable.current!.compiled).toBe(product);
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
    const first = session.mount();
    const keep = first.root.current!.children[0];
    const product = keep.current!.compiled;
    const updated = commitUpdate(session, {
      operations: [{ kind: 'remove', target: { kind: 'id', scopeId: first.root.scopeId, id: 'remove' } }],
    });
    expect(keep.current!.compiled).toBe(product);
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
    const mounted = session.mount();
    const stable = mounted.root.current!.children[0];
    const compilation = stable.current!.compiled;
    const replacement = { type: 'node' as const, id: 'moving', position: [80, 0] as [number, number] };
    const batch: WeaveBatch = {
      operations: [
        { kind: 'update', target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'moving' }, input: replacement },
      ],
    };
    const expected = compileTestResult({ ...source, children: [source.children[0], replacement] });
    const discarded = session.update(batch);
    expect(discarded.compilation.result).toEqual(expected);
    discarded.rollback();

    const retried = commitUpdate(session, batch);
    expect(retried.compilation.result).toEqual(expected);
    expect(retried.compilation.result.scene.resources?.paints).toHaveLength(1);
    expect(retried.compilation.result.scene.resources?.clips).toHaveLength(1);
    expect(stable.current!.compiled).toBe(compilation);
  });
});
