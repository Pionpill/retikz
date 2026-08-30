import type { InputEmbedAdapter, InputEmbedContext } from '@retikz/vanilla';
import type { FC } from 'react';

import {
  defineEntityRole,
  defineGraphThemeStyle,
  defineRelationRole,
  EntityProviderKey,
  GraphProviderKey,
  RelationProviderKey,
} from '@retikz/graph';
import { createInputScene, Node, Step, Text } from '@retikz/react';
import { normalizeScene, processToStaticInputResult } from '@retikz/vanilla';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { GraphProps } from '../../src';

import {
  Block,
  BlockCell,
  BlockHeader,
  BlockRow,
  BlockSection,
  Entity,
  Graph,
  GraphThemeProvider,
  Group,
  Relation,
  RetikzGraphReactErrorCode,
  useGraphThemeStyles,
} from '../../src';
import { graphLayoutHostPropsOf } from '../../src/graph/authoring';

describe('Group React authoring', () => {
  it('produces the same Group Source IR while accepting arbitrary React children', () => {
    const input = createInputScene(
      <Group
        id="runtime"
        caption={{ title: { text: 'Runtime' } }}
        labels={[{ text: 'internal', position: { boundary: 'left', fraction: 0.25 } }]}
      >
        <Node position={[0, 0]}>Kernel</Node>
        <Entity role="participant" position={[80, 0]}>
          Adapter
        </Entity>
      </Group>,
    );
    const normalized = normalizeScene(input.scene, { adapters: input.adapters });

    expect(normalized.ir.children[0]).toEqual({
      namespace: 'graph',
      type: 'group',
      id: 'runtime',
      caption: { title: { text: 'Runtime' } },
      labels: [{ text: 'internal', position: { boundary: 'left', fraction: 0.25 } }],
      children: [
        { type: 'node', position: [0, 0], text: 'Kernel' },
        { namespace: 'graph', type: 'entity', role: 'participant', position: [80, 0], text: 'Adapter' },
      ],
    });
  });
});

