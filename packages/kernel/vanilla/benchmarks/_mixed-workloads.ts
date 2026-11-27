import type { IRNode, IRPath, IRScene, IRChild, ScenePrimitive } from '@retikz/core';
import type { CompileResult } from '@retikz/reconciler';
import { expect } from 'vitest';

import { createCompileWorkload } from '../../reconciler/benchmarks/reconcile/_workload';

/** 以稳定节点 ID 连接矩形，稀疏图每十个节点一条边，链图连接所有相邻节点 */
export const connectedWorkload = (count: number, topology: 'sparse' | 'chain') => {
  const nodes = Array.from({ length: count }, (_, index): IRNode => ({
    type: 'node',
    id: 'node-' + index,
    shape: 'rectangle',
    position: [20 + (index % 25) * 28, 20 + Math.floor(index / 25) * 18],
    layout: { minimumSize: { width: 10, height: 8 }, padding: 0 },
    style: { fill: '#2255aa' },
  }));
  const edgeCount = topology === 'chain' ? count - 1 : count / 10;
  const paths = Array.from({ length: edgeCount }, (_, index): IRPath => {
    const start = topology === 'chain' ? index : index * 10;
    return {
      type: 'path',
      id: 'edge-' + index,
      children: [
        { type: 'step', kind: 'move', to: { id: 'node-' + start } },
        { type: 'step', kind: 'line', to: { id: 'node-' + (start + 1) } },
      ],
    };
  });
  const ir: IRScene = { type: 'scene', version: 1, children: [...nodes, ...paths] };
  return { ir, nodes, paths };
};

type ElementKind = 'Node' | 'Path' | 'Scope';
type SceneCase = {
  label: string;
  size: string;
  nodes: number;
  paths: number;
  scopes: number;
  create: () => { ir: IRScene; verify: (result: CompileResult) => void };
};

/** 只统计最终可见的矩形与路径，不依赖 Scope 是否产生 group 包装 */
const checkedScene = (children: Array<IRChild>, nodes: number, paths: number) => {
  const ir: IRScene = { type: 'scene', version: 1, children };
  return {
    ir,
    verify: (result: CompileResult) => {
      let rectangles = 0,
        lines = 0;
      const visit = (primitive: ScenePrimitive) => {
        if (primitive.type === 'group') primitive.children.forEach(visit);
        else if (primitive.type === 'rect') rectangles++;
        else if (primitive.type === 'path') lines++;
      };
      result.scene.primitives.forEach(visit);
      expect([rectangles, lines]).toEqual([nodes, paths]);
    },
  };
};

/** 规模表示被测实体数量；Scope 的支撑节点始终匿名，被测实体均有唯一 ID */
const elementCase = (kind: ElementKind, count: number): SceneCase => {
  const nodes = kind === 'Path' ? 0 : count,
    paths = kind === 'Path' ? count : 0;
  return {
    label: kind,
    size: count + ' ' + kind + (kind === 'Scope' ? ' + ' + count + ' Node' : ''),
    nodes,
    paths,
    scopes: kind === 'Scope' ? count : 0,
    create: () => {
      const columns = Math.ceil(Math.sqrt(count));
      const children = Array.from({ length: count }, (_, i): IRChild => {
        const id = 'item-' + i;
        const x = 20 + (i % columns) * 28,
          y = 20 + Math.floor(i / columns) * 18;
        if (kind === 'Path')
          return {
            type: 'path',
            id,
            style: { stroke: '#2255aa' },
            children: [
              { type: 'step', kind: 'move', to: [x, y] },
              { type: 'step', kind: 'line', to: [x + 10, y] },
            ],
          };
        const node: IRNode = {
          type: 'node',
          shape: 'rectangle',
          position: [x, y],
          layout: { minimumSize: { width: 10, height: 8 }, padding: 0 },
          style: { fill: '#2255aa' },
        };
        return kind === 'Scope' ? { type: 'scope', id, children: [node] } : { ...node, id };
      });
      return checkedScene(children, nodes, paths);
    },
  };
};

/** 增量编译初始帧与全量编译共用的输入矩阵，报告直接显示元素数量 */
export const sceneCases: Array<SceneCase> = [];
for (const kind of ['Node', 'Path', 'Scope'] as const)
  for (const count of [100, 1000, 10000]) sceneCases.push(elementCase(kind, count));
for (const count of [100, 1000])
  sceneCases.push({
    label: '混合',
    size: count + ' Node + ' + count / 10 + ' Path',
    nodes: count,
    paths: count / 10,
    scopes: 0,
    create: () => checkedScene(connectedWorkload(count, 'sparse').ir.children, count, count / 10),
  });
for (const count of [100, 500, 1000])
  sceneCases.push({
    label: '混合',
    size: count + ' Node + ' + count * 1.2 + ' Path + ' + count / 5 + ' Scope',
    nodes: count,
    paths: count * 1.2,
    scopes: count / 5,
    create: () => createCompileWorkload(count),
  });
