import { compileToScene, prepareSceneCompilation } from '@retikz/core';
import type { IRScene, CompileObservation, CompileObserverDefinition } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { readWeaveCurrent, WeaveReconciler } from '../../src/weave';

const scene: IRScene = {
  type: 'scene',
  version: 1,
  children: [
    { type: 'node', id: 'a', position: [0, 0] },
    { type: 'node', id: 'b', position: { direction: 'right', of: 'a' } },
    { type: 'node', id: 'independent', position: [200, 0] },
    {
      type: 'path',
      id: 'edge',
      children: [
        { type: 'step', kind: 'move', to: { id: 'a' } },
        { type: 'step', kind: 'line', to: { id: 'b' } },
      ],
    },
  ],
};

describe('Weave 批次更新', () => {
  it('结构变化后的来源、布局产物与新观察会话和全量编译一致', () => {
    const events: Array<CompileObservation> = [];
    const observer: CompileObserverDefinition = {
      key: 'update-observer',
      createSession: () => ({
        select: () => true,
        observe: event => {
          events.push(event);
        },
        complete: () => null,
      }),
    };
    const options = { artifacts: { nodeLayouts: true } };
    const session = new WeaveReconciler(scene, options, { observers: [observer] });
    const mounted = session.mount();
    const previous = JSON.stringify(mounted.compilation.result);
    events.length = 0;
    const added = { type: 'node' as const, id: 'prefix', text: 'new' };
    const prepared = session.update({
      operations: [{ kind: 'insert', parentId: mounted.root.scopeId, index: 0, elements: [added] }],
    });
    const actualEvents = [...events];
    events.length = 0;
    const full = prepareSceneCompilation({ ...scene, children: [added, ...scene.children] }, options, {
      observers: [observer],
      captureProvenance: true,
    });
    expect(prepared.compilation.result).toEqual(full.result);
    expect(prepared.compilation.provenance?.emissions.map(entry => entry.primitivePath)).toEqual(
      full.provenance?.emissions.map(entry => entry.primitivePath),
    );
    expect(actualEvents).toEqual(events);
    prepared.rollback();
    expect(JSON.stringify(mounted.compilation.result)).toBe(previous);
  });
  it('插入后同批删除不提交未编译节点，空插入仍验证位置', () => {
    const session = new WeaveReconciler(scene);
    const { root } = session.mount();
    const prepared = session.update({
      operations: [
        {
          kind: 'insert',
          parentId: root.scopeId,
          index: 0,
          elements: [{ type: 'scope', children: [{ type: 'node', id: 'temporary' }] }],
        },
        { kind: 'remove', target: { kind: 'child', scopeId: root.scopeId, index: 0 } },
      ],
    });
    prepared.commit();
    prepared.finish();
    expect(prepared.compilation.result).toEqual(compileToScene(scene));
    expect(readWeaveCurrent(root).scopeIds.size).toBe(1);
    expect(() =>
      session.update({ operations: [{ kind: 'insert', parentId: root.scopeId, index: -1, elements: [] }] }),
    ).toThrow();
  });

  it('父级默认与移除自身覆盖使用最终继承值，局部名字遮蔽变化重新绑定', () => {
    const input: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        { type: 'node', id: 'a', position: [100, 0] },
        {
          type: 'scope',
          localNamespace: true,
          defaults: { node: { style: { fill: 'red' } } },
          children: [
            { type: 'node', id: 'a', position: [0, 0] },
            { type: 'node', id: 'b', position: { direction: 'right', of: 'a' }, style: { fill: 'green' } },
          ],
        },
      ],
    };
    const session = new WeaveReconciler(input);
    const { root } = session.mount();
    const scope = readWeaveCurrent(root).children[1];
    if (scope.type !== 'scope') throw new Error('Expected scope');
    const prepared = session.update({
      operations: [
        {
          kind: 'update',
          target: { kind: 'scope', scopeId: scope.scopeId },
          input: { type: 'scope', localNamespace: true, defaults: { node: { style: { fill: 'blue' } } } },
        },
        {
          kind: 'update',
          target: { kind: 'id', scopeId: scope.scopeId, id: 'b' },
          input: { type: 'node', id: 'b', position: { direction: 'right', of: 'a' } },
        },
        { kind: 'remove', target: { kind: 'id', scopeId: scope.scopeId, id: 'a' } },
      ],
    });
    expect(prepared.compilation.result).toEqual(
      compileToScene({
        ...input,
        children: [
          input.children[0],
          {
            type: 'scope',
            localNamespace: true,
            defaults: { node: { style: { fill: 'blue' } } },
            children: [{ type: 'node', id: 'b', position: { direction: 'right', of: 'a' } }],
          },
        ],
      }),
    );
    prepared.commit();
    prepared.finish();
  });

  it('保留跨 Scope 延后 Path 与最终世界投影，拒绝祖先几何和 Node 前向引用', () => {
    const edge = scene.children[3];
    const input: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        edge,
        { type: 'scope', id: 'group', children: [{ type: 'node', id: 'a', text: 'A' }] },
        { type: 'scope', children: [{ type: 'node', id: 'b', position: [100, 0] }] },
      ],
    };
    const session = new WeaveReconciler(input);
    const { root } = session.mount();
    const scope = readWeaveCurrent(root).children[1];
    if (scope.type !== 'scope') throw new Error('Expected scope');
    const prepared = session.update({
      operations: [
        {
          kind: 'update',
          target: { kind: 'scope', scopeId: scope.scopeId },
          input: { type: 'scope', id: 'group', position: [50, 20] },
        },
      ],
    });
    expect(prepared.compilation.result).toEqual(
      compileToScene({
        ...input,
        children: [
          edge,
          { type: 'scope', id: 'group', position: [50, 20], children: [{ type: 'node', id: 'a', text: 'A' }] },
          input.children[2],
        ],
      }),
    );
    prepared.commit();
    prepared.finish();
    expect(() =>
      session.update({
        operations: [
          {
            kind: 'update',
            target: { kind: 'id', scopeId: scope.scopeId, id: 'a' },
            input: { type: 'node', id: 'a', position: { direction: 'right', of: 'group' } },
          },
        ],
      }),
    ).toThrow(/ancestor Scope/);
    expect(() =>
      session.update({
        operations: [
          {
            kind: 'insert',
            parentId: root.scopeId,
            index: 0,
            elements: [{ type: 'node', position: { direction: 'right', of: 'b' } }],
          },
        ],
      }),
    ).toThrow();
  });

  it('最终确认后的旧回滚不会覆盖后续批次；候选存续时拒绝新批次', () => {
    const session = new WeaveReconciler(scene);
    const { root } = session.mount();
    const first = session.update({
      operations: [
        {
          kind: 'update',
          target: { kind: 'id', scopeId: root.scopeId, id: 'a' },
          input: { type: 'node', id: 'a', text: 'one' },
        },
      ],
    });
    expect(() => session.update({ operations: [] })).toThrow(/candidate/);
    first.commit();
    first.finish();
    const second = session.update({
      operations: [
        {
          kind: 'update',
          target: { kind: 'id', scopeId: root.scopeId, id: 'a' },
          input: { type: 'node', id: 'a', text: 'two' },
        },
      ],
    });
    first.rollback();
    second.commit();
    second.finish();
    expect(second.compilation.result).toEqual(
      compileToScene({ ...scene, children: [{ type: 'node', id: 'a', text: 'two' }, ...scene.children.slice(1)] }),
    );
  });
  it('依赖消费者使用最终输入，独立分支复用，提交前保留旧树和输出', () => {
    const session = new WeaveReconciler(scene);
    const mounted = session.mount();
    const root = mounted.root;
    const [a, b, independent] = readWeaveCurrent(root).children;
    const oldState = readWeaveCurrent(a);
    const oldIndependent = readWeaveCurrent(independent).compiled;
    const oldOutput = JSON.stringify(mounted.compilation.result);
    const own = { type: 'node' as const, id: 'a', position: [60, 20] as [number, number] };
    const prepared = session.update({
      operations: [{ kind: 'update', target: { kind: 'id', scopeId: root.scopeId, id: 'a' }, input: own }],
    });
    expect(readWeaveCurrent(a)).toBe(oldState);
    expect(prepared.compilation.result).toEqual(
      compileToScene({ ...scene, children: [own, ...scene.children.slice(1)] }),
    );
    prepared.commit();
    expect(readWeaveCurrent(root).children[0]).toBe(a);
    expect(readWeaveCurrent(b).dependencies.has(a)).toBe(true);
    expect(readWeaveCurrent(independent).compiled).toBe(oldIndependent);
    prepared.finish();
    expect(JSON.stringify(mounted.compilation.result)).toBe(oldOutput);
  });

  it('按候选位置连续插入、修改和删除，并可在提交后回滚', () => {
    const session = new WeaveReconciler(scene);
    const mounted = session.mount();
    const root = mounted.root;
    const before = readWeaveCurrent(root);
    const prepared = session.update({
      operations: [
        { kind: 'insert', parentId: root.scopeId, index: 0, elements: [{ type: 'node', id: 'new', position: [9, 9] }] },
        {
          kind: 'update',
          target: { kind: 'child', scopeId: root.scopeId, index: 0 },
          input: { type: 'node', id: 'new', text: 'final' },
        },
        { kind: 'remove', target: { kind: 'id', scopeId: root.scopeId, id: 'independent' } },
      ],
    });
    expect(prepared.compilation.result).toEqual(
      compileToScene({
        ...scene,
        children: [{ type: 'node', id: 'new', text: 'final' }, scene.children[0], scene.children[1], scene.children[3]],
      }),
    );
    prepared.commit();
    expect(readWeaveCurrent(root).ids.has('new')).toBe(true);
    prepared.rollback();
    expect(readWeaveCurrent(root)).toBe(before);
    const retried = session.update({ operations: [] });
    expect(retried.compilation.result).toBe(mounted.compilation.result);
    retried.commit();
    retried.finish();
  });

  it('嵌套上下文和自身输入同批修改，后代使用最终继承结果', () => {
    const input: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        { type: 'scope', children: [{ type: 'scope', children: [{ type: 'node', id: 'child', text: 'old' }] }] },
      ],
    };
    const session = new WeaveReconciler(input);
    const { root } = session.mount();
    const outer = readWeaveCurrent(root).children[0];
    if (outer.type !== 'scope') throw new Error('Expected scope');
    const prepared = session.update({
      operations: [
        {
          kind: 'update',
          target: { kind: 'id', scopeId: outer.scopeId, id: 'child' },
          input: { type: 'node', id: 'child', text: 'new' },
        },
        {
          kind: 'update',
          target: { kind: 'scope', scopeId: outer.scopeId },
          input: { type: 'scope', position: [50, 30] },
        },
      ],
    });
    expect(prepared.compilation.result).toEqual(
      compileToScene({
        type: 'scene',
        version: 1,
        children: [
          {
            type: 'scope',
            position: [50, 30],
            children: [{ type: 'scope', children: [{ type: 'node', id: 'child', text: 'new' }] }],
          },
        ],
      }),
    );
    prepared.commit();
    prepared.finish();
  });

  it('删除后同名新增重新绑定，缺失引用失败不发布部分状态', () => {
    const session = new WeaveReconciler(scene);
    const { root } = session.mount();
    const original = readWeaveCurrent(root);
    expect(() =>
      session.update({ operations: [{ kind: 'remove', target: { kind: 'id', scopeId: root.scopeId, id: 'a' } }] }),
    ).toThrow();
    expect(readWeaveCurrent(root)).toBe(original);
    const replacement = { type: 'node' as const, id: 'a', text: 'replacement' };
    const prepared = session.update({
      operations: [
        { kind: 'remove', target: { kind: 'id', scopeId: root.scopeId, id: 'a' } },
        { kind: 'insert', parentId: root.scopeId, index: 0, elements: [replacement] },
      ],
    });
    expect(prepared.compilation.result).toEqual(
      compileToScene({ ...scene, children: [replacement, ...scene.children.slice(1)] }),
    );
    prepared.commit();
    prepared.finish();
    const [a, b] = readWeaveCurrent(root).children;
    expect(a).not.toBe(original.children[0]);
    expect(readWeaveCurrent(b).dependencies.has(a)).toBe(true);
    expect(readWeaveCurrent(b).dependencies.has(original.children[0])).toBe(false);
  });
});