describe('Block React authoring', () => {
  it('normalizes arbitrary Block children in authored order through fragments and function wrappers', () => {
    const WrappedContent: FC = () =>
      createElement(
        Fragment,
        null,
        createElement(BlockHeader, {
          icon: createElement(Node, { position: [0, 0], children: 'U' }),
          title: { text: 'User' },
          description: { text: 'Domain entity' },
          direction: 'horizontal',
          itemGap: 6,
          justifyContent: 'space-between',
          trailing: createElement(Decoration, { id: 'visibility' }),
        }),
        createElement(Node, { position: [0, 40], children: 'Custom content' }),
      );

    const result = normalizeReact(
      createElement(
        Block,
        { id: 'user', width: 240, minWidth: 160 },
        createElement(WrappedContent),
        createElement(Group, null, createElement(Node, { position: [0, 80], children: 'Nested group' })),
      ),
    );

    expect(result.ir.children[0]).toEqual({
      namespace: 'graph',
      type: 'block',
      id: 'user',
      width: 240,
      minWidth: 160,
      children: [
        {
          namespace: 'graph',
          type: 'blockHeader',
          icon: { type: 'node', position: [0, 0], text: 'U' },
          title: { text: 'User' },
          description: { text: 'Domain entity' },
          direction: 'horizontal',
          itemGap: 6,
          justifyContent: 'space-between',
          trailing: { namespace: 'fixture', type: 'decoration', id: 'visibility' },
        },
        { type: 'node', position: [0, 40], text: 'Custom content' },
        {
          namespace: 'graph',
          type: 'group',
          children: [{ type: 'node', position: [0, 80], text: 'Nested group' }],
        },
      ],
    });
  });

  it('exposes Header, Section and Row as independent composites with nested adapter collection', () => {
    const WrappedCell: FC = () =>
      createElement(
        BlockCell,
        { itemKey: 'type', basis: 'content', grow: 0, shrink: 0 },
        createElement(Entity, { role: 'concept', position: [0, 0] }),
      );
    const result = normalizeReact(
      createElement(
        Fragment,
        null,
        createElement(BlockHeader, {
          icon: createElement(Decoration, { id: 'icon' }),
          title: { text: 'Standalone header' },
        }),
        createElement(
          BlockSection,
          { id: 'fields', title: { text: 'Fields' } },
          createElement(Node, { position: [0, 0], children: 'Arbitrary section content' }),
        ),
        createElement(
          BlockRow,
          { id: 'name' },
          createElement(BlockCell, { itemKey: 'name' }, createElement(Node, { position: [0, 0], children: 'name' })),
          createElement(WrappedCell),
        ),
      ),
    );

    expect(result.ir.children).toEqual([
      {
        namespace: 'graph',
        type: 'blockHeader',
        icon: { namespace: 'fixture', type: 'decoration', id: 'icon' },
        title: { text: 'Standalone header' },
      },
      {
        namespace: 'graph',
        type: 'blockSection',
        id: 'fields',
        title: { text: 'Fields' },
        children: [{ type: 'node', position: [0, 0], text: 'Arbitrary section content' }],
      },
      {
        namespace: 'graph',
        type: 'blockRow',
        id: 'name',
        children: [
          {
            key: 'name',
            child: { type: 'node', position: [0, 0], text: 'name' },
          },
          {
            key: 'type',
            child: { namespace: 'graph', type: 'entity', role: 'concept', position: [0, 0] },
            basis: 'content',
            grow: 0,
            shrink: 0,
          },
        ],
      },
    ]);
  });

  it('omits optional Header slots when React children normalize to zero items', () => {
    for (const empty of [null, false, createElement(Fragment)] as const) {
      const result = normalizeReact(
        createElement(BlockHeader, { title: { text: 'Empty slots' }, icon: empty, trailing: empty }),
      );

      expect(result.ir.children[0]).toEqual({
        namespace: 'graph',
        type: 'blockHeader',
        title: { text: 'Empty slots' },
      });
    }
  });

  it('fails loudly when a Cell is outside Row or does not contain exactly one child', () => {
    expect(() =>
      normalizeReact(
        createElement(Block, null, createElement(BlockCell, { itemKey: 'misplaced' }, createElement(Node))),
      ),
    ).toThrowError(expect.objectContaining({ code: RetikzGraphReactErrorCode.BlockStructureInvalid }));
    expect(() =>
      normalizeReact(createElement(BlockRow, null, createElement(BlockCell, { itemKey: 'empty' }))),
    ).toThrowError(expect.objectContaining({ code: RetikzGraphReactErrorCode.BlockStructureInvalid }));
    expect(() =>
      normalizeReact(
        createElement(
          BlockRow,
          null,
          createElement(
            BlockCell,
            { itemKey: 'many' },
            createElement(
              Fragment,
              null,
              createElement(Node, { position: [0, 0] }),
              createElement(Node, { position: [0, 0] }),
            ),
          ),
        ),
      ),
    ).toThrowError(expect.objectContaining({ code: RetikzGraphReactErrorCode.BlockStructureInvalid }));
  });
});

const hostPropKeys = [
  'authoring',
  'compileDriver',
  'handlers',
  'runtime',
  'width',
  'height',
  'viewBox',
  'className',
  'style',
  'renderer',
  'animate',
  'snapshotAt',
  'animationRef',
  'easings',
  'animationProperties',
  'idPrefix',
  'nodeDistance',
  'fontSize',
  'shapes',
  'boundaries',
  'clips',
  'arrows',
  'patterns',
  'pathGenerators',
  'pathKinds',
  'composites',
  'themeStyles',
  'lowerTex',
  'artifacts',
  'onArtifacts',
  'onCompileResult',
] as const;

