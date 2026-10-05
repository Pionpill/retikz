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

it('keeps layout deterministic when catalog order differs from branch progression', () => {
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

it.each(invalidOutputs)('rejects custom layout output: $name', ({ change }) => {
  const definition = defineBranchLayout({
    name: 'invalid',
    description: 'Invalid geometry fixture',
    layout: input => change(LanesBranchLayoutDefinition.layout(input)),
  });

  expect(() => compile(source, { branchLayouts: [definition], defaultBranchLayout: definition.name })).toThrow();
});

it.each(['right', 'left', 'up', 'down'])(
  'aligns shared marker geometry with assembled Scene in %s direction',
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

it('merges identical directed segments while retaining both branch correspondences', () => {
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

it('uses custom layout through the same registry and rejects omitted geometry', () => {
  const custom = defineBranchLayout({ ...LanesBranchLayoutDefinition, name: 'custom' });

  expect(
    compile(source, { branchLayouts: [custom], defaultBranchLayout: custom.name }).scene.primitives.length,
  ).toBeGreaterThan(0);

  const invalid = defineBranchLayout({ ...custom, layout: input => ({ ...custom.layout(input), segments: [] }) });

  expect(() => compile(source, { branchLayouts: [invalid], defaultBranchLayout: invalid.name })).toThrow();
  expect(() => compile(source, { defaultBranchLayout: 'missing' })).toThrow();
  expect(() => compile(source, { branchLayouts: [{ ...custom, name: 'lanes' }] })).toThrow();
});

it('supports standalone nodes and keeps local namespaces independent', () => {
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

it('preserves explicit root defaults and publishes geometry after the root transform', () => {
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
