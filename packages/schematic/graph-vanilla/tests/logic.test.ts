import type { InputEmbed, InputEmbedAdapter, InputEmbedContext } from '@retikz/vanilla';

import {
  BlockHeaderProviderKey,
  BlockProviderKey,
  BlockRowProviderKey,
  BlockSectionProviderKey,
  defineEntityRole,
  defineRelationRole,
  EntityProviderKey,
  GraphProviderKey,
  GroupProviderKey,
  RelationProviderKey,
} from '@retikz/graph';
import { normalizeScene, processToStaticInputResult } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import type { InputBlock, InputBlockHeader, InputBlockRow, InputBlockSection, InputGraph, InputGroup } from '../src';

import {
  block,
  blockHeader,
  BlockHeaderInputEmbedAdapter,
  BlockInputEmbedAdapter,
  blockRow,
  BlockRowInputEmbedAdapter,
  blockSection,
  BlockSectionInputEmbedAdapter,
  createGraphVanillaAdapters,
  entity,
  EntityInputEmbedAdapter,
  graph,
  GraphInputEmbedAdapter,
  group,
  GroupInputEmbedAdapter,
  normalizeBlock,
  normalizeBlockHeader,
  normalizeBlockRow,
  normalizeBlockSection,
  normalizeGraph,
  normalizeGroup,
  relation,
  RelationInputEmbedAdapter,
} from '../src';

const definitionOptionKeys = [
  'entityRoles',
  'entityKinds',
  'entityPredicates',
  'relationRoles',
  'relationKinds',
  'relationPredicates',
  'graphThemeStyles',
] as const;

const contextOf = (id: string, kind: string): InputEmbedContext => ({
  id,
  kind,
  layerId: 'layer',
  identityPath: ['layer', id],
});

const lower = <TProps>(spec: InputEmbed<TProps>, adapter: InputEmbedAdapter<TProps>) =>
  adapter.lower(spec.props, contextOf(spec.id, spec.kind));

describe('@retikz/graph-vanilla package boundary', () => {
  it('exports one adapter and builder for each Graph semantic composite', async () => {
    const graphVanilla = await import('../src');

    expect(graphVanilla.GraphInputEmbedAdapter).toBeDefined();
    expect(graphVanilla.BlockInputEmbedAdapter).toBeDefined();
    expect(graphVanilla.BlockHeaderInputEmbedAdapter).toBeDefined();
    expect(graphVanilla.BlockSectionInputEmbedAdapter).toBeDefined();
    expect(graphVanilla.BlockRowInputEmbedAdapter).toBeDefined();
    expect(graphVanilla.EntityInputEmbedAdapter).toBeDefined();
    expect(graphVanilla.GroupInputEmbedAdapter).toBeDefined();
    expect(graphVanilla.RelationInputEmbedAdapter).toBeDefined();
    expect(graphVanilla.graph).toBeTypeOf('function');
    expect(graphVanilla.block).toBeTypeOf('function');
    expect(graphVanilla.blockHeader).toBeTypeOf('function');
    expect(graphVanilla.blockSection).toBeTypeOf('function');
    expect(graphVanilla.blockRow).toBeTypeOf('function');
    expect(graphVanilla.entity).toBeTypeOf('function');
    expect(graphVanilla.group).toBeTypeOf('function');
    expect(graphVanilla.relation).toBeTypeOf('function');
    expect(graphVanilla.normalizeGraph).toBeTypeOf('function');
    expect(graphVanilla.normalizeBlock).toBeTypeOf('function');
    expect(graphVanilla.normalizeBlockHeader).toBeTypeOf('function');
    expect(graphVanilla.normalizeBlockSection).toBeTypeOf('function');
    expect(graphVanilla.normalizeBlockRow).toBeTypeOf('function');
    expect(graphVanilla.normalizeGroup).toBeTypeOf('function');
    expect(createGraphVanillaAdapters().map(adapter => adapter.kind)).toEqual([
      'graph.graph',
      'graph.group',
      'graph.block',
      'graph.blockHeader',
      'graph.blockSection',
      'graph.blockRow',
      'graph.entity',
      'graph.relation',
    ]);
  });
});