const definitionOptionKeys = [
  'entityRoles',
  'entityKinds',
  'entityPredicates',
  'relationRoles',
  'relationKinds',
  'relationPredicates',
  'graphThemeStyles',
] as const;

const decorationAdapter = {
  kind: 'fixture.decoration',
  lower: (_props: unknown, context: InputEmbedContext) => ({
    node: { namespace: 'fixture', type: 'decoration', id: context.id },
    providerDependencies: { roots: [], providers: [] },
  }),
} satisfies InputEmbedAdapter<unknown>;

const Decoration = Object.assign((() => null) as FC<{ id: string }>, {
  displayName: 'Decoration',
  isTier2Embeddable: true as const,
  inputEmbedAdapter: decorationAdapter,
});

const WrappedText: FC = () => createElement(Text, { children: 'Wrapped' });
const WrappedRoute: FC = () =>
  createElement(
    Fragment,
    null,
    createElement(Step, { kind: 'move', to: 'source' }),
    createElement(Step, { kind: 'line', to: 'target' }),
  );

const normalizeReact = (element: ReturnType<typeof createElement>) => {
  const input = createInputScene(element);
  return normalizeScene(input.scene, { adapters: input.adapters });
};

describe('@retikz/graph-react package boundary', () => {
  it('exposes every Graph semantic composite independently while keeping Cell Row-local', async () => {
    const graphReact = await import('../../src');

    expect(Graph.inputEmbedAdapter.kind).toBe('graph.graph');
    expect(Block.inputEmbedAdapter.kind).toBe('graph.block');
    expect(BlockHeader.inputEmbedAdapter.kind).toBe('graph.blockHeader');
    expect(BlockSection.inputEmbedAdapter.kind).toBe('graph.blockSection');
    expect(BlockRow.inputEmbedAdapter.kind).toBe('graph.blockRow');
    expect(Entity.inputEmbedAdapter.kind).toBe('graph.entity');
    expect(Relation.inputEmbedAdapter.kind).toBe('graph.relation');
    expect(BlockCell).not.toHaveProperty('inputEmbedAdapter');
    expect(graphReact).not.toHaveProperty('createGraphReactAdapters');
  });
});

