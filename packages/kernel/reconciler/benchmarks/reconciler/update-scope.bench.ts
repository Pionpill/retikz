import type { IRScope } from '@retikz/core';

import { createBenchmarkNode } from './_execution';
import { defineUpdateBenchmarks } from './_update';
import type { UpdateBenchmarkCase, UpdateBenchmarkScene } from './_update-workload';
import { createUpdateScene, createUpdateWorkload, updateChild } from './_update-workload';

/** 更新最外 Scope 自身，保留 children；深层场景包含 32 个 Scope */
const createScopeUpdate = (count: number, kind: 'defaults' | 'translate' | 'transform' | 'deep') => {
  let children: UpdateBenchmarkScene['children'] = Array.from({ length: count }, (_, index) => {
    const node = createBenchmarkNode(index);
    node.style = { stroke: '#334155', font: { size: 10 } };
    return node;
  });
  if (kind === 'deep') for (let depth = 0; depth < 31; depth++) children = [{ type: 'scope', children }];
  const own: Omit<IRScope, 'children'> = { type: 'scope' };
  const nextOwn: Omit<IRScope, 'children'> =
    kind === 'defaults' || kind === 'deep'
      ? { type: 'scope', defaults: { node: { style: { fill: '#ef4444' } } } }
      : {
          type: 'scope',
          transforms:
            kind === 'translate'
              ? [{ kind: 'translate', x: 3, y: 5 }]
              : [
                  { kind: 'rotate', degrees: 15 },
                  { kind: 'scale', x: 1.1, y: 0.9 },
                ],
        };
  return createUpdateWorkload(
    [createUpdateScene([{ ...own, children }]), createUpdateScene([{ ...nextOwn, children }])],
    rootId => [[updateChild(rootId, 0, nextOwn)], [updateChild(rootId, 0, own)]],
    1,
  );
};

/** Scope 继承和变换传播，不用替换子树伪装自身属性更新 */
const scopeUpdateCases: ReadonlyArray<UpdateBenchmarkCase> = [
  { kind: 'defaults', label: 'Scope 默认填色，影响全部后代', create: count => createScopeUpdate(count, 'defaults') },
  { kind: 'translate', label: 'Scope 平移，影响全部后代', create: count => createScopeUpdate(count, 'translate') },
  { kind: 'transform', label: 'Scope 旋转缩放，影响全部后代', create: count => createScopeUpdate(count, 'transform') },
  { kind: 'deep', label: '32 层 Scope 的继承传播', create: count => createScopeUpdate(count, 'deep') },
  {
    kind: 'subtree',
    label: '局部 Scope 子树插入与删除，含 10% 节点',
    create: count => {
      const nodes = Array.from({ length: count }, (_, index) => createBenchmarkNode(index));
      const inserted = {
        type: 'scope' as const,
        children: Array.from({ length: Math.max(1, Math.floor(count / 10)) }, (_, index) =>
          createBenchmarkNode(count + index),
        ),
      };
      return createUpdateWorkload(
        [createUpdateScene(nodes), createUpdateScene([...nodes, inserted])],
        rootId => [
          [{ kind: 'insert', parentId: rootId, index: count, elements: [inserted] }],
          [{ kind: 'remove', target: { kind: 'child', scopeId: rootId, index: count } }],
        ],
        1 + inserted.children.length,
      );
    },
  },
];

defineUpdateBenchmarks('scope', scopeUpdateCases);