describe('normalizeBlock', () => {
  it('keeps string Header and Section text as sparse Source values', () => {
    expect(normalizeBlockHeader({ title: 'User', description: 'Domain entity' })).toEqual({
      namespace: 'graph',
      type: 'blockHeader',
      title: 'User',
      description: 'Domain entity',
    });
    expect(normalizeBlockSection({ title: 'Fields' })).toEqual({
      namespace: 'graph',
      type: 'blockSection',
      title: 'Fields',
    });
  });

  it('keeps Row text content as the minimal Source value', () => {
    expect(normalizeBlockRow({ content: 'name' })).toEqual({
      namespace: 'graph',
      type: 'blockRow',
      content: 'name',
    });
    expect(normalizeBlockRow({ content: ['name', 'string'] })).toEqual({
      namespace: 'graph',
      type: 'blockRow',
      content: ['name', 'string'],
    });
    expect(
      normalizeBlockRow({
        content: ['name', { text: 'string', textColor: '#64748b', font: { weight: 'bold' }, opacity: 0.6 }],
      }),
    ).toEqual({
      namespace: 'graph',
      type: 'blockRow',
      content: ['name', { text: 'string', textColor: '#64748b', font: { weight: 'bold' }, opacity: 0.6 }],
    });
  });

  it('normalizes open Block-family semantic children to the same sparse Source as Direct authoring', () => {
    const header = {
      type: 'blockHeader',
      title: { text: 'User' },
      direction: 'horizontal',
      itemGap: 6,
      justifyContent: 'space-between',
      icon: { type: 'entity', role: 'state', position: [0, 0] },
      trail: { type: 'entity', role: 'concept', position: [20, 0] },
    } satisfies InputBlockHeader & Readonly<{ type: 'blockHeader' }>;
    const row = {
      type: 'blockRow',
      id: 'name',
      children: [
        { type: 'node', position: [0, 0], text: 'name' },
        { type: 'entity', role: 'concept', position: [0, 0] },
      ],
    } satisfies InputBlockRow & Readonly<{ type: 'blockRow' }>;
    const section = {
      type: 'blockSection',
      id: 'fields',
      children: [row],
    } satisfies InputBlockSection & Readonly<{ type: 'blockSection' }>;
    const input: InputBlock = {
      id: 'user',
      width: 240,
      minWidth: 160,
      gap: 0,
      children: [header, section],
    };

    expect(normalizeBlock(input)).toEqual({
      namespace: 'graph',
      type: 'block',
      id: 'user',
      width: 240,
      minWidth: 160,
      gap: 0,
      children: [normalizeBlockHeader(header), normalizeBlockSection(section)],
    });
    expect(normalizeBlockHeader(header)).toMatchObject({
      direction: 'horizontal',
      itemGap: 6,
      justifyContent: 'space-between',
      trail: { namespace: 'graph', type: 'entity', role: 'concept', position: [20, 0] },
    });
    const normalizedRow = normalizeBlockRow(row);
    expect('children' in normalizedRow ? normalizedRow.children : undefined).toEqual([
      { type: 'node', position: [0, 0], text: 'name' },
      { namespace: 'graph', type: 'entity', role: 'concept', position: [0, 0] },
    ]);
  });

  it('preserves omitted and explicit empty Block-family children', () => {
    expect(normalizeBlock({})).toEqual({ namespace: 'graph', type: 'block' });
    expect(normalizeBlock({ children: [] })).toEqual({ namespace: 'graph', type: 'block', children: [] });
    expect(normalizeBlockSection({})).toEqual({ namespace: 'graph', type: 'blockSection' });
    expect(normalizeBlockRow({ children: [] })).toEqual({ namespace: 'graph', type: 'blockRow', children: [] });
    expect(normalizeBlockRow({ children: [{ type: 'node', position: [0, 0] }] })).toEqual({
      namespace: 'graph',
      type: 'blockRow',
      children: [{ type: 'node', position: [0, 0] }],
    });
  });
});