describe('Entity and Relation React authoring', () => {
  it('normalizes direct Entity and Relation children without a Graph parent or generated ids', () => {
    const result = normalizeReact(
      createElement(
        Fragment,
        null,
        createElement(Node, { id: 'source', position: [0, 0] }),
        createElement(Node, { id: 'target', position: [100, 0] }),
        createElement(Entity, { role: 'participant', position: [0, 80] }, 'Preview'),
        createElement(Relation, {
          role: 'association',
          source: { id: 'source' },
          target: { id: 'target' },
          dashPattern: [6, 2],
          labels: [{ text: 'precise', textColor: '#dc2626', font: { weight: 'bold' }, opacity: 0.5 }],
        }),
      ),
    );

    expect(result.ir.children).toEqual([
      { type: 'node', id: 'source', position: [0, 0] },
      { type: 'node', id: 'target', position: [100, 0] },
      {
        namespace: 'graph',
        type: 'entity',
        role: 'participant',
        position: [0, 80],
        text: 'Preview',
      },
      {
        namespace: 'graph',
        type: 'relation',
        role: 'association',
        source: { id: 'source' },
        target: { id: 'target' },
        dashPattern: [6, 2],
        labels: [{ text: 'precise', textColor: '#dc2626', font: { weight: 'bold' }, opacity: 0.5 }],
      },
    ]);
    expect(result.ir.children[2]).not.toHaveProperty('id');
    expect(result.ir.children[3]).not.toHaveProperty('id');
    expect(result.contributions.map(contribution => contribution.roots)).toEqual([
      [EntityProviderKey],
      [RelationProviderKey],
    ]);
  });

  it('normalizes Entity text and Relation Step wrappers through the Core authoring grammar', () => {
    const result = normalizeReact(
      createElement(
        Fragment,
        null,
        createElement(Entity, { id: 'source', role: 'concept' }, createElement(WrappedText)),
        createElement(Entity, { id: 'target', role: 'concept' }),
        createElement(
          Relation,
          { id: 'edge', role: 'association', source: { id: 'source' }, target: { id: 'target' } },
          createElement(WrappedRoute),
        ),
      ),
    );

    expect(result.ir.children).toEqual([
      { namespace: 'graph', type: 'entity', id: 'source', role: 'concept', text: 'Wrapped' },
      { namespace: 'graph', type: 'entity', id: 'target', role: 'concept' },
      {
        namespace: 'graph',
        type: 'relation',
        id: 'edge',
        role: 'association',
        source: { id: 'source' },
        target: { id: 'target' },
        route: [
          { type: 'step', kind: 'move', to: { id: 'source' } },
          { type: 'step', kind: 'line', to: { id: 'target' } },
        ],
      },
    ]);
  });

  it('rejects conflicting Entity text and Relation route authoring', () => {
    expect(() => normalizeReact(createElement(Entity, { role: 'activity', text: 'prop' }, 'child'))).toThrowError(
      expect.objectContaining({ code: RetikzGraphReactErrorCode.EntityInputInvalid }),
    );
    expect(() =>
      normalizeReact(
        createElement(
          Relation,
          {
            role: 'flow',
            source: { id: 'source' },
            target: { id: 'target' },
            way: ['source', 'target'],
          },
          createElement(Step, { kind: 'move', to: 'source' }),
          createElement(Step, { kind: 'line', to: 'target' }),
        ),
      ),
    ).toThrowError(expect.objectContaining({ code: RetikzGraphReactErrorCode.RelationInputInvalid }));
  });
});

