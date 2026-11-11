import type { IRNode, IRPathBase, IRScene, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { SceneReconciler } from '../../src';
import { WeaveManager } from '../../src/weave';
import { compileTestSnapshot } from '../helpers/compilation';

describe('Weave 更新调度', () => {
  it('局部遮蔽保留 Node 声明时与 Path 闭合时的不同名称可见性', () => {
    const other: IRNode = { type: 'node', id: 'other', position: [300, 0] };
    const source: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        { type: 'coordinate', id: 'anchor', position: [0, 0] },
        {
          type: 'scope',
          localNamespace: true,
          children: [
            { type: 'node', id: 'before', position: { direction: 'right', of: 'anchor' } },
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: { id: 'before' } },
                { type: 'step', kind: 'line', to: { id: 'anchor' } },
              ],
            },
            { type: 'coordinate', id: 'anchor', position: [100, 0] },
            { type: 'node', id: 'after', position: { direction: 'right', of: 'anchor' } },
          ],
        },
        { type: 'coordinate', id: 'anchor', position: [200, 0] },
        other,
      ],
    };
    const manager = new WeaveManager(source, {}, { captureProvenance: true });
    const mounted = manager.mount();
    const changed: IRNode = { ...other, position: [350, 0] };
    const candidate = manager.update({
      operations: [
        { kind: 'update', target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'other' }, input: changed },
      ],
    });
    expect(candidate.compilation).toEqual(
      compileTestSnapshot(
        { ...source, children: [...source.children.slice(0, 3), changed] },
        {},
        { captureProvenance: true },
      ),
    );
    candidate.rollback();
  });

  it('子节点尺寸改变父级锚定包络时，内部路径与外部消费者同时使用新的世界投影', () => {
    const child: IRNode = { type: 'node', id: 'inner', position: [20, 0], layout: { width: 40 } };
    const scope: IRScope = {
      type: 'scope',
      id: 'box',
      position: { kind: 'anchor', target: [100, 50], selfAnchor: 'left' },
      children: [
        child,
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'inner' } },
            { type: 'step', kind: 'line', to: { id: 'outside' } },
          ],
        },
      ],
    };
    const source: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        { type: 'coordinate', id: 'outside', position: [250, 0] },
        scope,
        { type: 'node', id: 'consumer', position: { direction: 'right', of: 'inner' } },
      ],
    };
    const execution = { captureProvenance: true };
    const manager = new WeaveManager(source, {}, execution);
    manager.mount();
    const changed: IRNode = { ...child, layout: { width: 90 } };
    const candidate = manager.update({
      operations: [
        { kind: 'update', target: { kind: 'child', scopeId: manager.getScopeId([1]), index: 0 }, input: changed },
      ],
    });
    expect(candidate.compilation).toEqual(
      compileTestSnapshot(
        {
          ...source,
          children: [source.children[0], { ...scope, children: [changed, scope.children[1]] }, source.children[2]],
        },
        {},
        execution,
      ),
    );
    candidate.rollback();
  });

  it('同批多源变化在菱形引用的末端合流，不混读旧候选结果', () => {
    const first: IRNode = { type: 'node', id: 'a', position: [0, 0] };
    const second: IRNode = { type: 'node', id: 'b', position: [100, 0] };
    const source: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'left' } },
            { type: 'step', kind: 'line', to: { id: 'right' } },
          ],
        },
        first,
        second,
        { type: 'node', id: 'left', position: { direction: 'right', of: 'a', distance: 20 } },
        { type: 'node', id: 'right', position: { direction: 'left', of: 'b', distance: 20 } },
      ],
    };
    const manager = new WeaveManager(source);
    const mounted = manager.mount();
    const movedFirst: IRNode = { ...first, position: [20, 10] };
    const movedSecond: IRNode = { ...second, position: [180, 40] };
    const candidate = manager.update({
      operations: [
        { kind: 'update', target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'b' }, input: movedSecond },
        { kind: 'update', target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'a' }, input: movedFirst },
      ],
    });
    expect(candidate.compilation).toEqual(
      compileTestSnapshot({
        ...source,
        children: [source.children[0], movedFirst, movedSecond, ...source.children.slice(3)],
      }),
    );
    candidate.rollback();
  });

  it('同批切换 Path 读取并更新新生产者，失败批次不污染后续求值', () => {
    const a: IRNode = { type: 'node', id: 'a', position: [0, 0] };
    const b: IRNode = { type: 'node', id: 'b', position: [40, 0] };
    const c: IRNode = { type: 'node', id: 'c', position: [80, 0] };
    const edge = (target: string): IRPathBase => ({
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: { id: 'a' } },
        { type: 'step', kind: 'line', to: { id: target } },
      ],
    });
    const source: IRScene = { type: 'scene', version: 1, children: [edge('b'), a, b, c] };
    const session = new WeaveManager(source, {}, { captureProvenance: true });
    const mounted = session.mount();
    const saved = structuredClone(mounted.compilation);
    const changed: IRNode = { ...c, position: [120, 30] };
    expect(() =>
      session.update({
        operations: [
          {
            kind: 'update',
            target: { kind: 'child', scopeId: mounted.root.scopeId, index: 0 },
            input: { ...edge('c'), kind: 'unregistered' },
          },
          { kind: 'update', target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'c' }, input: changed },
        ],
      }),
    ).toThrow(/Unknown provider/);
    expect(mounted.compilation).toEqual(saved);
    const updated = session.update({
      operations: [
        { kind: 'update', target: { kind: 'child', scopeId: mounted.root.scopeId, index: 0 }, input: edge('c') },
        { kind: 'update', target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'c' }, input: changed },
      ],
    });
    expect(updated.compilation).toEqual(
      compileTestSnapshot({ ...source, children: [edge('c'), a, b, changed] }, {}, { captureProvenance: true }),
    );
    updated.commit();
    updated.finish();
    expect(mounted.compilation).toEqual(saved);
  });
  it('清洁嵌套 Scope 组装子贡献，保持变换、路径顺序与来源', () => {
    const fixed: IRScope = {
      type: 'scope',
      id: 'group',
      transforms: [{ kind: 'translate', x: 20, y: 30 }],
      children: [
        {
          type: 'scope',
          localNamespace: true,
          children: [
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: { id: 'a' } },
                { type: 'step', kind: 'line', to: { id: 'b' } },
              ],
            },
            { type: 'node', id: 'a', position: [0, 0] },
            { type: 'node', id: 'b', position: [100, 0] },
          ],
        },
      ],
    };
    const other: IRNode = { type: 'node', id: 'other', position: [200, 0] };
    const source: IRScene = { type: 'scene', version: 1, children: [fixed, other] };
    const execution = { captureProvenance: true };
    const session = new WeaveManager(source, {}, execution);
    const mounted = session.mount();
    const changed: IRNode = { ...other, position: [300, 0] };
    const candidate = session.update({
      operations: [
        {
          kind: 'update',
          target: {
            kind: 'id',
            scopeId: mounted.root.scopeId,
            id: 'other',
          },
          input: changed,
        },
      ],
    });
    expect(candidate.compilation).toEqual(
      compileTestSnapshot({ ...source, children: [fixed, changed] }, {}, execution),
    );
    candidate.rollback();
  });
  it('会话 full 策略的空批次发布新版本并报告计算记录', () => {
    const visited: Array<number> = [];
    const session = new SceneReconciler({}, { updateStrategy: 'full', trace: event => visited.push(event.visited) });
    const mounted = session.mount({ type: 'scene', version: 1, children: [{ type: 'node', position: [0, 0] }] });
    const updated = session.update({ operations: [] });
    expect(updated.revision).toBe(mounted.revision + 1);
    expect(updated.compilation).toEqual(mounted.compilation);
    expect(visited).toEqual([1, 1]);
    session.dispose();
  });
  it('无关更新保持 Scope 缺失引用诊断，新增绑定后重新计算', () => {
    const other: IRNode = { type: 'node', id: 'other', position: [200, 0] };
    const scope: IRScope = {
      type: 'scope',
      transforms: [{ kind: 'at-translate', direction: 'right', of: 'missing' }],
      children: [{ type: 'node', id: 'child', position: [0, 0] }],
    };
    const source: IRScene = { type: 'scene', version: 1, children: [other, scope] };
    const session = new WeaveManager(source);
    const mounted = session.mount();
    expect(mounted.compilation.diagnostics.length).toBeGreaterThan(0);
    const changedOther: IRNode = { ...other, position: [300, 0] };
    const first = session.update({
      operations: [
        {
          kind: 'update',
          target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'other' },
          input: changedOther,
        },
      ],
    });
    expect(first.compilation).toEqual(compileTestSnapshot({ ...source, children: [changedOther, scope] }));
    expect(first.compilation.diagnostics).toEqual(mounted.compilation.diagnostics);
    first.commit();
    first.finish();
    const missing: IRNode = { type: 'node', id: 'missing', position: [80, 20] };
    const next = session.update({
      operations: [
        {
          kind: 'insert',
          parentId: mounted.root.scopeId,
          index: 1,
          elements: [missing],
        },
      ],
    });
    expect(next.compilation).toEqual(compileTestSnapshot({ ...source, children: [changedOther, missing, scope] }));
    expect(next.compilation.diagnostics).toEqual([]);
    next.rollback();
  });

  it('空 auto 批次保持原输出，空 full 批次重新调用文本测量', () => {
    let measurements = 0;
    const source: IRScene = {
      type: 'scene',
      version: 1,
      children: [{ type: 'node', text: 'sample' }],
    };
    const session = new WeaveManager(source, {
      measureText: () => {
        measurements++;
        return { width: 20, height: 10 };
      },
    });
    const mounted = session.mount();
    const before = measurements;
    const automatic = session.update({ operations: [] });
    expect(automatic.compilation).toBe(mounted.compilation);
    expect(measurements).toBe(before);
    automatic.rollback();
    const full = session.update({ operations: [] }, true);
    expect(measurements).toBeGreaterThan(before);
    expect(full.compilation).toEqual(mounted.compilation);
    full.rollback();
  });
});