describe('normalizeGroup', () => {
  it('preserves Group presentation and normalizes collocated Entity / Relation Source', () => {
    const input: InputGroup = {
      id: 'runtime',
      caption: { title: { text: 'Runtime' } },
      labels: [{ text: 'internal', position: { boundary: 'left', fraction: 0.25 } }],
      children: [
        { type: 'entity', role: 'participant', position: [0, 0] },
        {
          type: 'relation',
          role: 'dependency',
          source: { id: 'a' },
          target: { id: 'b' },
        },
      ],
    };

    expect(normalizeGroup(input)).toEqual({
      namespace: 'graph',
      type: 'group',
      ...input,
      children: [
        { namespace: 'graph', type: 'entity', role: 'participant', position: [0, 0] },
        {
          namespace: 'graph',
          type: 'relation',
          role: 'dependency',
          source: { id: 'a' },
          target: { id: 'b' },
        },
      ],
    });
  });
});

describe('normalizeGraph', () => {
  it('omits absent children while preserving an explicit empty array', () => {
    expect(normalizeGraph({})).toEqual({ namespace: 'graph', type: 'graph' });
    expect(normalizeGraph({ children: [] })).toEqual({
      namespace: 'graph',
      type: 'graph',
      children: [],
    });
  });

  it('preserves the complete authored Scope surface directly on Graph', () => {
    const input: InputGraph = {
      id: 'architecture',
      theme: { mode: 'dark' as const },
      graphTheme: {
        rules: [
          {
            type: 'entity' as const,
            selector: { role: 'participant' },
            appearance: { fill: '#eef6ff' },
          },
        ],
      },
      localNamespace: true,
      transforms: [{ kind: 'translate' as const, x: 10, y: 20 }],
      placement: { target: [30, 40], selfAnchor: 'center' },
      fill: 'lightblue',
      opacity: 0.8,
      nodeDefault: { fill: 'white' },
      pathDefault: { stroke: 'green' },
      labelDefault: { font: { size: 10 } },
      arrowDefault: { shape: 'stealth', scale: 1.5 },
      resetStyle: ['path' as const],
      zIndex: 2,
      clip: { kind: 'rect' as const, x: 0, y: 0, width: 220, height: 120 },
      boundingShape: 'circle',
      animations: [],
      meta: { source: 'architecture-catalog' },
    };

    expect(normalizeGraph(input)).toEqual({
      namespace: 'graph',
      type: 'graph',
      ...input,
    });
  });

  it('normalizes only Entity, Relation and Way authoring sugar', () => {
    expect(
      normalizeGraph({
        children: [
          { type: 'entity', role: 'participant', text: '', dashed: true },
          {
            type: 'relation',
            source: { id: 'service' },
            target: { id: 'database' },
            role: 'dependency',
            kind: 'uml.dependency',
            dashPattern: [6, 2],
            labels: [{ text: 'reads', textColor: '#dc2626', font: { weight: 'bold' }, opacity: 0.5 }],
            way: ['service', { id: 'database' }],
          },
          { type: 'node', position: [0, 120], text: 'Legend' },
        ],
      }),
    ).toEqual({
      namespace: 'graph',
      type: 'graph',
      children: [
        {
          namespace: 'graph',
          type: 'entity',
          role: 'participant',
          text: '',
          dashed: true,
        },
        {
          namespace: 'graph',
          type: 'relation',
          source: { id: 'service' },
          target: { id: 'database' },
          role: 'dependency',
          kind: 'uml.dependency',
          dashPattern: [6, 2],
          labels: [{ text: 'reads', textColor: '#dc2626', font: { weight: 'bold' }, opacity: 0.5 }],
          route: [
            { type: 'step', kind: 'move', to: { id: 'service' } },
            { type: 'step', kind: 'line', to: { id: 'database' } },
          ],
        },
        { type: 'node', position: [0, 120], text: 'Legend' },
      ],
    });
  });
});

