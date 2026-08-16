import { GraphConnectorProvider, GraphFrameProvider, GraphNodeProvider } from '@retikz/graph';
import { createInputScene, Node, Step, Text } from '@retikz/react';
import { normalizeScene } from '@retikz/vanilla';
import { createElement, Fragment } from 'react';
import { describe, expect, it } from 'vitest';

import {
  createGraphReactAdapters,
  GraphConnector,
  GraphFrame,
  GraphFrameHeader,
  GraphFrameSection,
  GraphNode,
} from '../../src';

/** 经 React JSX 到 Vanilla Input 的唯一 authoring 链路归一化 */
const normalizeReactInput = (children: Parameters<typeof createInputScene>[0]) => {
  const input = createInputScene(children);
  return normalizeScene(input.scene, { adapters: input.adapters });
};

describe('@retikz/graph-react package boundary', () => {
  it('exports only the unified Graph semantic components', async () => {
    const graphReact = await import('../../src');

    expect(graphReact.GraphNode).toBeDefined();
    expect(graphReact.GraphConnector).toBeDefined();
    expect(graphReact.GraphFrame).toBeDefined();
    expect(graphReact).not.toHaveProperty('Stage');
    expect(graphReact).not.toHaveProperty('Terminal');
    expect(graphReact).not.toHaveProperty('Decision');
    expect(graphReact).not.toHaveProperty('Junction');
  });
});

describe('Graph React semantic authoring', () => {
  it('creates exactly three adapters and preserves GraphNode role and variant', () => {
    const adapters = createGraphReactAdapters();
    const nodeAdapter = adapters.find(adapter => adapter.kind === 'graph.graphNode');

    expect(adapters.map(adapter => adapter.kind)).toEqual([
      'graph.graphFrame',
      'graph.graphNode',
      'graph.graphConnector',
    ]);
    expect(nodeAdapter).toBeDefined();
    const contribution = nodeAdapter!.lower(
      { role: 'stage', position: [0, 0], color: '#123456', variant: 'vibrant' },
      {
        id: 'vibrant',
        kind: nodeAdapter!.kind,
        layerId: 'layer',
        identityPath: ['layer', 'brand'],
      },
    );

    expect(contribution.node).toMatchObject({ role: 'stage', color: '#123456', variant: 'vibrant' });
    expect(contribution.providerDependencies.roots[0]).toEqual(GraphNodeProvider.key);
  });

  it('preserves a GraphFrame identity and inherited variant in semantic IR', () => {
    const result = normalizeReactInput(
      createElement(
        GraphFrame,
        { id: 'variant-frame', graphNodeVariant: 'secondary' },
        createElement(GraphFrameSection, {
          sectionKey: 'body',
          children: createElement(GraphNode, { id: 'variant-node', role: 'stage', position: [0, 0] }),
        }),
      ),
    );

    expect(result.ir.children[0]).toMatchObject({
      namespace: 'graph',
      type: 'graphFrame',
      id: 'variant-frame',
      graphNodeVariant: 'secondary',
      sections: [
        {
          child: { namespace: 'graph', type: 'graphNode', id: 'variant-node', role: 'stage' },
        },
      ],
    });
  });

  it('keeps GraphNode text authoring equivalent to Core Node text authoring', () => {
    const node = normalizeReactInput(
      createElement(GraphNode, { id: 'stage', role: 'stage', position: [0, 0] }, 'Process'),
    );
    const terminal = normalizeReactInput(
      createElement(
        GraphNode,
        { id: 'terminal', role: 'terminal', position: [0, 0] },
        createElement(Text, null, 'Start'),
      ),
    );

    expect(node.ir.children[0]).toMatchObject({
      namespace: 'graph',
      type: 'graphNode',
      role: 'stage',
      id: 'stage',
      text: 'Process',
    });
    expect(terminal.ir.children[0]).toMatchObject({
      namespace: 'graph',
      type: 'graphNode',
      role: 'terminal',
      id: 'terminal',
      text: 'Start',
    });
    expect(node.contributions[0]).toEqual({ roots: [GraphNodeProvider.key], providers: [GraphNodeProvider] });
  });

  it('contributes one provider per unified semantic component', () => {
    const result = normalizeReactInput(
      createElement(
        Fragment,
        null,
        createElement(GraphNode, { id: 'decision', role: 'decision', position: [0, 0] }),
        createElement(GraphNode, { id: 'junction', role: 'junction', position: [20, 0] }),
      ),
    );

    expect(result.ir.children).toMatchObject([
      { namespace: 'graph', type: 'graphNode', role: 'decision', id: 'decision' },
      { namespace: 'graph', type: 'graphNode', role: 'junction', id: 'junction' },
    ]);
    expect(result.contributions.map(contribution => contribution.roots[0])).toEqual([
      GraphNodeProvider.key,
      GraphNodeProvider.key,
    ]);
  });
});

describe('Graph React GraphConnector authoring', () => {
  it('normalizes Core Step children to canonical GraphConnector IR', () => {
    const result = normalizeReactInput(
      createElement(
        GraphConnector,
        { id: 'graphConnector', role: 'flow' },
        createElement(Step, { kind: 'move', to: 'source' }),
        createElement(Step, { kind: 'fold', via: '-|-', to: 'target' }),
      ),
    );

    expect(result.ir.children[0]).toMatchObject({
      namespace: 'graph',
      type: 'graphConnector',
      id: 'graphConnector',
      role: 'flow',
      children: [
        { type: 'step', kind: 'move', to: { id: 'source' } },
        { type: 'step', kind: 'fold', via: '-|-', to: { id: 'target' } },
      ],
    });
    expect(result.contributions[0]).toEqual({
      roots: [GraphConnectorProvider.key],
      providers: [GraphConnectorProvider],
    });
  });

  it('supports Draw way input and rejects mixing it with Step children', () => {
    const result = normalizeReactInput(
      createElement(GraphConnector, { id: 'draw', role: 'flow', way: ['source', 'target'] }),
    );

    expect(result.ir.children[0]).toMatchObject({
      namespace: 'graph',
      type: 'graphConnector',
      role: 'flow',
      children: [
        { type: 'step', kind: 'move', to: { id: 'source' } },
        { type: 'step', kind: 'line', to: { id: 'target' } },
      ],
    });
    expect(() =>
      normalizeReactInput(
        createElement(
          GraphConnector,
          { id: 'mixed', role: 'flow', way: ['source', 'target'] },
          createElement(Step, { kind: 'move', to: 'source' }),
          createElement(Step, { to: 'target' }),
        ),
      ),
    ).toThrow(/children|way/i);
  });

  it('keeps GraphFrame and GraphConnector provider roots on their unified definitions', () => {
    const frame = normalizeReactInput(
      createElement(
        GraphFrame,
        { id: 'frame' },
        createElement(GraphFrameHeader, null, createElement(Node, { position: [0, 0], text: 'Header' })),
      ),
    );
    const connector = normalizeReactInput(
      createElement(GraphConnector, { id: 'connector', role: 'dependency', way: ['a', 'b'] }),
    );

    expect(frame.contributions[0]?.roots[0]).toEqual(GraphFrameProvider.key);
    expect(connector.contributions[0]?.roots[0]).toEqual(GraphConnectorProvider.key);
  });
});
