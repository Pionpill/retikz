import type { IRNode } from '@retikz/core';

import { createBenchmarkNode } from './_execution';
import { defineUpdateBenchmarks } from './_update';
import type { UpdateBenchmarkCase, UpdateBenchmarkWorkload } from './_update-workload';
import { createUpdateScene, createUpdateWorkload, updateChild } from './_update-workload';

/** 只修改中间节点，独立节点用于区分自身成本与连线传播 */
const createNodeUpdate = (
  count: number,
  changeNode: (node: IRNode) => IRNode,
  change: UpdateBenchmarkWorkload['change'] = 'real',
): UpdateBenchmarkWorkload => {
  const nodes = Array.from({ length: count }, (_, index) => createBenchmarkNode(index));
  const index = Math.floor(count / 2);
  const changed = changeNode(nodes[index]);
  const next = nodes.map((node, position) => (position === index ? changed : node));
  return createUpdateWorkload(
    [createUpdateScene(nodes), createUpdateScene(next)],
    rootId => [[updateChild(rootId, index, changed)], [updateChild(rootId, index, nodes[index])]],
    change === 'real' ? 1 : 0,
    change,
  );
};

/** Node 自身失效；依赖传播在 scene 组用同样的节点移动测量 */
const nodeUpdateCases: ReadonlyArray<UpdateBenchmarkCase> = [
  {
    kind: 'style',
    label: '单节点填色',
    create: count => createNodeUpdate(count, node => ({ ...node, style: { ...node.style, fill: '#ef4444' } })),
  },
  {
    kind: 'position',
    label: '单节点位移，无连线',
    create: count => createNodeUpdate(count, node => ({ ...node, position: [37, 53] })),
  },
  {
    kind: 'size',
    label: '单节点宽度',
    create: count => createNodeUpdate(count, node => ({ ...node, layout: { ...node.layout, width: 120 } })),
  },
  {
    kind: 'text',
    label: '单节点正文',
    create: count => createNodeUpdate(count, node => ({ ...node, text: 'updated node' })),
  },
  {
    kind: 'label',
    label: '单节点标签',
    create: count => createNodeUpdate(count, node => ({ ...node, label: [{ text: 'label', position: 'top' }] })),
  },
  {
    kind: 'resource',
    label: '单节点渐变资源增删',
    create: count =>
      createNodeUpdate(count, node => ({
        ...node,
        style: {
          ...node.style,
          fill: {
            kind: 'linearGradient',
            angle: 0,
            stops: [
              { offset: 0, color: '#ff0000' },
              { offset: 1, color: '#0000ff' },
            ],
          },
        },
      })),
  },
  {
    kind: 'equal',
    label: '单节点新对象等值提交',
    create: count => createNodeUpdate(count, node => structuredClone(node), 'equal'),
  },
];

defineUpdateBenchmarks('node', nodeUpdateCases);
