import type { IRCoordinate, IRNode, IRPath, IRScene } from '@retikz/core';

import { createBenchmarkNode } from './_execution';
import { defineUpdateBenchmarks } from './_update';
import { createUpdateWorkload, updateChild } from './_update-workload';
import type { UpdateBenchmarkCase } from './_update-workload';

/** 扇出保持节点与路径总量一致，区别真实几何传播与只改绘制 */
const createFanout = (count: number, change: 'paint' | 'position' | 'size', center: boolean) => {
  const origin: IRNode = { ...createBenchmarkNode(0), id: 'origin' };
  const nodes = Array.from({ length: count }, (_, index) => ({
    ...createBenchmarkNode(index + 1),
    id: `target-${index}`,
  }));
  const paths: Array<IRPath> = nodes.map((node, index) => ({
    type: 'path',
    id: `edge-${index}`,
    children: [
      { type: 'step', kind: 'move', to: { id: 'origin', ...(center ? { anchor: 'center' } : {}) } },
      { type: 'step', kind: 'line', to: { id: node.id, ...(center ? { anchor: 'center' } : {}) } },
    ],
  }));
  const next: IRNode =
    change === 'paint'
      ? { ...origin, style: { ...origin.style, fill: '#ef4444' } }
      : change === 'size'
        ? { ...origin, layout: { ...origin.layout, width: 120 } }
        : { ...origin, position: [10, 20] };
  const createScene = (node: IRNode): IRScene => ({ type: 'scene', version: 1, children: [node, ...nodes, ...paths] });
  return createUpdateWorkload(
    [createScene(origin), createScene(next)],
    root => [[updateChild(root, 0, next)], [updateChild(root, 0, origin)]],
    1,
  );
};

const cases: ReadonlyArray<UpdateBenchmarkCase> = [
  ...(['paint', 'position', 'size'] as const).map(change => ({
    kind: `fanout-${change}`,
    label: `单生产者 ${{ paint: '只改填色', position: '移动', size: '尺寸变化' }[change]}；N条边界连线`,
    create: (count: number) => createFanout(count, change, false),
  })),
  {
    kind: 'fanout-center-size',
    label: '中心锚点不变，节点变宽；N条连线',
    create: count => createFanout(count, 'size', true),
  },
  {
    kind: 'chain',
    label: '有序坐标定位长链，根移动',
    create: count => {
      const coordinates: Array<IRCoordinate> = Array.from({ length: count }, (_, index) => ({
        type: 'coordinate',
        id: `point-${index}`,
        position: index === 0 ? [0, 0] : { of: `point-${index - 1}`, direction: 'right', distance: 1 },
      }));
      const next: IRCoordinate = { ...coordinates[0], position: [1, 1] };
      const consumer: IRNode = {
        ...createBenchmarkNode(0),
        position: { of: `point-${count - 1}`, direction: 'right', distance: 0 },
      };
      const createScene = (root: IRCoordinate): IRScene => ({
        type: 'scene',
        version: 1,
        children: [root, ...coordinates.slice(1), consumer],
      });
      return createUpdateWorkload(
        [createScene(coordinates[0]), createScene(next)],
        root => [[updateChild(root, 0, next)], [updateChild(root, 0, coordinates[0])]],
        1,
      );
    },
  },
  {
    kind: 'diamond',
    label: '同批双源变化，N条路径合流',
    create: count => {
      const first: IRCoordinate = { type: 'coordinate', id: 'first', position: [0, 0] };
      const second: IRCoordinate = { type: 'coordinate', id: 'second', position: [100, 0] };
      const nextFirst: IRCoordinate = { ...first, position: [0, 20] };
      const nextSecond: IRCoordinate = { ...second, position: [120, 0] };
      const paths: Array<IRPath> = Array.from({ length: count }, (_, index) => ({
        type: 'path',
        id: `edge-${index}`,
        children: [
          { type: 'step', kind: 'move', to: { id: 'first' } },
          { type: 'step', kind: 'line', to: { id: 'second' } },
        ],
      }));
      const createScene = (a: IRCoordinate, b: IRCoordinate): IRScene => ({
        type: 'scene',
        version: 1,
        children: [a, b, ...paths],
      });
      return createUpdateWorkload(
        [createScene(first, second), createScene(nextFirst, nextSecond)],
        root => [
          [updateChild(root, 0, nextFirst), updateChild(root, 1, nextSecond)],
          [updateChild(root, 0, first), updateChild(root, 1, second)],
        ],
        2,
      );
    },
  },
];

defineUpdateBenchmarks('scene', cases);
