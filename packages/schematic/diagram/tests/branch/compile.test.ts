import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { BranchDiagramSchema, createBranchDiagramProviderContribution } from '../../src/branch';

const compile = (source: Record<string, unknown>) =>
  compileToScene(
    {
      version: 1,
      type: 'scene',
      children: [BranchDiagramSchema.parse({ namespace: 'diagram', type: 'branch', ...source })],
    },
    {
      ...resolveCoreProviderDependencies({ contributions: [createBranchDiagramProviderContribution()] }),
      padding: 0,
      measureText: text => ({ width: text.length * 8, height: 10, ascent: 8, descent: 2 }),
    },
  );

describe('分支编译', () => {
  it('使用组装的参考产物编译共享分叉和合并节点', () => {
    const result = compile({
      nodes: ['a', 'b', 'c'].map(id => ({ id, labels: [{ text: `label-${id}` }] })),
      branches: [
        { id: 'main', nodes: ['a', 'c'] },
        { id: 'feature', nodes: ['a', 'b', 'c'] },
      ],
      mainBranch: 'main',
      presentation: { title: { text: 'Roadmap' } },
    });

    expect(result.artifacts.some(artifact => artifact.kind === 'composite')).toBe(true);
    expect(JSON.stringify(result.scene)).toContain('label-b');
  });

  it.each([
    { nodes: [{ id: 'a' }], branches: [{ id: 'x', nodes: ['a'] }], mainBranch: 'missing' },
    {
      nodes: [{ id: 'a' }],
      branches: [
        { id: 'x', nodes: ['a'] },
        { id: 'x', nodes: ['a'] },
      ],
    },
    { nodes: [{ id: 'a' }, { id: 'a' }], branches: [{ id: 'x', nodes: ['a'] }] },
    { nodes: [{ id: 'a' }], branches: [{ id: 'x', nodes: ['missing'] }] },
    {
      nodes: [{ id: 'a' }, { id: 'b' }],
      branches: [
        { id: 'x', nodes: ['a', 'b'] },
        { id: 'y', nodes: ['b', 'a'] },
      ],
    },
    { nodes: [{ id: 'a' }, { id: 'b' }], branches: [{ id: 'x', nodes: ['a'] }] },
    { nodes: [{ id: 'a' }], branches: [{ id: 'x', nodes: ['a', 'a'] }] },
  ])('拒绝无效拓扑 %j', source => expect(() => compile(source)).toThrow());

  it('拒绝冲突的共享段外观', () => {
    expect(() =>
      compile({
        nodes: [{ id: 'a' }, { id: 'b' }],
        branches: [
          { id: 'x', nodes: ['a', 'b'], style: { stroke: 'red' } },
          { id: 'y', nodes: ['a', 'b'], style: { stroke: 'blue' } },
        ],
      }),
    ).toThrow();
  });
});