describe('Graph Source and child authoring', () => {
  it('preserves the complete Graph Scope surface and keeps Theme fields disjoint', () => {
    const result = normalizeReact(
      createElement(
        Graph,
        {
          id: 'architecture',
          theme: { mode: 'dark' },
          graphTheme: {
            rules: [
              {
                type: 'entity',
                selector: { role: 'participant' },
                appearance: { fill: '#eef6ff' },
              },
            ],
          },
          localNamespace: true,
          transforms: [{ kind: 'translate', x: 10, y: 20 }],
          placement: { target: [30, 40], selfAnchor: 'center' },
          color: '#0f172a',
          stroke: '#334155',
          fill: '#e2e8f0',
          strokeWidth: 2,
          opacity: 0.8,
          fillOpacity: 0.7,
          strokeOpacity: 0.9,
          nodeDefault: { fill: 'white' },
          pathDefault: { stroke: 'green' },
          labelDefault: { font: { size: 10 } },
          arrowDefault: { shape: 'stealth', scale: 1.5 },
          resetStyle: ['path'],
          zIndex: 2,
          clip: { kind: 'rect', x: 0, y: 0, width: 220, height: 120 },
          boundingShape: 'circle',
          meta: { source: 'architecture-catalog' },
          animations: [],
        },
        createElement(Node, { id: 'child', position: [0, 0] }),
      ),
    );

    expect(result.ir.children).toEqual([
      {
        namespace: 'graph',
        type: 'graph',
        id: 'architecture',
        theme: { mode: 'dark' },
        graphTheme: {
          rules: [
            {
              type: 'entity',
              selector: { role: 'participant' },
              appearance: { fill: '#eef6ff' },
            },
          ],
        },
        localNamespace: true,
        transforms: [{ kind: 'translate', x: 10, y: 20 }],
        placement: { target: [30, 40], selfAnchor: 'center' },
        color: '#0f172a',
        stroke: '#334155',
        fill: '#e2e8f0',
        strokeWidth: 2,
        opacity: 0.8,
        fillOpacity: 0.7,
        strokeOpacity: 0.9,
        nodeDefault: { fill: 'white' },
        pathDefault: { stroke: 'green' },
        labelDefault: { font: { size: 10 } },
        arrowDefault: { shape: 'stealth', scale: 1.5 },
        resetStyle: ['path'],
        zIndex: 2,
        clip: { kind: 'rect', x: 0, y: 0, width: 220, height: 120 },
        boundingShape: 'circle',
        meta: { source: 'architecture-catalog' },
        animations: [],
        children: [{ type: 'node', id: 'child', position: [0, 0] }],
      },
    ]);
  });

  it('uses generic child normalization for semantic and third-party embeds in author order', () => {
    const result = normalizeReact(
      createElement(
        Graph,
        null,
        createElement(Node, { id: 'source', position: [0, 0] }),
        createElement(Entity, { role: 'participant', position: [80, 0] }),
        createElement(Decoration, { id: 'decoration' }),
        createElement(Relation, {
          role: 'association',
          source: { id: 'source' },
          target: { id: 'source' },
        }),
      ),
    );

    expect(result.ir.children).toEqual([
      {
        namespace: 'graph',
        type: 'graph',
        children: [
          { type: 'node', id: 'source', position: [0, 0] },
          { namespace: 'graph', type: 'entity', role: 'participant', position: [80, 0] },
          { namespace: 'fixture', type: 'decoration', id: 'decoration' },
          {
            namespace: 'graph',
            type: 'relation',
            role: 'association',
            source: { id: 'source' },
            target: { id: 'source' },
          },
        ],
      },
    ]);
    expect(result.contributions[0]?.roots).toEqual([GraphProviderKey, EntityProviderKey, RelationProviderKey]);
  });

  it('does not create a nested Scene when Graph is embedded', () => {
    const result = normalizeReact(
      createElement(Graph, null, createElement(Graph, null, createElement(Node, { position: [0, 0] }))),
    );

    expect(result.ir).toEqual({
      type: 'scene',
      version: 1,
      children: [
        {
          namespace: 'graph',
          type: 'graph',
          children: [
            {
              namespace: 'graph',
              type: 'graph',
              children: [{ type: 'node', position: [0, 0] }],
            },
          ],
        },
      ],
    });
  });
});

describe('Graph standalone and embedded host classification', () => {
  it('renders standalone Graph through exactly one Layout Scene host', () => {
    const markup = renderToStaticMarkup(
      createElement(
        Graph,
        { width: 240, height: 120 },
        createElement(Entity, { role: 'participant', position: [80, 60] }, 'Service'),
      ),
    );

    expect(markup.match(/<svg/g)).toHaveLength(1);
  });

  it('forwards the complete standalone host surface without consuming Source fields', () => {
    const props = {
      authoring: undefined,
      compileDriver: undefined,
      handlers: undefined,
      runtime: undefined,
      width: undefined,
      height: undefined,
      viewBox: undefined,
      className: undefined,
      style: undefined,
      renderer: undefined,
      animate: undefined,
      snapshotAt: undefined,
      animationRef: undefined,
      easings: undefined,
      animationProperties: undefined,
      idPrefix: undefined,
      nodeDistance: undefined,
      fontSize: undefined,
      shapes: undefined,
      boundaries: undefined,
      clips: undefined,
      arrows: undefined,
      patterns: undefined,
      pathGenerators: undefined,
      pathKinds: undefined,
      composites: undefined,
      themeStyles: undefined,
      lowerTex: undefined,
      artifacts: undefined,
      onArtifacts: undefined,
      onCompileResult: undefined,
      theme: { mode: 'dark' as const },
      animations: [],
    } satisfies GraphProps;

    const hostProps = graphLayoutHostPropsOf(props);
    expect(Object.keys(hostProps)).toEqual(hostPropKeys);
    for (const key of hostPropKeys) expect(hostProps[key]).toBe(props[key]);
    expect(hostProps).not.toHaveProperty('theme');
    expect(hostProps).not.toHaveProperty('animations');
  });

  it.each(hostPropKeys)('rejects embedded own host property %s including explicit undefined', key => {
    const props: GraphProps = { [key]: undefined };

    expect(() => normalizeReact(createElement(Graph, props))).toThrowError(
      expect.objectContaining({ code: RetikzGraphReactErrorCode.GraphHostPropsInvalid }),
    );
  });
});

