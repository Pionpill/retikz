import type { InputChild, InputEmbed, InputEmbedAdapter, InputEmbedContext } from '@retikz/vanilla';

import { GraphConnectorProvider, GraphFrameProvider, GraphNodeProvider } from '@retikz/graph';
import { normalizeScene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import {
  createGraphVanillaAdapters,
  graphConnector,
  GraphConnectorInputEmbedAdapter,
  graphFrame,
  GraphFrameInputEmbedAdapter,
  graphNode,
  GraphNodeInputEmbedAdapter,
} from '../src';

const normalizeChildren = (children: ReadonlyArray<InputChild>) => {
  const normalized = normalizeScene({ children });
  return {
    children: normalized.ir.children,
    providerDependencies: {
      roots: normalized.contributions.flatMap(contribution => contribution.roots),
      providers: normalized.contributions.flatMap(contribution => contribution.providers),
    },
    authoringSites: [],
  };
};

const contextOf = (id: string, kind: string): InputEmbedContext => ({
  id,
  kind,
  layerId: 'layer',
  identityPath: ['layer', id],
  normalizeChildren,
});

const lower = <TProps>(spec: InputEmbed<TProps>, adapter: InputEmbedAdapter<TProps>) =>
  adapter.lower(spec.props, contextOf(spec.id, spec.kind));

describe('@retikz/graph-vanilla package boundary', () => {
  it('exports exactly the unified three Graph adapters', async () => {
    const graphVanilla = await import('../src');

    expect(graphVanilla.GraphFrameInputEmbedAdapter).toBeDefined();
    expect(graphVanilla.GraphNodeInputEmbedAdapter).toBeDefined();
    expect(graphVanilla.GraphConnectorInputEmbedAdapter).toBeDefined();
    expect(graphVanilla).not.toHaveProperty('stage');
    expect(graphVanilla).not.toHaveProperty('TerminalInputEmbedAdapter');
    expect(graphVanilla).not.toHaveProperty('DecisionInputEmbedAdapter');
  });
});

describe('Graph Vanilla semantic authoring', () => {
  it('creates three adapters and preserves GraphNode role and variant', () => {
    const adapters = createGraphVanillaAdapters();
    const nodeAdapter = adapters.find(adapter => adapter.kind === 'graph.graphNode');
    expect(adapters.map(adapter => adapter.kind)).toEqual([
      'graph.graphFrame',
      'graph.graphNode',
      'graph.graphConnector',
    ]);
    expect(nodeAdapter).toBeDefined();

    const contribution = lower(
      graphNode('vibrant', { role: 'stage', position: [0, 0], color: '#123456', variant: 'vibrant' }),
      nodeAdapter!,
    );
    expect(contribution.node).toMatchObject({
      namespace: 'graph',
      type: 'graphNode',
      role: 'stage',
      color: '#123456',
      variant: 'vibrant',
    });
    expect(contribution.providerDependencies.roots[0]).toEqual(GraphNodeProvider.key);
  });

  it('returns embeds for GraphFrame, GraphNode, and GraphConnector', () => {
    expect(graphFrame('frame', { header: { child: { type: 'node', position: [0, 0] } } })).toMatchObject({
      type: 'embed',
      id: 'frame',
      kind: 'graph.graphFrame',
    });
    expect(graphNode('stage', { role: 'stage', position: [20, 0] })).toMatchObject({
      type: 'embed',
      id: 'stage',
      kind: 'graph.graphNode',
    });
    expect(graphConnector('flow', { role: 'flow', way: ['start', 'stage'] })).toMatchObject({
      type: 'embed',
      id: 'flow',
      kind: 'graph.graphConnector',
    });
  });

  it.each([
    {
      type: 'graphFrame',
      id: 'frame',
      lower: () => lower(graphFrame('frame', { header: { child: { type: 'node', position: [0, 0] } } }), GraphFrameInputEmbedAdapter),
    },
    {
      type: 'graphNode',
      id: 'node',
      lower: () => lower(graphNode('node', { role: 'decision', position: [20, 0] }), GraphNodeInputEmbedAdapter),
    },
    {
      type: 'graphConnector',
      id: 'connector',
      lower: () => lower(graphConnector('connector', { role: 'flow', way: ['node', 'target'] }), GraphConnectorInputEmbedAdapter),
    },
  ] as const)('lowers $type to same-id Graph IR and contributes its Definition', ({ type, id, lower: runLower }) => {
    const contribution = runLower();
    const provider = {
      graphFrame: GraphFrameProvider,
      graphNode: GraphNodeProvider,
      graphConnector: GraphConnectorProvider,
    }[type];

    expect(contribution.node).toMatchObject({
      namespace: 'graph',
      type,
      id: type === 'graphFrame' ? `${id}/graphFrame` : id,
    });
    expect(contribution.providerDependencies).toEqual({ roots: [provider.key], providers: [provider] });
    expect(provider.makeDefinition({})).toMatchObject({ namespace: 'graph', type });
  });
});
