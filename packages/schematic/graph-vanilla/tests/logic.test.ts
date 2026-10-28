import {
  blockHeaderProviderKey,
  blockProviderKey,
  blockRowProviderKey,
  blockSectionProviderKey,
  defineEntityRole,
  defineRelationRole,
  entityProviderKey,
  GraphProviderKey,
  GraphSchema,
  groupProviderKey,
  relationProviderKey,
} from '@retikz/graph';
import type { InputEmbed, SynchronousInputEmbedAdapter, InputEmbedContext } from '@retikz/vanilla';
import { normalizeScene, processToStaticInputResult } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import type { InputBlock, InputBlockHeader, InputBlockRow, InputBlockSection, InputGraph, InputGroup } from '../src';
import {
  block,
  blockHeader,
  blockHeaderInputEmbedAdapter,
  blockInputEmbedAdapter,
  blockRow,
  blockRowInputEmbedAdapter,
  blockSection,
  blockSectionInputEmbedAdapter,
  createGraphVanillaAdapters,
  entity,
  entityInputEmbedAdapter,
  graph,
  graphInputEmbedAdapter,
  group,
  groupInputEmbedAdapter,
  normalizeBlock,
  normalizeBlockHeader,
  normalizeBlockRow,
  normalizeBlockSection,
  normalizeGraph,
  normalizeGroup,
  normalizeRelation,
  relation,
  relationInputEmbedAdapter,
} from '../src';

const definitionOptionKeys = [
  'entityRoles',
  'entityKinds',
  'entityPredicates',
  'relationRoles',
  'relationKinds',
  'relationPredicates',
  'graphThemeDefinitions',
] as const;

const contextOf = (id: string, kind: string): InputEmbedContext => ({
  id,
  kind,
  layerId: 'layer',
  identityPath: ['layer', id],
});

const lower = <TProps>(spec: InputEmbed<TProps>, adapter: SynchronousInputEmbedAdapter<TProps>) =>
  adapter.lower(spec.props, contextOf(spec.id ?? '__test-embed', spec.kind));
