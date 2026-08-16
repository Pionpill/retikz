import { ContainerProvider, EntityProvider,RelationProvider } from '@retikz/graph';
import { createInputScene, Node, Step, Text } from '@retikz/react';
import { normalizeScene } from '@retikz/vanilla';
import { createElement, Fragment } from 'react';
import { describe, expect, it } from 'vitest';

import { Container, ContainerHeader, ContainerSection, createGraphReactAdapters, Entity,Relation } from '../../src';

/** 经 React JSX 到 Vanilla Input 的唯一 authoring 链路归一化 */
const normalizeReactInput = (children: Parameters<typeof createInputScene>[0]) => {
  const input = createInputScene(children);
  return normalizeScene(input.scene, { adapters: input.adapters });
};

describe('@retikz/graph-react package boundary', () => {
  it('exports only the unified Graph semantic components', async () => {
    const graphReact = await import('../../src');

    expect(graphReact.Entity).toBeDefined();
    expect(graphReact.Relation).toBeDefined();
    expect(graphReact.Container).toBeDefined();
    expect(graphReact).not.toHaveProperty('Stage');
    expect(graphReact).not.toHaveProperty('Terminal');
    expect(graphReact).not.toHaveProperty('Decision');
    expect(graphReact).not.toHaveProperty('Junction');
  });
});

describe('Graph React semantic authoring', () => {
  it('creates exactly three adapters and preserves Entity role and variant', () => {
    const adapters = createGraphReactAdapters();
    const nodeAdapter = adapters.find(adapter => adapter.kind === 'graph.entity');

    expect(adapters.map(adapter => adapter.kind)).toEqual(['graph.container', 'graph.entity', 'graph.relation']);
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
    expect(contribution.providerDependencies.roots[0]).toEqual(EntityProvider.key);
  });

  it('preserves a Container identity and inherited variant in semantic IR', () => {
    const result = normalizeReactInput(
      createElement(
        Container,
        { id: 'variant-frame', entityVariant: 'secondary' },
        createElement(ContainerSection, {
          sectionKey: 'body',
          children: createElement(Entity, { id: 'variant-node', role: 'stage', position: [0, 0] }),
        }),
      ),
    );

    expect(result.ir.children[0]).toMatchObject({
      namespace: 'graph',
      type: 'container',
      id: 'variant-frame',
      entityVariant: 'secondary',
      sections: [
        {
          child: { namespace: 'graph', type: 'entity', id: 'variant-node', role: 'stage' },
        },
      ],
    });
  });

  it('keeps Entity text authoring equivalent to Core Node text authoring', () => {
    const node = normalizeReactInput(
      createElement(Entity, { id: 'stage', role: 'stage', position: [0, 0] }, 'Process'),
    );
    const terminal = normalizeReactInput(
      createElement(Entity, { id: 'terminal', role: 'terminal', position: [0, 0] }, createElement(Text, null, 'Start')),
    );

    expect(node.ir.children[0]).toMatchObject({
      namespace: 'graph',
      type: 'entity',
      role: 'stage',
      id: 'stage',
      text: 'Process',
    });
    expect(terminal.ir.children[0]).toMatchObject({
      namespace: 'graph',
      type: 'entity',
      role: 'terminal',
      id: 'terminal',
      text: 'Start',
    });
    expect(node.contributions[0]).toEqual({ roots: [EntityProvider.key], providers: [EntityProvider] });
  });

  it('contributes one provider per unified semantic component', () => {
    const result = normalizeReactInput(
      createElement(
        Fragment,
        null,
        createElement(Entity, { id: 'decision', role: 'decision', position: [0, 0] }),
        createElement(Entity, { id: 'junction', role: 'junction', position: [20, 0] }),
      ),
    );

    expect(result.ir.children).toMatchObject([
      { namespace: 'graph', type: 'entity', role: 'decision', id: 'decision' },
      { namespace: 'graph', type: 'entity', role: 'junction', id: 'junction' },
    ]);
    expect(result.contributions.map(contribution => contribution.roots[0])).toEqual([
      EntityProvider.key,
      EntityProvider.key,
    ]);
  });
});

describe('Graph React Relation authoring', () => {
  it('normalizes Core Step children to canonical Relation IR', () => {
    const result = normalizeReactInput(
      createElement(
        Relation,
        { id: 'relation', role: 'flow' },
        createElement(Step, { kind: 'move', to: 'source' }),
        createElement(Step, { kind: 'fold', via: '-|-', to: 'target' }),
      ),
    );

    expect(result.ir.children[0]).toMatchObject({
      namespace: 'graph',
      type: 'relation',
      id: 'relation',
      role: 'flow',
      children: [
        { type: 'step', kind: 'move', to: { id: 'source' } },
        { type: 'step', kind: 'fold', via: '-|-', to: { id: 'target' } },
      ],
    });
    expect(result.contributions[0]).toEqual({
      roots: [RelationProvider.key],
      providers: [RelationProvider],
    });
  });

  it('supports Draw way input and rejects mixing it with Step children', () => {
    const result = normalizeReactInput(
      createElement(Relation, { id: 'draw', role: 'flow', way: ['source', 'target'] }),
    );

    expect(result.ir.children[0]).toMatchObject({
      namespace: 'graph',
      type: 'relation',
      role: 'flow',
      children: [
        { type: 'step', kind: 'move', to: { id: 'source' } },
        { type: 'step', kind: 'line', to: { id: 'target' } },
      ],
    });
    expect(() =>
      normalizeReactInput(
        createElement(
          Relation,
          { id: 'mixed', role: 'flow', way: ['source', 'target'] },
          createElement(Step, { kind: 'move', to: 'source' }),
          createElement(Step, { to: 'target' }),
        ),
      ),
    ).toThrow(/children|way/i);
  });

  it('keeps Container and Relation provider roots on their unified definitions', () => {
    const frame = normalizeReactInput(
      createElement(
        Container,
        { id: 'frame' },
        createElement(ContainerHeader, null, createElement(Node, { position: [0, 0], text: 'Header' })),
      ),
    );
    const connector = normalizeReactInput(
      createElement(Relation, { id: 'connector', role: 'dependency', way: ['a', 'b'] }),
    );

    expect(frame.contributions[0]?.roots[0]).toEqual(ContainerProvider.key);
    expect(connector.contributions[0]?.roots[0]).toEqual(RelationProvider.key);
  });
});
