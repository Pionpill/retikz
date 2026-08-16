import type { InputChild, InputEmbed, InputEmbedAdapter, InputEmbedContext } from '@retikz/vanilla';

import { ContainerProvider, EntityProvider,RelationProvider } from '@retikz/graph';
import { normalizeScene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import {
  container,
  ContainerInputEmbedAdapter,
  createGraphVanillaAdapters,
  entity,
  EntityInputEmbedAdapter,
  relation,
  RelationInputEmbedAdapter,
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

    expect(graphVanilla.ContainerInputEmbedAdapter).toBeDefined();
    expect(graphVanilla.EntityInputEmbedAdapter).toBeDefined();
    expect(graphVanilla.RelationInputEmbedAdapter).toBeDefined();
    expect(graphVanilla).not.toHaveProperty('stage');
    expect(graphVanilla).not.toHaveProperty('TerminalInputEmbedAdapter');
    expect(graphVanilla).not.toHaveProperty('DecisionInputEmbedAdapter');
  });
});

describe('Graph Vanilla semantic authoring', () => {
  it('creates three adapters and preserves Entity role and variant', () => {
    const adapters = createGraphVanillaAdapters();
    const nodeAdapter = adapters.find(adapter => adapter.kind === 'graph.entity');
    expect(adapters.map(adapter => adapter.kind)).toEqual(['graph.container', 'graph.entity', 'graph.relation']);
    expect(nodeAdapter).toBeDefined();

    const contribution = lower(
      entity('vibrant', { role: 'stage', position: [0, 0], color: '#123456', variant: 'vibrant' }),
      nodeAdapter!,
    );
    expect(contribution.node).toMatchObject({
      namespace: 'graph',
      type: 'entity',
      role: 'stage',
      color: '#123456',
      variant: 'vibrant',
    });
    expect(contribution.providerDependencies.roots[0]).toEqual(EntityProvider.key);
  });

  it('returns embeds for Container, Entity, and Relation', () => {
    expect(container('frame', { header: { child: { type: 'node', position: [0, 0] } } })).toMatchObject({
      type: 'embed',
      id: 'frame',
      kind: 'graph.container',
    });
    expect(entity('stage', { role: 'stage', position: [20, 0] })).toMatchObject({
      type: 'embed',
      id: 'stage',
      kind: 'graph.entity',
    });
    expect(relation('flow', { role: 'flow', way: ['start', 'stage'] })).toMatchObject({
      type: 'embed',
      id: 'flow',
      kind: 'graph.relation',
    });
  });

  it.each([
    {
      type: 'container',
      id: 'frame',
      lower: () =>
        lower(
          container('frame', { header: { child: { type: 'node', position: [0, 0] } } }),
          ContainerInputEmbedAdapter,
        ),
    },
    {
      type: 'entity',
      id: 'node',
      lower: () => lower(entity('node', { role: 'decision', position: [20, 0] }), EntityInputEmbedAdapter),
    },
    {
      type: 'relation',
      id: 'connector',
      lower: () => lower(relation('connector', { role: 'flow', way: ['node', 'target'] }), RelationInputEmbedAdapter),
    },
  ] as const)('lowers $type to same-id Graph IR and contributes its Definition', ({ type, id, lower: runLower }) => {
    const contribution = runLower();
    const provider = {
      container: ContainerProvider,
      entity: EntityProvider,
      relation: RelationProvider,
    }[type];

    expect(contribution.node).toMatchObject({
      namespace: 'graph',
      type,
      id: type === 'container' ? `${id}/container` : id,
    });
    expect(contribution.providerDependencies).toEqual({ roots: [provider.key], providers: [provider] });
    expect(provider.makeDefinition({})).toMatchObject({ namespace: 'graph', type });
  });
});