describe('@retikz/graph-vanilla 封装边界', () => {
  it('为每个 Graph 语义组合导出一个适配器和构建器', async () => {
    const graphVanilla = await import('../src');

    expect(graphVanilla.graphInputEmbedAdapter).toBeDefined();
    expect(graphVanilla.blockInputEmbedAdapter).toBeDefined();
    expect(graphVanilla.blockHeaderInputEmbedAdapter).toBeDefined();
    expect(graphVanilla.blockSectionInputEmbedAdapter).toBeDefined();
    expect(graphVanilla.blockRowInputEmbedAdapter).toBeDefined();
    expect(graphVanilla.entityInputEmbedAdapter).toBeDefined();
    expect(graphVanilla.groupInputEmbedAdapter).toBeDefined();
    expect(graphVanilla.relationInputEmbedAdapter).toBeDefined();
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
  it('归一化普通 Vanilla sugar 并保留零值，不接受丢失 authoring 的独立调用', () => {
    expect(normalizeBlock({ children: [{ position: [0, 0], text: 'label', style: { opacity: 0 } }] })).toMatchObject({
      children: [{ type: 'node', position: [0, 0], text: 'label', style: { opacity: 0 } }],
    });
    expect(() => normalizeBlock({ children: [{ type: 'scope', children: [], authoring: { inspect: true } }] })).toThrow(
      /outer normalizeScene embed context/,
    );
  });

  it('将字符串 Header 和 Section 文本保留为稀疏 Source 值', () => {
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

  it('将 Row 文本内容保留为最小 Source 值', () => {
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

  it('将开放的 Block 系列语义子规范化为与直接编写相同的稀疏 Source', () => {
    const header = {
      type: 'blockHeader',
      title: { text: 'User' },
      direction: 'horizontal',
      itemGap: 6,
      justifyContent: 'space-between',
      icon: { type: 'entity', role: 'state', position: [0, 0] },
      trail: { type: 'entity', role: 'concept', position: [20, 0] },
    } satisfies InputBlockHeader &
      Readonly<{
        type: 'blockHeader';
      }>;
    const row = {
      type: 'blockRow',
      id: 'name',
      children: [
        { type: 'node', position: [0, 0], text: 'name' },
        { type: 'entity', role: 'concept', position: [0, 0] },
      ],
    } satisfies InputBlockRow &
      Readonly<{
        type: 'blockRow';
      }>;
    const section = {
      type: 'blockSection',
      id: 'fields',
      children: [row],
    } satisfies InputBlockSection &
      Readonly<{
        type: 'blockSection';
      }>;
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

  it('保留省略的和显式的空 Block 系列子代', () => {
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
  it('保留 Group 表示并标准化并置的 Entity / Relation Source', () => {
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
  it('忽略不存在的子元素，同时保留显式的空数组', () => {
    expect(normalizeGraph({})).toEqual({ namespace: 'graph', type: 'graph' });
    expect(normalizeGraph({ children: [] })).toEqual({
      namespace: 'graph',
      type: 'graph',
      children: [],
    });
  });

  it('直接在 Graph 上保留完整的编写 Scope 曲面', () => {
    const input: InputGraph = {
      id: 'architecture',
      theme: { mode: 'dark' as const },
      graphRules: [
        {
          type: 'entity' as const,
          selector: { role: 'participant' },
          style: { fill: '#eef6ff' },
        },
      ],
      localNamespace: true,
      transforms: [{ kind: 'translate' as const, x: 10, y: 20 }],
      position: { kind: 'anchor', target: [30, 40], selfAnchor: 'center' },
      zIndex: 2,
      clip: { kind: 'rect' as const, params: { x: 0, y: 0, width: 220, height: 120 } },
      boundingShape: 'circle',
      animations: [],
      meta: { source: 'architecture-catalog' },
      defaults: {
        style: { fill: 'lightblue', opacity: { overall: 0.8 } },
        reset: ['path' as const],
        node: { style: { fill: 'white' }, label: { font: { size: 10 } } },
        path: { style: { stroke: 'green' }, label: { font: { size: 10 } }, arrow: { shape: 'stealth', scale: 1.5 } },
      },
    };

    expect(normalizeGraph(input)).toEqual({
      namespace: 'graph',
      type: 'graph',
      ...input,
    });
  });

  it('保持 defaultGraph 和 graphRules 与直接 Source IR 相同', () => {
    const input: InputGraph = {
      id: 'parity',
      defaultGraph: {
        entity: { style: { fill: '#111111' }, layout: { align: 'middle' } },
        relation: { style: { stroke: '#222222' } },
      },
      graphRules: [{ type: 'entity', selector: { role: 'activity' }, style: { fill: '#ff0000' } }],
      children: [
        { type: 'entity', id: 'source', role: 'activity', position: [0, 0], text: 'Source' },
        { type: 'entity', id: 'target', role: 'resource', position: [100, 0], text: 'Target' },
        {
          type: 'relation',
          role: 'dependency',
          source: { id: 'source' },
          target: { id: 'target' },
        },
      ],
    };

    expect(GraphSchema.parse(normalizeGraph(input))).toEqual(
      GraphSchema.parse({
        namespace: 'graph',
        type: 'graph',
        ...input,
        children: input.children?.map(child => ({ namespace: 'graph', ...child })),
      }),
    );
  });

  it('仅标准化 Entity、Relation 和 Way 编写糖', () => {
    expect(
      normalizeGraph({
        children: [
          { type: 'entity', role: 'participant', text: '', style: { dashed: true } },
          {
            type: 'relation',
            source: { id: 'service' },
            target: { id: 'database' },
            role: 'dependency',
            kind: 'domain.dependency',
            style: { dashPattern: [6, 2] },
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
          style: { dashed: true },
        },
        {
          namespace: 'graph',
          type: 'relation',
          source: { id: 'service' },
          target: { id: 'database' },
          role: 'dependency',
          kind: 'domain.dependency',
          labels: [{ text: 'reads', textColor: '#dc2626', font: { weight: 'bold' }, opacity: 0.5 }],
          route: [
            { type: 'step', kind: 'move', to: { id: 'service' } },
            { type: 'step', kind: 'line', to: { id: 'database' } },
          ],
          style: { dashPattern: [6, 2] },
        },
        { type: 'node', position: [0, 120], text: 'Legend' },
      ],
    });
  });
});
describe('Graph Vanilla 嵌入适配器', () => {
  it('对 Entity 嵌入和 Source 身份使用一个显式 Graph id', () => {
    const contribution = lower(
      entity({ id: 'client', role: 'participant', position: [0, 0], text: 'Client' }),
      entityInputEmbedAdapter,
    );

    expect(contribution.node).toEqual({
      namespace: 'graph',
      type: 'entity',
      id: 'client',
      role: 'participant',
      position: [0, 0],
      text: 'Client',
    });
  });

  it('将匿名 Entity 保留在 Graph Source 命名空间之外', () => {
    const contribution = lower(
      entity({ role: 'event', position: [0, 0], text: 'Anonymous event' }),
      entityInputEmbedAdapter,
    );

    expect(contribution.node).toEqual({
      namespace: 'graph',
      type: 'entity',
      role: 'event',
      position: [0, 0],
      text: 'Anonymous event',
    });
  });

  it('将每个组合的嵌入身份与可选的编写身份分开', () => {
    const graphContribution = lower(graph({}), graphInputEmbedAdapter);
    const entityContribution = lower(
      entity({ role: 'participant', status: 'success', position: [0, 0] }),
      entityInputEmbedAdapter,
    );
    const relationContribution = lower(
      relation({
        source: { id: 'source' },
        target: { id: 'target' },
        role: 'association',
        status: 'warning',
      }),
      relationInputEmbedAdapter,
    );
    const groupContribution = lower(group({}), groupInputEmbedAdapter);
    const blockContribution = lower(block({}), blockInputEmbedAdapter);
    const headerContribution = lower(blockHeader({ title: { text: 'Block' } }), blockHeaderInputEmbedAdapter);
    const sectionContribution = lower(blockSection({}), blockSectionInputEmbedAdapter);
    const rowContribution = lower(blockRow({}), blockRowInputEmbedAdapter);

    expect(graphContribution.node).toEqual({ namespace: 'graph', type: 'graph' });
    expect(entityContribution.node).toEqual({
      namespace: 'graph',
      type: 'entity',
      role: 'participant',
      status: 'success',
      position: [0, 0],
    });
    expect(relationContribution.node).toEqual({
      namespace: 'graph',
      type: 'relation',
      source: { id: 'source' },
      target: { id: 'target' },
      role: 'association',
      status: 'warning',
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

  it('标准化 Relation 方式，同时保留完整的 Core NodeTargets', () => {
    const contribution = lower(
      relation({
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
      relationInputEmbedAdapter,
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

  it('将字符串 Relation 端点标准化为 Core NodeTargets', () => {
    expect(
      normalizeRelation({
        type: 'relation',
        source: 'source',
        target: 'target',
        role: 'flow',
      }),
    ).toEqual({
      namespace: 'graph',
      type: 'relation',
      source: { id: 'source' },
      target: { id: 'target' },
      role: 'flow',
    });
  });

  it('标准化任意嵌套嵌入，无需添加面板 Scope', () => {
    const normalized = normalizeScene(
      {
        children: [
          graph({
            transforms: [{ kind: 'translate', x: 12, y: 8 }],
            children: [
              { type: 'node', id: 'source', position: [0, 0] },
              {
                type: 'scope',
                children: [
                  entity({
                    role: 'participant',
                    position: [80, 0],
                  }),
                ],
              },
              graph({
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

  it('在合并提供者贡献的同时标准化嵌套的独立结构嵌入', () => {
    const normalized = normalizeScene(
      {
        children: [
          block({
            children: [
              blockHeader({
                icon: entity({ role: 'state', position: [0, 0] }),
                title: { text: 'Block' },
              }),
              blockSection({
                children: [
                  blockRow({
                    children: [
                      group({
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
        blockProviderKey,
        blockHeaderProviderKey,
        blockSectionProviderKey,
        blockRowProviderKey,
        entityProviderKey,
        groupProviderKey,
      ]),
    );
  });

  it('编译直接在独立 Group 内声明的并置 Block', () => {
    expect(() =>
      processToStaticInputResult(
        {
          children: [
            group({
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

  it('贡献基于匹配语义组合的提供者闭包', () => {
    const graphContribution = lower(graph({}), graphInputEmbedAdapter);
    const entityContribution = lower(entity({ role: 'participant', position: [0, 0] }), entityInputEmbedAdapter);
    const relationContribution = lower(
      relation({
        source: { id: 'source' },
        target: { id: 'target' },
        role: 'association',
      }),
      relationInputEmbedAdapter,
    );
    const groupContribution = lower(group({}), groupInputEmbedAdapter);
    const blockContribution = lower(block({}), blockInputEmbedAdapter);
    const headerContribution = lower(blockHeader({ title: { text: 'Block' } }), blockHeaderInputEmbedAdapter);
    const sectionContribution = lower(blockSection({}), blockSectionInputEmbedAdapter);
    const rowContribution = lower(blockRow({}), blockRowInputEmbedAdapter);

    expect(graphContribution.providerDependencies.roots).toEqual([GraphProviderKey]);
    expect(entityContribution.providerDependencies.roots).toEqual([entityProviderKey]);
    expect(relationContribution.providerDependencies.roots).toEqual([relationProviderKey]);
    expect(groupContribution.providerDependencies.roots).toEqual([groupProviderKey]);
    expect(blockContribution.providerDependencies.roots).toEqual([blockProviderKey]);
    expect(headerContribution.providerDependencies.roots).toEqual([blockHeaderProviderKey]);
    expect(sectionContribution.providerDependencies.roots).toEqual([blockSectionProviderKey]);
    expect(rowContribution.providerDependencies.roots).toEqual([blockRowProviderKey]);
    expect(graphContribution.providerDependencies.providers.map(provider => provider.key)).toEqual(
      expect.arrayContaining([
        GraphProviderKey,
        groupProviderKey,
        blockProviderKey,
        entityProviderKey,
        relationProviderKey,
      ]),
    );
    expect(groupContribution.providerDependencies.providers.map(provider => provider.key)).toEqual(
      expect.arrayContaining([groupProviderKey, blockProviderKey, entityProviderKey, relationProviderKey]),
    );
    expect(blockContribution.providerDependencies.providers.map(provider => provider.key)).toEqual(
      expect.arrayContaining([
        blockProviderKey,
        blockHeaderProviderKey,
        blockSectionProviderKey,
        blockRowProviderKey,
        entityProviderKey,
        relationProviderKey,
      ]),
    );
    expect(entityContribution.providerDependencies.providers.map(provider => provider.key)).toHaveLength(3);
    expect(relationContribution.providerDependencies.providers.map(provider => provider.key)).toHaveLength(5);
  });

  it('将 Graph 定义保留在 Source IR 之外，并使用内置定义编译独立成员', () => {
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
      graphThemeDefinitions: [],
    } as const;
    const graphContribution = lower(
      graph({
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
      graphInputEmbedAdapter,
    );
    const entityContribution = lower(
      entity({
        role: 'participant',
        position: [0, 100],
      }),
      entityInputEmbedAdapter,
    );
    const relationContribution = lower(
      relation({
        source: { id: 'direct-source' },
        target: { id: 'direct-target' },
        role: 'association',
      }),
      relationInputEmbedAdapter,
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
            graph({
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
            entity({
              role: 'participant',
              position: [0, 100],
            }),
            relation({
              source: { id: 'direct-source' },
              target: { id: 'direct-target' },
              role: 'association',
            }),
          ],
        },
        { adapters: createGraphVanillaAdapters(), compile: { padding: 0 } },
      ),
    ).not.toThrow();
  });
});
