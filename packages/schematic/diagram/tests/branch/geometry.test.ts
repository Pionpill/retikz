import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import type { IRChild } from '@retikz/core';
import { expect, it } from 'vitest';

import {
  BranchDiagramArtifactSchema,
  BranchDiagramSchema,
  createBranchDiagramProviderContribution,
  defineBranchLayout,
  LanesBranchLayoutDefinition,
} from '../../src/branch';
import type { BranchDiagramDefinitionOptions, BranchLayoutOutput } from '../../src/branch';

const compile = (source: Record<string, unknown>, options: BranchDiagramDefinitionOptions = {}) =>
  compileToScene(
    {
      version: 1,
      type: 'scene',
      children: [BranchDiagramSchema.parse({ namespace: 'diagram', type: 'branch', ...source })],
    },
    {
      ...resolveCoreProviderDependencies({ contributions: [createBranchDiagramProviderContribution(options)] }),
      artifacts: { nodeLayouts: true },
      padding: 0,
      measureText: text => ({ width: text.length * 8, height: 10, ascent: 8, descent: 2 }),
    },
  );

const source = {
  nodes: ['a', 'b', 'c'].map(id => ({ id, labels: [{ text: `long label ${id}` }] })),
  branches: [
    { id: 'main', nodes: ['a', 'c'] },
    { id: 'side', nodes: ['a', 'b', 'c'] },
  ],
  mainBranch: 'main',
};

it('当目录顺序与分支进度不同时，保持布局确定性', () => {
  const reversed = { ...source, nodes: [...source.nodes].reverse() };
  const first = compile(reversed);

  expect(compile(reversed).artifacts).toEqual(first.artifacts);

  const artifact = BranchDiagramArtifactSchema.parse(
    first.artifacts.find(value => value.kind === 'composite' && value.type === 'branch')?.value,
  );
  const positions = new Map(artifact.nodes.map(node => [node.id, node.position[0]]));

  expect(positions.get('a')).toBeLessThan(positions.get('b')!);
  expect(positions.get('b')).toBeLessThan(positions.get('c')!);
});

const invalidOutputs: Array<{
  name: string;
  change: (output: BranchLayoutOutput) => BranchLayoutOutput;
}> = [
  { name: 'missing node', change: output => ({ ...output, nodes: output.nodes.slice(1) }) },
  {
    name: 'extra node',
    change: output => ({ ...output, nodes: [...output.nodes, { id: 'extra', position: [0, 0], lane: 0 }] }),
  },
  {
    name: 'nonfinite coordinate',
    change: output => ({
      ...output,
      nodes: output.nodes.map(node => (node.id === 'b' ? { ...node, position: [NaN, 0] } : node)),
    }),
  },
  {
    name: 'broken main lane',
    change: output => ({ ...output, nodes: output.nodes.map(node => (node.id === 'c' ? { ...node, lane: 3 } : node)) }),
  },
  {
    name: 'overlapping lanes',
    change: output => ({
      ...output,
      nodes: output.nodes.map(node => ({ ...node, position: [node.position[0], 0] })),
      segments: output.segments.map(segment => ({ ...segment, points: segment.points.map(point => [point[0], 0]) })),
    }),
  },
  {
    name: 'wrong route endpoint',
    change: output => ({
      ...output,
      segments: output.segments.map(segment => ({ ...segment, points: [[999, 999], ...segment.points.slice(1)] })),
    }),
  },
];

it.each(invalidOutputs)('拒绝自定义布局输出：$name', ({ change }) => {
  const definition = defineBranchLayout({
    name: 'invalid',
    description: 'Invalid geometry fixture',
    layout: input => change(LanesBranchLayoutDefinition.layout(input)),
  });

  expect(() => compile(source, { branchLayouts: [definition], defaultBranchLayout: definition.name })).toThrow();
});

