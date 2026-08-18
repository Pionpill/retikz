import type { InputChild, InputEmbed, InputEmbedAdapter, InputEmbedContext } from '@retikz/vanilla';

import {
  ContainerProvider,
  defineEntityRole,
  EntityProvider,
  GraphProvider,
  GraphProviderKey,
  GraphThemeToken,
  RelationProvider,
} from '@retikz/graph';
import { normalizeScene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import {
  container,
  ContainerInputEmbedAdapter,
  createGraphVanillaAdapters,
  entity,
  EntityInputEmbedAdapter,
  graph,
  GraphInputEmbedAdapter,
  relation,
  RelationInputEmbedAdapter,
  RetikzGraphVanillaError,
  RetikzGraphVanillaErrorCode,
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
  it('exports exactly the unified four Graph adapters', async () => {
    const graphVanilla = await import('../src');

    expect(graphVanilla.ContainerInputEmbedAdapter).toBeDefined();
    expect(graphVanilla.EntityInputEmbedAdapter).toBeDefined();
    expect(graphVanilla.GraphInputEmbedAdapter).toBeDefined();
    expect(graphVanilla.graph).toBeTypeOf('function');
    expect(graphVanilla.createGraphVanillaAdapters).toBeTypeOf('function');
    expect(graphVanilla.RelationInputEmbedAdapter).toBeDefined();
    expect(graphVanilla).not.toHaveProperty('stage');
    expect(graphVanilla).not.toHaveProperty('TerminalInputEmbedAdapter');
    expect(graphVanilla).not.toHaveProperty('DecisionInputEmbedAdapter');
  });
});

describe('Graph Vanilla semantic authoring', () => {
  it('uses one package-level structured error when normalizeScene context is missing', () => {
    expect(() =>
      GraphInputEmbedAdapter.lower(
        { children: [] },
        { ...contextOf('graph', 'graph.graph'), normalizeChildren: undefined },
      ),
    ).toThrowError(
      expect.objectContaining({
        name: 'RetikzGraphVanillaError',
        code: RetikzGraphVanillaErrorCode.NormalizeSceneRequired,
      }),
    );
    expect(RetikzGraphVanillaError).toBeDefined();
  });

  it('creates four adapters and preserves Entity role and variant', () => {
    const adapters = createGraphVanillaAdapters();
    const nodeAdapter = adapters.find(adapter => adapter.kind === 'graph.entity');
    expect(adapters.map(adapter => adapter.kind)).toEqual([
      'graph.graph',
      'graph.container',
      'graph.entity',
      'graph.relation',
    ]);
    expect(nodeAdapter).toBeDefined();

    const contribution = lower(
      entity('mixed', { role: 'stage', position: [0, 0], color: '#123456', variant: 'mixed' }),
      nodeAdapter!,
    );
    expect(contribution.node).toMatchObject({
      namespace: 'graph',
      type: 'entity',
      role: 'stage',
      color: '#123456',
      variant: 'mixed',
    });
    expect(contribution.providerDependencies.roots[0]).toEqual(EntityProvider.key);
  });

  it('normalizes a multi-child Graph embed with presentation tokens and configured providers', () => {
    const service = defineEntityRole({ role: 'service', shape: 'rectangle', padding: 6 });
    const adapters = createGraphVanillaAdapters();
    const result = normalizeScene(
      {
        children: [
          graph('workflow', {
            entityRoles: [service],
            entityVariant: 'default',
            graphThemeTokens: { [GraphThemeToken.EntityColor]: '#336699' },
            graphThemeTokenRules: [
              {
                select: { role: 'service' },
                tokens: { [GraphThemeToken.EntityStrokeWidth]: 2 },
              },
            ],
            children: [
              entity('service', { role: 'service', position: [0, 0] }),
              entity('stage', { role: 'stage', position: [40, 0] }),
            ],
          }),
        ],
      },
      { adapters },
    );

    expect(result.ir.children[0]).toMatchObject({
      namespace: 'graph',
      type: 'graph',
      id: 'workflow',
      entityVariant: 'default',
      graphThemeTokens: { [GraphThemeToken.EntityColor]: '#336699' },
      graphThemeTokenRules: [
        {
          select: { role: 'service' },
          tokens: { [GraphThemeToken.EntityStrokeWidth]: 2 },
        },
      ],
      children: [
        { namespace: 'graph', type: 'entity', id: 'service', role: 'service' },
        { namespace: 'graph', type: 'entity', id: 'stage', role: 'stage' },
      ],
    });
    expect(result.contributions[0]?.roots[0]).toEqual(GraphProviderKey);
    expect(result.contributions[0]?.providers).not.toContain(GraphProvider);
    expect(result.contributions[0]?.providers).not.toContain(EntityProvider);
    expect(result.contributions[0]?.providers).toContain(RelationProvider);
  });

  it('reads custom role definitions directly from the Graph authoring input', () => {
    const service = defineEntityRole({ role: 'service', shape: 'rectangle', padding: 6 });
    const result = normalizeScene(
      {
        children: [
          graph('service-map', {
            entityRoles: [service],
            children: [entity('service', { role: 'service', position: [0, 0] })],
          }),
        ],
      },
      { adapters: createGraphVanillaAdapters() },
    );

    expect(result.ir.children[0]).toMatchObject({
      namespace: 'graph',
      type: 'graph',
      id: 'service-map',
      children: [{ namespace: 'graph', type: 'entity', role: 'service' }],
    });
    expect(JSON.stringify(result.ir)).not.toContain('serviceRole');
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
    expect(graph('workflow', { children: [] })).toMatchObject({
      type: 'embed',
      id: 'workflow',
      kind: 'graph.graph',
    });
  });

  it.each([
    {
      type: 'graph',
      id: 'workflow',
      lower: () => lower(graph('workflow', { children: [] }), GraphInputEmbedAdapter),
    },
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
      graph: GraphProvider,
      container: ContainerProvider,
      entity: EntityProvider,
      relation: RelationProvider,
    }[type];

    expect(contribution.node).toMatchObject({
      namespace: 'graph',
      type,
      id: type === 'container' ? `${id}/container` : id,
    });
    expect(contribution.providerDependencies.roots).toEqual([provider.key]);
    expect(contribution.providerDependencies.providers).toContain(provider);
    expect(provider.makeDefinition({})).toMatchObject({ namespace: 'graph', type });
  });
});