describe('Graph Vanilla embed adapters', () => {
  it('keeps embed identity separate from optional authored identity for every composite', () => {
    const graphContribution = lower(graph('graph-embed', {}), GraphInputEmbedAdapter);
    const entityContribution = lower(
      entity('entity-embed', { type: 'entity', role: 'participant', position: [0, 0] }),
      EntityInputEmbedAdapter,
    );
    const relationContribution = lower(
      relation('relation-embed', {
        type: 'relation',
        source: { id: 'source' },
        target: { id: 'target' },
        role: 'association',
      }),
      RelationInputEmbedAdapter,
    );
    const groupContribution = lower(group('group-embed', {}), GroupInputEmbedAdapter);
    const blockContribution = lower(block('block-embed', {}), BlockInputEmbedAdapter);
    const headerContribution = lower(
      blockHeader('header-embed', { title: { text: 'Block' } }),
      BlockHeaderInputEmbedAdapter,
    );
    const sectionContribution = lower(blockSection('section-embed', {}), BlockSectionInputEmbedAdapter);
    const rowContribution = lower(blockRow('row-embed', {}), BlockRowInputEmbedAdapter);

    expect(graphContribution.node).toEqual({ namespace: 'graph', type: 'graph' });
    expect(entityContribution.node).toEqual({
      namespace: 'graph',
      type: 'entity',
      role: 'participant',
      position: [0, 0],
    });
    expect(relationContribution.node).toEqual({
      namespace: 'graph',
      type: 'relation',
      source: { id: 'source' },
      target: { id: 'target' },
      role: 'association',
    });
    expect(groupContribution.node).toEqual({ namespace: 'graph', type: 'group' });
    expect(blockContribution.node).toEqual({ namespace: 'graph', type: 'block' });
    expect(headerContribution.node).toEqual({
      namespace: 'graph',
      type: 'blockHeader',
      title: { text: 'Block' },
    });
    expect(sectionContribution.node).toEqual({ namespace: 'graph', type: 'blockSection' });
    expect(rowContribution.node).toEqual({ namespace: 'graph', type: 'blockRow' });
    expect(graphContribution.node).not.toHaveProperty('id');
    expect(entityContribution.node).not.toHaveProperty('id');
    expect(relationContribution.node).not.toHaveProperty('id');
    expect(groupContribution.node).not.toHaveProperty('id');
    expect(blockContribution.node).not.toHaveProperty('id');
    expect(headerContribution.node).not.toHaveProperty('id');
    expect(sectionContribution.node).not.toHaveProperty('id');
    expect(rowContribution.node).not.toHaveProperty('id');
  });

  it('normalizes Relation Way while preserving complete Core NodeTargets', () => {
    const contribution = lower(
      relation('relation-embed', {
        type: 'relation',
        source: {
          id: 'source',
          anchor: { side: 'right', fraction: 0.5 },
          offset: [2, -1],
          boundary: 'shape',
        },
        target: { id: 'target', anchor: 'west' },
        role: 'dependency',
        way: ['source', { id: 'target' }],
      }),
      RelationInputEmbedAdapter,
    );

    expect(contribution.node).toEqual({
      namespace: 'graph',
      type: 'relation',
      source: {
        id: 'source',
        anchor: { side: 'right', fraction: 0.5 },
        offset: [2, -1],
        boundary: 'shape',
      },
      target: { id: 'target', anchor: 'west' },
      role: 'dependency',
      route: [
        { type: 'step', kind: 'move', to: { id: 'source' } },
        { type: 'step', kind: 'line', to: { id: 'target' } },
      ],
    });
  });

  it('normalizes arbitrary nested embeds without adding a panel Scope', () => {
    const normalized = normalizeScene(
      {
        children: [
          graph('outer-embed', {
            transforms: [{ kind: 'translate', x: 12, y: 8 }],
            children: [
              { type: 'node', id: 'source', position: [0, 0] },
              {
                type: 'scope',
                children: [
                  entity('entity-embed', {
                    type: 'entity',
                    role: 'participant',
                    position: [80, 0],
                  }),
                ],
              },
              graph('inner-embed', {
                children: [{ type: 'node', id: 'target', position: [160, 0] }],
              }),
            ],
          }),
        ],
      },
      { adapters: createGraphVanillaAdapters() },
    );

    expect(normalized.ir.children).toEqual([
      {
        namespace: 'graph',
        type: 'graph',
        transforms: [{ kind: 'translate', x: 12, y: 8 }],
        children: [
          { type: 'node', id: 'source', position: [0, 0] },
          {
            type: 'scope',
            children: [
              {
                namespace: 'graph',
                type: 'entity',
                role: 'participant',
                position: [80, 0],
              },
            ],
          },
          {
            namespace: 'graph',
            type: 'graph',
            children: [{ type: 'node', id: 'target', position: [160, 0] }],
          },
        ],
      },
    ]);
  });

  it('normalizes nested independent structure embeds while merging provider contributions', () => {
    const normalized = normalizeScene(
      {
        children: [
          block('block-embed', {
            children: [
              blockHeader('header-embed', {
                icon: entity('icon-embed', { type: 'entity', role: 'state', position: [0, 0] }),
                title: { text: 'Block' },
              }),
              blockSection('section-embed', {
                children: [
                  blockRow('row-embed', {
                    children: [
                      group('group-embed', {
                        children: [{ type: 'node', position: [0, 0], text: 'Nested' }],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
      { adapters: createGraphVanillaAdapters() },
    );

    expect(normalized.ir.children[0]).toMatchObject({
      namespace: 'graph',
      type: 'block',
      children: [
        { namespace: 'graph', type: 'blockHeader', icon: { namespace: 'graph', type: 'entity' } },
        {
          namespace: 'graph',
          type: 'blockSection',
          children: [
            {
              namespace: 'graph',
              type: 'blockRow',
              children: [{ namespace: 'graph', type: 'group' }],
            },
          ],
        },
      ],
    });
    expect(normalized.contributions.flatMap(contribution => contribution.roots)).toEqual(
      expect.arrayContaining([
        BlockProviderKey,
        BlockHeaderProviderKey,
        BlockSectionProviderKey,
        BlockRowProviderKey,
        EntityProviderKey,
        GroupProviderKey,
      ]),
    );
  });

  it('compiles a collocated Block declared directly inside a standalone Group', () => {
    expect(() =>
      processToStaticInputResult(
        {
          children: [
            group('group-embed', {
              children: [
                {
                  type: 'block',
                  children: [{ type: 'blockHeader', title: { text: 'Nested Block' } }],
                },
              ],
            }),
          ],
        },
        { adapters: createGraphVanillaAdapters(), compile: { padding: 0 } },
      ),
    ).not.toThrow();
  });

  it('contributes the provider closure rooted at the matching semantic composite', () => {
    const graphContribution = lower(graph('graph-embed', {}), GraphInputEmbedAdapter);
    const entityContribution = lower(
      entity('entity-embed', { type: 'entity', role: 'participant', position: [0, 0] }),
      EntityInputEmbedAdapter,
    );
    const relationContribution = lower(
      relation('relation-embed', {
        type: 'relation',
        source: { id: 'source' },
        target: { id: 'target' },
        role: 'association',
      }),
      RelationInputEmbedAdapter,
    );
    const groupContribution = lower(group('group-embed', {}), GroupInputEmbedAdapter);
    const blockContribution = lower(block('block-embed', {}), BlockInputEmbedAdapter);
    const headerContribution = lower(
      blockHeader('header-embed', { title: { text: 'Block' } }),
      BlockHeaderInputEmbedAdapter,
    );
    const sectionContribution = lower(blockSection('section-embed', {}), BlockSectionInputEmbedAdapter);
    const rowContribution = lower(blockRow('row-embed', {}), BlockRowInputEmbedAdapter);

    expect(graphContribution.providerDependencies.roots).toEqual([GraphProviderKey]);
    expect(entityContribution.providerDependencies.roots).toEqual([EntityProviderKey]);
    expect(relationContribution.providerDependencies.roots).toEqual([RelationProviderKey]);
    expect(groupContribution.providerDependencies.roots).toEqual([GroupProviderKey]);
    expect(blockContribution.providerDependencies.roots).toEqual([BlockProviderKey]);
    expect(headerContribution.providerDependencies.roots).toEqual([BlockHeaderProviderKey]);
    expect(sectionContribution.providerDependencies.roots).toEqual([BlockSectionProviderKey]);
    expect(rowContribution.providerDependencies.roots).toEqual([BlockRowProviderKey]);
    expect(graphContribution.providerDependencies.providers.map(provider => provider.key)).toEqual(
      expect.arrayContaining([
        GraphProviderKey,
        GroupProviderKey,
        BlockProviderKey,
        EntityProviderKey,
        RelationProviderKey,
      ]),
    );
    expect(groupContribution.providerDependencies.providers.map(provider => provider.key)).toEqual(
      expect.arrayContaining([GroupProviderKey, BlockProviderKey, EntityProviderKey, RelationProviderKey]),
    );
    expect(blockContribution.providerDependencies.providers.map(provider => provider.key)).toEqual(
      expect.arrayContaining([
        BlockProviderKey,
        BlockHeaderProviderKey,
        BlockSectionProviderKey,
        BlockRowProviderKey,
        EntityProviderKey,
        RelationProviderKey,
      ]),
    );
    expect(entityContribution.providerDependencies.providers.map(provider => provider.key)).toHaveLength(3);
    expect(relationContribution.providerDependencies.providers.map(provider => provider.key)).toHaveLength(5);
  });

  it('keeps all definition options out of Source IR and compiles custom definitions through every entry', () => {
    const entityRole = defineEntityRole({
      role: 'custom-entity',
      description: 'Custom Entity role',
      shape: 'rectangle',
      padding: 4,
    });
    const relationRole = defineRelationRole({
      role: 'custom-relation',
      description: 'Custom Relation role',
      defaultDirection: 'none',
      allowedDirections: ['none'],
      directions: { none: { sourceMarker: false, targetMarker: false, dashPattern: false } },
    });
    const options = {
      entityRoles: [entityRole],
      entityKinds: [],
      entityPredicates: [],
      relationRoles: [relationRole],
      relationKinds: [],
      relationPredicates: [],
      graphThemeStyles: [],
    } as const;
    const graphContribution = lower(
      graph('graph-embed', {
        ...options,
        children: [
          { type: 'entity', id: 'graph-source', role: 'custom-entity', position: [0, 0] },
          { type: 'entity', id: 'graph-target', role: 'custom-entity', position: [100, 0] },
          {
            type: 'relation',
            source: { id: 'graph-source' },
            target: { id: 'graph-target' },
            role: 'custom-relation',
          },
        ],
      }),
      GraphInputEmbedAdapter,
    );
    const entityContribution = lower(
      entity('entity-embed', {
        ...options,
        type: 'entity',
        role: 'custom-entity',
        position: [0, 100],
      }),
      EntityInputEmbedAdapter,
    );
    const relationContribution = lower(
      relation('relation-embed', {
        ...options,
        type: 'relation',
        source: { id: 'direct-source' },
        target: { id: 'direct-target' },
        role: 'custom-relation',
      }),
      RelationInputEmbedAdapter,
    );

    for (const contribution of [graphContribution, entityContribution, relationContribution]) {
      for (const key of definitionOptionKeys) expect(contribution.node).not.toHaveProperty(key);
    }

    expect(() =>
      processToStaticInputResult(
        {
          children: [
            { type: 'node', id: 'direct-source', position: [0, 200] },
            { type: 'node', id: 'direct-target', position: [100, 200] },
            graph('compiled-graph', {
              ...options,
              children: [
                { type: 'entity', id: 'compiled-source', role: 'custom-entity', position: [0, 0] },
                { type: 'entity', id: 'compiled-target', role: 'custom-entity', position: [100, 0] },
                {
                  type: 'relation',
                  source: { id: 'compiled-source' },
                  target: { id: 'compiled-target' },
                  role: 'custom-relation',
                },
              ],
            }),
            entity('compiled-entity', {
              ...options,
              type: 'entity',
              role: 'custom-entity',
              position: [0, 100],
            }),
            relation('compiled-relation', {
              ...options,
              type: 'relation',
              source: { id: 'direct-source' },
              target: { id: 'direct-target' },
              role: 'custom-relation',
            }),
          ],
        },
        { adapters: createGraphVanillaAdapters(), compile: { padding: 0 } },
      ),
    ).not.toThrow();
  });
});