it.each(['right', 'left', 'up', 'down'])(
  '将共享标记几何体与 %s 方向上组装的 Scene 对齐',
  direction => {
    const result = compile({
      ...source,
      layout: { direction },
      presentation: { title: { text: 'Title' }, description: { text: 'Caption' } },
      frame: { padding: 16 },
    });
    const envelope = result.artifacts.find(
      artifact => artifact.kind === 'composite' && artifact.namespace === 'diagram' && artifact.type === 'branch',
    );
    const artifact = BranchDiagramArtifactSchema.parse(envelope?.value);

    expect(artifact.nodes).toHaveLength(3);
    expect(artifact.segments).toHaveLength(3);
    expect(artifact.nodes.find(node => node.id === 'a')?.lane).toBe(artifact.nodes.find(node => node.id === 'c')?.lane);

    for (const node of artifact.nodes) {
      expect(node.markerBounds.width).toBe(10);
      expect(node.visualBounds.width).toBeGreaterThan(10);

      const observations = result.artifacts.filter(value => value.kind === 'nodeLayout' && value.value.id === node.id);

      expect(observations).toHaveLength(1);

      const observed = observations[0];
      if (observed.kind !== 'nodeLayout') throw new Error('Expected node layout');

      expect(observed.value.rect.x).toBeCloseTo(node.position[0]);
      expect(observed.value.rect.y).toBeCloseTo(node.position[1]);
    }
  },
);

it('合并相同的有向线段，同时保留两个分支对应关系', () => {
  const result = compile({
    nodes: [{ id: 'a' }, { id: 'b' }],
    branches: [
      { id: 'x', nodes: ['a', 'b'], style: { stroke: 'red', strokeWidth: 2 } },
      { id: 'y', nodes: ['a', 'b'], style: { strokeWidth: 2, stroke: 'red' } },
    ],
  });
  const artifact = BranchDiagramArtifactSchema.parse(
    result.artifacts.find(value => value.kind === 'composite' && value.type === 'branch')?.value,
  );

  expect(artifact.segments).toHaveLength(1);
  expect(artifact.branches.map(branch => branch.segments)).toEqual([[0], [0]]);
});

it('通过相同的注册表使用自定义布局并拒绝省略的几何图形', () => {
  const custom = defineBranchLayout({ ...LanesBranchLayoutDefinition, name: 'custom' });

  expect(
    compile(source, { branchLayouts: [custom], defaultBranchLayout: custom.name }).scene.primitives.length,
  ).toBeGreaterThan(0);

  const invalid = defineBranchLayout({ ...custom, layout: input => ({ ...custom.layout(input), segments: [] }) });

  expect(() => compile(source, { branchLayouts: [invalid], defaultBranchLayout: invalid.name })).toThrow();
  expect(() => compile(source, { defaultBranchLayout: 'missing' })).toThrow();
  expect(() => compile(source, { branchLayouts: [{ ...custom, name: 'lanes' }] })).toThrow();
});

it('支持独立节点并保持本地命名空间独立', () => {
  const child: IRChild = BranchDiagramSchema.parse({
    namespace: 'diagram',
    type: 'branch',
    localNamespace: true,
    nodes: [{ id: 'only' }],
    branches: [{ id: 'only', nodes: ['only'] }],
  });
  const result = compileToScene(
    { version: 1, type: 'scene', children: [child, child] },
    resolveCoreProviderDependencies({ contributions: [createBranchDiagramProviderContribution()] }),
  );

  expect(result.artifacts.filter(artifact => artifact.kind === 'composite' && artifact.type === 'branch')).toHaveLength(
    2,
  );
});

it('保留显式根默认值并在根变换后发布几何体', () => {
  const result = compile({
    ...source,
    defaults: { node: { style: { stroke: 'red', font: { size: 24 } } } },
    transforms: [{ kind: 'translate', x: 100, y: 50 }],
  });
  const artifact = BranchDiagramArtifactSchema.parse(
    result.artifacts.find(value => value.kind === 'composite' && value.type === 'branch')?.value,
  );

  for (const node of artifact.nodes) {
    const handle = result.spatialHandles.entries.find(value => value.id === `node:${node.id}`);

    expect(handle?.geometry.bounds.x).toBeCloseTo(node.visualBounds.x + 100);
    expect(handle?.geometry.bounds.y).toBeCloseTo(node.visualBounds.y + 50);
  }

  expect(JSON.stringify(result.scene)).toContain('red');
});
