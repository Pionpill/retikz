import type { IRChild, IRNode, ThemeModeValue } from '@retikz/core';

import { lowerIRToKernel, ThemeMode } from '@retikz/core';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { IRGraphNode } from '../../src';

import * as Graph from '../../src';

const position = [0, 0] as const;

const sceneOf = (children: ReadonlyArray<IRChild>, mode: ThemeModeValue = ThemeMode.Light) => ({
  version: 1 as const,
  type: 'scene' as const,
  theme: { mode },
  children: Array.from(children),
});

const lowerNode = (node: IRGraphNode, mode: ThemeModeValue = ThemeMode.Light): IRNode => {
  const lowered = lowerIRToKernel(sceneOf([node], mode), { composites: [Graph.GraphNodeDefinition] });
  const child = lowered.children[0];
  if (child.type !== 'node') throw new Error('Expected GraphNode to lower to a Core Node');
  return child;
};

describe('GraphNode canonical semantic IR', () => {
  it('uses one schema and role to represent all four graph node semantics', () => {
    const nodes = (['terminal', 'stage', 'decision', 'junction'] as const).map(role =>
      Graph.createGraphNode({ id: role, role, position }),
    );

    expect(nodes).toMatchObject(
      ['terminal', 'stage', 'decision', 'junction'].map(role => ({
        namespace: 'graph',
        type: 'graphNode',
        id: role,
        role,
      })),
    );
    nodes.forEach(node => {
      expect(Graph.GraphNodeSchema.parse(JSON.parse(JSON.stringify(node)))).toEqual(node);
      expectTypeOf(node).toEqualTypeOf<IRGraphNode>();
    });
  });

  it('rejects missing or unknown roles and the old per-role discriminators', () => {
    expect(
      Graph.GraphNodeSchema.safeParse({ namespace: 'graph', type: 'graphNode', id: 'missing', position }).success,
    ).toBe(false);
    expect(
      Graph.GraphNodeSchema.safeParse({
        namespace: 'graph',
        type: 'graphNode',
        id: 'unknown',
        role: 'custom',
        position,
      }).success,
    ).toBe(false);
    expect(
      Graph.GraphNodeSchema.safeParse({ namespace: 'graph', type: 'stage', id: 'legacy', role: 'stage', position })
        .success,
    ).toBe(false);
  });

  it('lowers each role to its default Core Node shape', () => {
    expect(lowerNode(Graph.createGraphNode({ id: 'terminal', role: 'terminal', position }))).toMatchObject({
      shape: { type: 'rectangle', params: { cornerRadius: 1_000_000 } },
      minimumSize: { width: 48, height: 24 },
      padding: { x: 12, y: 6 },
    });
    expect(lowerNode(Graph.createGraphNode({ id: 'stage', role: 'stage', position }))).toMatchObject({
      shape: { type: 'rectangle', params: { cornerRadius: 8 } },
      padding: 8,
    });
    expect(lowerNode(Graph.createGraphNode({ id: 'decision', role: 'decision', position }))).toMatchObject({
      shape: { type: 'diamond', params: { aspectRatio: 1.8 } },
      padding: { x: 3, y: 2 },
    });
    expect(lowerNode(Graph.createGraphNode({ id: 'junction', role: 'junction', position }))).toMatchObject({
      shape: 'circle',
      minimumSize: { width: 8, height: 8 },
      padding: 0,
    });
  });

  it('lets an explicit shape override the role default while keeping role in Graph IR', () => {
    const node = Graph.createGraphNode({ id: 'decision', role: 'decision', position, shape: 'rectangle' });

    expect(node).toMatchObject({ type: 'graphNode', role: 'decision', shape: 'rectangle' });
    expect(lowerNode(node)).toMatchObject({ type: 'node', shape: 'rectangle' });
  });
});

describe('GraphNodeVariant lowering', () => {
  it.each([
    ['default', ThemeMode.Light, { textColor: '#000000', stroke: '#000000', fill: 'none' }],
    ['primary', ThemeMode.Light, { textColor: 'contrast', stroke: '#000000', fill: '#000000' }],
    ['secondary', ThemeMode.Light, { textColor: '#000000', stroke: 'none', fill: '#e6e6e6' }],
    ['outline', ThemeMode.Light, { textColor: '#000000', stroke: '#666666', fill: 'none' }],
    ['vibrant', ThemeMode.Light, { textColor: '#000000', stroke: '#000000', fill: '#d9d9d9' }],
    ['secondary', ThemeMode.Dark, { textColor: '#ffffff', stroke: 'none', fill: '#1a1a1a' }],
  ] as const)('applies the %s recipe in %s mode', (variant, mode, expected) => {
    const lowered = lowerNode(Graph.createGraphNode({ id: variant, role: 'stage', position, variant }), mode);
    expect(lowered).toMatchObject(expected);
  });

  it('gives explicit leaf paint precedence over the selected recipe', () => {
    const lowered = lowerNode(
      Graph.createGraphNode({
        id: 'custom-paint',
        role: 'stage',
        position,
        color: '#cc3366',
        variant: 'secondary',
        textColor: '#111111',
        stroke: '#222222',
        fill: '#333333',
      }),
    );

    expect(lowered).toMatchObject({ color: '#cc3366', textColor: '#111111', stroke: '#222222', fill: '#333333' });
  });

  it('does not leak Graph semantic fields into the lowered Core Node', () => {
    const lowered = lowerNode(Graph.createGraphNode({ id: 'lowered', role: 'decision', position, variant: 'primary' }));

    expect(lowered).not.toHaveProperty('namespace');
    expect(lowered).not.toHaveProperty('role');
    expect(lowered).not.toHaveProperty('variant');
  });
});