describe('Graph Definition options parity', () => {
  it('keeps all options out of Source and compiles custom definitions through Graph, Entity and Relation', () => {
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
    const input = createInputScene(
      createElement(
        Fragment,
        null,
        createElement(Node, { id: 'direct-source', position: [0, 200] }),
        createElement(Node, { id: 'direct-target', position: [100, 200] }),
        createElement(
          Graph,
          options,
          createElement(Entity, { id: 'graph-source', role: 'custom-entity', position: [0, 0] }),
          createElement(Entity, { id: 'graph-target', role: 'custom-entity', position: [100, 0] }),
          createElement(Relation, {
            role: 'custom-relation',
            source: { id: 'graph-source' },
            target: { id: 'graph-target' },
          }),
        ),
        createElement(Entity, {
          ...options,
          role: 'custom-entity',
          position: [0, 100],
        }),
        createElement(Relation, {
          ...options,
          role: 'custom-relation',
          source: { id: 'direct-source' },
          target: { id: 'direct-target' },
        }),
      ),
    );
    const normalized = normalizeScene(input.scene, { adapters: input.adapters });

    for (const child of normalized.ir.children) {
      for (const key of definitionOptionKeys) expect(child).not.toHaveProperty(key);
    }
    expect(() =>
      processToStaticInputResult(input.scene, {
        adapters: input.adapters,
        compile: { padding: 0 },
      }),
    ).not.toThrow();
  });
});

describe('GraphThemeProvider', () => {
  it('merges ancestor and local definitions in declaration order', () => {
    const parent = defineGraphThemeStyle({ name: 'parent', resolve: () => ({}) });
    const local = defineGraphThemeStyle({ name: 'local', resolve: () => ({}) });
    const Probe: FC = () => {
      const styles = useGraphThemeStyles();
      return createElement('span', null, styles?.map(style => style.name).join(','));
    };

    const markup = renderToStaticMarkup(
      createElement(
        GraphThemeProvider,
        { graphThemeStyles: [parent] },
        createElement(GraphThemeProvider, { graphThemeStyles: [local] }, createElement(Probe)),
      ),
    );

    expect(markup).toContain('parent,local');
  });

  it('supplies ambient definitions to standalone Graph and keeps Graph props last', () => {
    const ambient = defineGraphThemeStyle({ name: 'ambient', resolve: () => ({}) });
    const brand = defineGraphThemeStyle({
      name: 'brand',
      resolve: () => ({ entity: { tokens: { stroke: '#2563eb', textColor: '#2563eb' } } }),
    });
    const coreBrand = {
      name: 'brand',
      resolve: () => ({
        semantic: { error: '#dc2626', success: '#16a34a', warning: '#ca8a04', guide: '#6b7280' },
        categorical: ['#2563eb'] as const,
      }),
    };

    const markup = renderToStaticMarkup(
      createElement(
        GraphThemeProvider,
        { graphThemeStyles: [ambient] },
        createElement(
          Graph,
          {
            theme: { style: 'brand' },
            themeStyles: [coreBrand],
            graphThemeStyles: [brand],
            width: 240,
            height: 120,
          },
          createElement(Entity, { role: 'activity', position: [80, 60] }, 'Service'),
        ),
      ),
    );

    expect(markup.match(/<svg/g)).toHaveLength(1);
    expect(markup).toContain('#2563eb');
  });
});
