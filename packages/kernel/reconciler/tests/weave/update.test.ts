import type { IRPath, IRScene, MarkEmitContext, ScenePrimitive } from '@retikz/core';
import { compileToScene } from '@retikz/core';
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
  it('删除已编译子树不发布其新状态，提交后回滚恢复原结构与依赖', () => {
    const input: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        {
          type: 'scope',
          children: [
            { type: 'scope', children: [{ type: 'node', id: 'nested' }] },
            { type: 'node', id: 'sibling' },
          ],
        },
        { type: 'node', id: 'retained' },
      ],
    };
    const session = new WeaveReconciler(input);
    const { root } = session.mount();
    const originalRoot = readWeaveCurrent(root);
    const scope = originalRoot.children[0];
    if (scope.type !== 'scope') throw new Error('Expected scope');
    const originalScope = readWeaveCurrent(scope);
    const nestedScope = originalScope.children[0];
    const originalNestedScope = readWeaveCurrent(nestedScope);
    const prepared = session.update({
      operations: [{ kind: 'remove', target: { kind: 'scope', scopeId: scope.scopeId } }],
    });
    expect(prepared.compilation.result).toEqual(compileToScene({ ...input, children: [input.children[1]] }));
    prepared.commit();
    expect(readWeaveCurrent(root).scopeIds.has(scope.scopeId)).toBe(false);
    expect(readWeaveCurrent(scope)).toBe(originalScope);
    expect(readWeaveCurrent(nestedScope)).toBe(originalNestedScope);
    expect(scope.pending).toBeNull();
    expect(nestedScope.pending).toBeNull();
    prepared.rollback();
    expect(readWeaveCurrent(root)).toBe(originalRoot);
    expect(readWeaveCurrent(scope).dependencies.has(nestedScope)).toBe(true);
    expect(readWeaveCurrent(nestedScope).consumers.has(scope)).toBe(true);
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

it('宿主装饰默认更新与完整编译一致，并保留提交前结果', () => {
  const children: IRScene['children'] = [
    { type: 'node', id: 'n', text: 'body', label: { text: 'label' } },
    {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [0, 30] },
        { type: 'step', kind: 'line', to: [100, 30] },
      ],
      label: { text: 'path' },
      arrow: { end: {} },
    },
  ];
  const input: IRScene = { type: 'scene', version: 1, children: [{ type: 'scope', id: 'host', children }] };
  const session = new WeaveReconciler(input);
  const mounted = session.mount();
  const before = structuredClone(mounted.compilation.result);
  const scope = readWeaveCurrent(mounted.root).children[0];
  if (scope.type !== 'scope') throw new Error('Expected scope');
  const properties = {
    type: 'scope' as const,
    id: 'host',
    defaults: {
      node: { label: { distance: 20, pin: true, font: { size: 18 } } },
      path: { label: { distance: 12, sloped: true }, arrow: { shape: 'stealth', scale: 2 } },
    },
  };
  const updated = session.update({
    operations: [{ kind: 'update', target: { kind: 'scope', scopeId: scope.scopeId }, input: properties }],
  });
  expect(updated.compilation.result).toEqual(compileToScene({ ...input, children: [{ ...properties, children }] }));
  expect(mounted.compilation.result).toEqual(before);
  updated.commit();
});

it('普通标记参数和路径更新与完整编译保持一致', () => {
  const definition = {
    name: 'dot',
    emit: ({ params }: MarkEmitContext): Array<ScenePrimitive> => [
      { type: 'ellipse', cx: 0, cy: 0, rx: Number(params.radius), ry: 3, fill: 'red' },
    ],
  };
  const input: IRScene = {
    type: 'scene',
    version: 1,
    children: [
      {
        type: 'path',
        id: 'host',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [100, 0] },
        ],
        marks: [{ pos: 0.5, shape: 'dot', params: { radius: 2 } }],
      },
    ],
  };
  const options = { marks: [definition] };
  const session = new WeaveReconciler(input, options);
  const mounted = session.mount();
  const before = structuredClone(mounted.compilation.result);
  const path: IRPath = {
    type: 'path',
    id: 'host',
    children: [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [200, 0] },
    ],
    marks: [{ pos: 0.75, shape: 'dot', params: { radius: 6 } }],
  };
  const update = session.update({
    operations: [{ kind: 'update', target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'host' }, input: path }],
  });
  expect(update.compilation.result).toEqual(compileToScene({ ...input, children: [path] }, options));
  expect(mounted.compilation.result).toEqual(before);
  update.commit();
});
