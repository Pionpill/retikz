import type { IRPath, IRScope } from '@retikz/core';
import { expect } from 'vitest';

import { createBenchmarkNode, createBenchmarkWorkload, inspectBenchmarkScene } from './_execution';

/** Scope 数量、拓扑、上下文与内容分别变化 */
export const scopeBenchmarkCases = [
  { kind: 'empty', label: '基础：空 Scope' },
  { kind: 'flat', label: '对照：无 Scope 的节点' },
  { kind: 'wide-4', label: '宽度：4 个平级 Scope' },
  { kind: 'wide-32', label: '宽度：32 个平级 Scope' },
  { kind: 'deep-4', label: '深度：4 层 Scope' },
  { kind: 'deep-32', label: '深度：32 层 Scope' },
  { kind: 'defaults', label: '继承：32 层稀疏覆盖' },
  { kind: 'translate', label: '变换：32 层平移' },
  { kind: 'transform', label: '变换：32 层旋转与缩放' },
  { kind: 'paths', label: '内容：32 个平级 Scope，仅 Path' },
  { kind: 'mixed', label: '内容：32 个平级 Scope，Node＋Path' },
] as const;

/** Scope 的单项特征 */
type ScopeBenchmarkKind = (typeof scopeBenchmarkCases)[number]['kind'];

/** 固定叶数量，宽 / 深 32 Scope 对照具有相同 Scope 总数 */
export const createScopeWorkload = (kind: ScopeBenchmarkKind, count: number) => {
  if (kind === 'empty')
    return createBenchmarkWorkload(
      Array.from({ length: count }, (): IRScope => ({ type: 'scope', children: [] })),
      result => {
        expect(inspectBenchmarkScene(result).leaves).toHaveLength(0);
        expect([...(result.scene.resources?.paints ?? []), ...(result.scene.resources?.clips ?? [])]).toHaveLength(0);
      },
    );

  const nodeCount = kind === 'paths' ? 0 : count;
  const pathCount = kind === 'paths' || kind === 'mixed' ? count : 0;
  const leaves: IRScope['children'] = [];
  for (let index = 0; index < count; index++) {
    if (nodeCount > 0) {
      const node = createBenchmarkNode(index);
      // 继承场景只从 Scope 读取 fill；其余节点参数与基础场景相同
      node.style = { stroke: '#334155', font: { size: 10 } };
      leaves.push(node);
    }
    if (pathCount > 0) {
      const x = (index % 20) * 500;
      const y = Math.floor(index / 20) * 300;
      const path: IRPath = {
        type: 'path',
        style: { stroke: '#334155', strokeWidth: 1 },
        children: [
          { type: 'step', kind: 'move', to: [x, y] },
          { type: 'step', kind: 'line', to: [x + 100, y + 100] },
        ],
      };
      leaves.push(path);
    }
  }
  const scopeCount = kind === 'wide-4' || kind === 'deep-4' ? 4 : 32;
  const deep =
    kind === 'deep-4' || kind === 'deep-32' || kind === 'defaults' || kind === 'translate' || kind === 'transform';
  let children = leaves;
  if (deep) {
    for (let depth = scopeCount - 1; depth >= 0; depth--) {
      const scope: IRScope = { type: 'scope', children };
      if (kind === 'defaults') scope.defaults = { node: { style: { fill: depth % 2 === 0 ? '#ff0000' : '#00aa00' } } };
      if (kind === 'translate') scope.transforms = [{ kind: 'translate', x: 1, y: 2 }];
      if (kind === 'transform')
        scope.transforms = [
          { kind: 'rotate', degrees: 1 },
          { kind: 'scale', x: 1.01, y: 0.99 },
        ];
      children = [scope];
    }
  } else if (kind !== 'flat') {
    const scopes = Array.from({ length: scopeCount }, (): IRScope => ({ type: 'scope', children: [] }));
    for (let index = 0; index < leaves.length; index++)
      scopes[(kind === 'mixed' ? Math.floor(index / 2) : index) % scopeCount].children.push(leaves[index]);
    children = scopes;
  }

  return createBenchmarkWorkload(children, result => {
    const output = inspectBenchmarkScene(result);
    const nodes = output.leaves.filter(primitive => primitive.type === 'rect');
    const paths = output.leaves.filter(primitive => primitive.type === 'path');
    expect(nodes).toHaveLength(nodeCount);
    expect(paths).toHaveLength(pathCount);
    expect(output.leaves).toHaveLength(nodeCount + pathCount);
    for (const node of nodes) {
      expect(node.width).toBe(80);
      expect(node.height).toBe(40);
      if (kind === 'defaults') expect(node.fill).toBe('#00aa00');
    }
    if (pathCount > 0) {
      expect(paths.every(path => path.commands.length === 2)).toBe(true);
      expect(
        paths.some(
          path =>
            JSON.stringify(path.commands) ===
            JSON.stringify([
              { kind: 'move', to: [0, 0] },
              { kind: 'line', to: [100, 100] },
            ]),
        ),
      ).toBe(true);
    }
    const transforms = output.groups.flatMap(group => group.transforms ?? []);
    if (kind === 'translate') {
      expect(transforms.filter(transform => transform.kind === 'translate')).toHaveLength(scopeCount);
      expect(
        transforms.every(transform => transform.kind === 'translate' && transform.x === 1 && transform.y === 2),
      ).toBe(true);
    }
    if (kind === 'transform') {
      expect(transforms.filter(transform => transform.kind === 'rotate')).toHaveLength(scopeCount);
      expect(transforms.filter(transform => transform.kind === 'scale')).toHaveLength(scopeCount);
    }
    expect([...(result.scene.resources?.paints ?? []), ...(result.scene.resources?.clips ?? [])]).toHaveLength(0);
  });
};
