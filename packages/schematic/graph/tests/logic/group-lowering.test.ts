import type { CompileWarning } from '@retikz/core';

import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';
import { compileInHarness, naturalProposal, pathPrimitivesOf, primitivesOf } from './test-utils';

describe('Group layout-aware lowering', () => {
  it('uses the default Surface shell as the only allocation for an empty Group', () => {
    const { result } = compileInHarness(Graph.createGroup({}), naturalProposal, Graph.createGraphDefinitions());

    expect(result.allocationBounds).toEqual({ x: 0, y: 0, width: 16, height: 16 });
    expect(result.slotSize).toEqual({ width: 16, height: 16 });
  });

  it('keeps boundary labels visual-only while drawing one default border', () => {
    const { output, result } = compileInHarness(
      Graph.createGroup({ labels: [{ text: 'external contract', position: 'top', distance: 8 }] }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );
    const visiblePaths = pathPrimitivesOf(output.scene.primitives).filter(
      path => path.fill !== 'none' || path.stroke !== 'none',
    );

    expect(result.allocationBounds).toEqual({ x: 0, y: 0, width: 16, height: 16 });
    expect(result.visualBounds.y).toBeLessThan(result.allocationBounds.y);
    expect(visiblePaths).toHaveLength(1);
    expect(visiblePaths[0]).toMatchObject({ fill: 'none', stroke: 'currentColor', strokeWidth: 1 });
  });

  it('arranges bottom caption after a non-empty body and includes bodyGap in allocation', () => {
    const body = { type: 'node', position: [10, 5], minimumSize: { width: 20, height: 10 }, padding: 0 } as const;
    const withoutGap = compileInHarness(
      Graph.createGroup({
        padding: 0,
        border: { stroke: 'none' },
        caption: { side: 'bottom', bodyGap: 0, title: { text: 'Caption' } },
        children: [body],
      }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    ).result;
    const withGap = compileInHarness(
      Graph.createGroup({
        padding: 0,
        border: { stroke: 'none' },
        caption: { side: 'bottom', bodyGap: 7, title: { text: 'Caption' } },
        children: [body],
      }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    ).result;

    expect(withGap.allocationBounds.height - withoutGap.allocationBounds.height).toBeCloseTo(7);
  });

  it('isolates generated presentation Nodes from authored nodeDefault', () => {
    const warnings: Array<CompileWarning> = [];
    const { output } = compileInHarness(
      Graph.createGroup({
        nodeDefault: { fill: '#ef4444', stroke: '#2563eb', textColor: 'contrast', minimumSize: 200 },
        caption: { title: { text: 'Title' } },
        labels: [{ text: 'Boundary' }],
      }),
      naturalProposal,
      Graph.createGraphDefinitions(),
      { onWarn: warning => warnings.push(warning) },
    );
    const paths = pathPrimitivesOf(output.scene.primitives);

    expect(paths.some(path => path.fill === '#ef4444' || path.stroke === '#2563eb')).toBe(false);
    expect(warnings).toEqual([]);
  });

  it('stacks nested Group graphTheme only onto visible Entity and Relation descendants', () => {
    const { output } = compileInHarness(
      Graph.createGroup({
        graphTheme: { rules: [{ type: 'entity', appearance: { fill: '#ef4444' } }] },
        caption: { title: { text: 'Outer' } },
        children: [
          Graph.createGroup({
            graphTheme: { rules: [{ type: 'entity', appearance: { fill: '#2563eb' } }] },
            children: [
              Graph.createEntity({ role: 'activity', position: [30, 20], text: 'Nested' }),
              { type: 'node', position: [100, 20], text: 'Core', fill: '#22c55e' },
            ],
          }),
        ],
      }),
      naturalProposal,
      Graph.createGraphDefinitions(),
    );
    const fills = primitivesOf(output.scene.primitives).flatMap(primitive =>
      'fill' in primitive ? [primitive.fill] : [],
    );

    expect(fills).toContain('#2563eb');
    expect(fills).toContain('#22c55e');
    expect(fills).not.toContain('#ef4444');
  });

  it('publishes the Group Scope id as a normal Core Relation target without exposing a host id', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [Graph.GraphProviderKey], providers: Graph.createGraphProviders() }],
    });
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          Graph.createGroup({ id: 'runtime', children: [{ type: 'node', position: [40, 30], text: 'Runtime' }] }),
          { type: 'node', id: 'consumer', position: [260, 30], text: 'Consumer' },
          {
            namespace: 'graph',
            type: 'relation',
            role: 'dependency',
            source: { id: 'runtime', anchor: 'right' },
            target: { id: 'consumer', anchor: 'left' },
          },
        ],
      },
      { ...definitions, padding: 0 },
    );
    const serialized = JSON.stringify(output.scene);

    expect(serialized).toContain('runtime');
    expect(serialized).not.toContain('__group');
  });
});
