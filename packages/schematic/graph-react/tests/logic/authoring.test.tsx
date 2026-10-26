import {
  defineEntityRole,
  defineGraphTheme,
  defineRelationKind,
  defineRelationRole,
  EntityProviderKey,
  GraphProviderKey,
  GraphSchema,
  RelationProviderKey,
} from '@retikz/graph';
import type { InputGraph } from '@retikz/graph-vanilla';
import { createGraphVanillaAdapters, graph, normalizeGraph, relation } from '@retikz/graph-vanilla';
import { createInputScene, Node, Step, Text } from '@retikz/react';
import type { InputEmbedAdapter, InputEmbedContext } from '@retikz/vanilla';
import { normalizeScene, processToStaticInputResult } from '@retikz/vanilla';
import type { FC } from 'react';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { GraphProps } from '../../src';
import {
  Block,
  BlockHeader,
  BlockRow,
  BlockSection,
  Entity,
  Graph,
  GraphThemeProvider,
  Group,
  Relation,
  RetikzGraphReactErrorCode,
  useGraphThemeDefinitions,
} from '../../src';
import { collectEntityInput, collectRelationInput, graphLayoutHostPropsOf } from '../../src/graph/authoring';
import { synchronousAdapters } from '../helpers/synchronous-adapters';

describe('Group React 编写', () => {
  it('生成相同的 Group Source IR，同时接受任意 React 子项', () => {
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
    const normalized = normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });

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

describe('Block React 编写', () => {
  it('将字符串 Header 文本保留为稀疏 Source 文本', () => {
    const result = normalizeReact(createElement(BlockHeader, { title: 'User', description: 'Domain entity' }));

    expect(result.ir.children[0]).toEqual({
      namespace: 'graph',
      type: 'blockHeader',
      title: 'User',
      description: 'Domain entity',
    });
  });

  it('将 BlockRow 内容保留为稀疏 Source 文本，而不生成子项', () => {
    const content = ['name', { text: 'string', textColor: '#64748b', font: { weight: 'bold' as const } }];
    const result = normalizeReact(createElement(BlockRow, { id: 'name', content }));

    expect(result.ir.children[0]).toEqual({
      namespace: 'graph',
      type: 'blockRow',
      id: 'name',
      content,
    });
    expect(result.ir.children[0]).not.toHaveProperty('children');
  });

  it('通过片段和函数包装器按编写顺序规范任意 Block 子项', () => {
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
          trail: createElement(Decoration, { id: 'visibility' }),
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
          trail: { namespace: 'fixture', type: 'decoration', id: 'visibility' },
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

  it('将 Header、Section 和 Row 公开为具有嵌套适配器集合的独立复合组件', () => {
    const WrappedEntity: FC = () => createElement(Entity, { role: 'concept', position: [0, 0] });
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
          createElement(Node, { position: [0, 0], children: 'name' }),
          createElement(WrappedEntity),
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
          { type: 'node', position: [0, 0], text: 'name' },
          { namespace: 'graph', type: 'entity', role: 'concept', position: [0, 0] },
        ],
      },
    ]);
  });

  it('将直接的 Row 子项保持在 Source IR 中展开', () => {
    const result = normalizeReact(
      createElement(BlockRow, null, createElement(Node, { position: [0, 0], children: 'name' })),
    );
    const row = result.ir.children[0] as { children: Array<Record<string, unknown>> };

    expect(row.children[0]).toEqual({ type: 'node', position: [0, 0], text: 'name' });
    expect(row.children[0]).not.toHaveProperty('child');
    expect(row.children[0]).not.toHaveProperty('key');
  });

  it('当 React 子项标准化为零项目时，省略可选的 Header 槽位', () => {
    for (const empty of [null, false, createElement(Fragment)] as const) {
      const result = normalizeReact(
        createElement(BlockHeader, { title: { text: 'Empty slots' }, icon: empty, trail: empty }),
      );

      expect(result.ir.children[0]).toEqual({
        namespace: 'graph',
        type: 'blockHeader',
        title: { text: 'Empty slots' },
      });
    }
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
  'renderer',
  'animate',
  'snapshotAt',
  'animationRef',

  'idPrefix',
  'nodeDistance',
  'fontSize',
  'shapes',
  'boundaries',
  'clips',
  'arrows',
  'patterns',
  'paths',
  'composites',
  'themeDefinitions',
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
  'graphThemeDefinitions',
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
  return normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });
};

describe('@retikz/graph-react 封装边界', () => {
  it('独立公开每个 Graph 语义组合', async () => {
    const graphReact = await import('../../src');

    expect(Graph.inputEmbedAdapter.kind).toBe('graph.graph');
    expect(Block.inputEmbedAdapter.kind).toBe('graph.block');
    expect(BlockHeader.inputEmbedAdapter.kind).toBe('graph.blockHeader');
    expect(BlockSection.inputEmbedAdapter.kind).toBe('graph.blockSection');
    expect(BlockRow.inputEmbedAdapter.kind).toBe('graph.blockRow');
    expect(Entity.inputEmbedAdapter.kind).toBe('graph.entity');
    expect(Relation.inputEmbedAdapter.kind).toBe('graph.relation');
    expect(graphReact).not.toHaveProperty('BlockCell');
    expect(graphReact).not.toHaveProperty('createGraphReactAdapters');
  });
});

describe('Entity 和 Relation React 编写', () => {
  it('当 React 属性 undefined 时，忽略 Entity 状态', () => {
    const input = collectEntityInput({ role: 'participant', position: [0, 0], status: undefined }, 'entity-status');

    expect(input).not.toHaveProperty('status');
  });

  it('当 React 属性 undefined 时，忽略 Relation 状态', () => {
    const input = collectRelationInput(
      {
        role: 'association',
        source: { id: 'source' },
        target: { id: 'target' },
        status: undefined,
      },
      'relation-status',
    );

    expect(input).not.toHaveProperty('status');
  });

  it('通过共享 Vanilla 输入标准化字符串 Relation 端点', () => {
    const result = normalizeReact(
      createElement(Relation, {
        role: 'flow',
        source: 'source',
        target: 'target',
      }),
    );

    expect(result.ir.children).toEqual([
      {
        namespace: 'graph',
        type: 'relation',
        role: 'flow',
        source: { id: 'source' },
        target: { id: 'target' },
      },
    ]);
  });

  it('标准化直接 Entity 和 Relation 子项，没有 Graph 父项或生成的 id', () => {
    const result = normalizeReact(
      createElement(
        Fragment,
        null,
        createElement(Node, { id: 'source', position: [0, 0] }),
        createElement(Node, { id: 'target', position: [100, 0] }),
        createElement(Entity, { role: 'participant', status: 'success', position: [0, 80] }, 'Preview'),
        createElement(Relation, {
          role: 'association',
          kind: 'domain.association',
          status: 'warning',
          source: { id: 'source' },
          target: { id: 'target' },
          labels: [{ text: 'precise', textColor: '#dc2626', font: { weight: 'bold' }, opacity: 0.5 }],
          style: { dashPattern: [6, 2] },
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
        status: 'success',
        position: [0, 80],
        text: 'Preview',
      },
      {
        namespace: 'graph',
        type: 'relation',
        role: 'association',
        kind: 'domain.association',
        status: 'warning',
        source: { id: 'source' },
        target: { id: 'target' },
        labels: [{ text: 'precise', textColor: '#dc2626', font: { weight: 'bold' }, opacity: 0.5 }],
        style: { dashPattern: [6, 2] },
      },
    ]);
    expect(result.ir.children[2]).not.toHaveProperty('id');
    expect(result.ir.children[3]).not.toHaveProperty('id');
    expect(result.contributions.map(contribution => contribution.roots)).toEqual([
      [EntityProviderKey],
      [RelationProviderKey],
    ]);
  });

  it('通过 Core 编写语法规范 Entity 文本和 Relation 步骤包装器', () => {
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

  it('拒绝冲突的 Entity 文本和 Relation 路由编写', () => {
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

describe('Graph Source 和儿童编写', () => {
  it('使 defaultGraph 和 graphRules 与 Direct 和 Vanilla Source IR 相同', () => {
    const input = {
      id: 'parity',
      position: [0, 0],
      defaultGraph: {
        entity: { style: { fill: '#111111' }, layout: { align: 'middle' } },
        relation: { style: { stroke: '#222222' } },
      },
      graphRules: [{ type: 'entity' as const, selector: { role: 'activity' }, style: { fill: '#ff0000' } }],
      children: [
        { type: 'entity' as const, id: 'source', role: 'activity', position: [0, 0] as const, text: 'Source' },
        { type: 'entity' as const, id: 'target', role: 'resource', position: [100, 0] as const, text: 'Target' },
        {
          type: 'relation' as const,
          role: 'dependency',
          source: { id: 'source' },
          target: { id: 'target' },
        },
      ],
    } satisfies InputGraph;
    const direct = GraphSchema.parse({
      namespace: 'graph',
      type: 'graph',
      ...input,
      children: input.children.map(child => ({ namespace: 'graph' as const, ...child })),
    });

    const vanilla = normalizeGraph(input);
    const react = normalizeReact(
      createElement(
        Graph,
        { ...input, children: undefined },
        createElement(Entity, { id: 'source', role: 'activity', position: [0, 0] }, 'Source'),
        createElement(Entity, { id: 'target', role: 'resource', position: [100, 0] }, 'Target'),
        createElement(Relation, {
          role: 'dependency',
          source: { id: 'source' },
          target: { id: 'target' },
        }),
      ),
    );

    expect(vanilla).toEqual(direct);
    expect(react.ir.children[0]).toEqual(direct);
  });

  it('保留完整的 Graph Scope 表面并保持主题字段不相交', () => {
    const result = normalizeReact(
      createElement(
        Graph,
        {
          id: 'architecture',
          theme: { mode: 'dark' },
          graphRules: [
            {
              type: 'entity',
              selector: { role: 'participant' },
              style: { fill: '#eef6ff' },
            },
          ],
          localNamespace: true,
          transforms: [{ kind: 'translate', x: 10, y: 20 }],
          position: { kind: 'anchor', target: [30, 40], selfAnchor: 'center' },
          zIndex: 2,
          clip: { kind: 'rect', params: { x: 0, y: 0, width: 220, height: 120 } },
          boundingShape: 'circle',
          meta: { source: 'architecture-catalog' },
          animations: [],
          defaults: {
            style: {
              color: '#0f172a',
              stroke: '#334155',
              fill: '#e2e8f0',
              strokeWidth: 2,
              opacity: { overall: 0.8, fill: 0.7, stroke: 0.9 },
            },
            reset: ['path'],
            node: { style: { fill: 'white' }, label: { font: { size: 10 } } },
            path: {
              style: { stroke: 'green' },
              label: { font: { size: 10 } },
              arrow: { shape: 'stealth', scale: 1.5 },
            },
          },
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
        graphRules: [
          {
            type: 'entity',
            selector: { role: 'participant' },
            style: { fill: '#eef6ff' },
          },
        ],
        localNamespace: true,
        transforms: [{ kind: 'translate', x: 10, y: 20 }],
        position: { kind: 'anchor', target: [30, 40], selfAnchor: 'center' },
        zIndex: 2,
        clip: { kind: 'rect', params: { x: 0, y: 0, width: 220, height: 120 } },
        boundingShape: 'circle',
        meta: { source: 'architecture-catalog' },
        animations: [],
        children: [{ type: 'node', id: 'child', position: [0, 0] }],
        defaults: {
          style: {
            color: '#0f172a',
            stroke: '#334155',
            fill: '#e2e8f0',
            strokeWidth: 2,
            opacity: { overall: 0.8, fill: 0.7, stroke: 0.9 },
          },
          reset: ['path'],
          node: { style: { fill: 'white' }, label: { font: { size: 10 } } },
          path: { style: { stroke: 'green' }, label: { font: { size: 10 } }, arrow: { shape: 'stealth', scale: 1.5 } },
        },
      },
    ]);
  });

  it('按作者顺序对语义和第三方嵌入使用通用子规范化', () => {
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

  it('嵌入 Graph 时不创建嵌套 Scene', () => {
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

describe('Graph 独立式和嵌入式宿主分类', () => {
  it('通过一台 Layout Scene 宿主渲染独立的 Graph', () => {
    const markup = renderToStaticMarkup(
      createElement(
        Graph,
        { width: 240, height: 120 },
        createElement(Entity, { role: 'participant', position: [80, 60] }, 'Service'),
      ),
    );

    expect(markup.match(/<svg/g)).toHaveLength(1);
  });

  it('standalone Graph 将 defaults.style 级联到绘图内容', () => {
    const markup = renderToStaticMarkup(
      createElement(Graph, { defaults: { style: { fill: '#123456' } } }, createElement(Node, { position: [0, 0] })),
    );

    expect(markup).toContain('fill="#123456"');
  });

  it('转发完整的独立宿主表面，而不消费 Source 字段', () => {
    const props = {
      authoring: undefined,
      compileDriver: undefined,
      handlers: undefined,
      runtime: undefined,
      width: undefined,
      height: undefined,
      viewBox: undefined,
      className: undefined,
      defaults: { style: { fill: '#123456' } },
      renderer: undefined,
      animate: undefined,
      snapshotAt: undefined,
      animationRef: undefined,

      idPrefix: undefined,
      nodeDistance: undefined,
      fontSize: undefined,
      shapes: undefined,
      boundaries: undefined,
      clips: undefined,
      arrows: undefined,
      patterns: undefined,
      paths: undefined,
      composites: undefined,
      themeDefinitions: undefined,
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

    expect(hostProps).not.toHaveProperty('style');
    expect(hostProps).not.toHaveProperty('theme');
    expect(hostProps).not.toHaveProperty('animations');
  });

  it.each(hostPropKeys)('拒绝嵌入的自己的宿主属性 %s，包括显式 undefined', key => {
    const props: GraphProps = { [key]: undefined };

    expect(() => normalizeReact(createElement(Graph, props))).toThrowError(
      expect.objectContaining({ code: RetikzGraphReactErrorCode.GraphHostPropsInvalid }),
    );
  });
});

describe('Graph Definition 选项等价性', () => {
  it('通过 React 和 Vanilla 相同地编译显式注册的 Relation 类型', () => {
    const kind = defineRelationKind({
      kind: 'domain.contract',
      role: 'dependency',
      description: 'Contract dependency',
      directions: { forward: { targetMarker: { shape: 'open' }, dashPattern: [4, 2] } },
    });
    const props = {
      id: 'edge',
      role: 'dependency',
      kind: kind.kind,
      source: { id: 'a' },
      target: { id: 'b' },
    };
    const react = createInputScene(
      <Graph relationKinds={[kind]}>
        <Node id="a" position={[0, 0]} />
        <Node id="b" position={[100, 0]} />
        <Relation {...props} />
      </Graph>,
    );
    const reactResult = processToStaticInputResult(react.scene, {
      adapters: synchronousAdapters(react.adapters),
      compile: { padding: 0 },
    });
    const vanillaResult = processToStaticInputResult(
      {
        children: [
          graph({
            relationKinds: [kind],
            children: [
              { type: 'node', id: 'a', position: [0, 0] },
              { type: 'node', id: 'b', position: [100, 0] },
              relation(props),
            ],
          }),
        ],
      },
      { adapters: createGraphVanillaAdapters(), compile: { padding: 0 } },
    );

    expect(reactResult.scene).toEqual(vanillaResult.scene);

    type ScenePrimitive = (typeof reactResult.scene.primitives)[number];
    const flatten = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
      primitives.flatMap(primitive => (primitive.type === 'group' ? flatten(primitive.children) : [primitive]));

    expect(flatten(reactResult.scene.primitives).find(primitive => primitive.id === 'edge')).toMatchObject({
      type: 'path',
      arrowEnd: { shape: 'open' },
      dashPattern: [4, 2],
    });

    const normalized = normalizeScene(react.scene, { adapters: synchronousAdapters(react.adapters) });

    expect(normalized.ir.children[0]).toMatchObject({ children: [{ id: 'a' }, { id: 'b' }, { kind: kind.kind }] });
    expect(normalized.ir.children[0]).not.toHaveProperty('relationKinds');
  });

  it('将 Graph 定义保留在 Source 之外，并使用内置定义编译独立成员', () => {
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
        createElement(Entity, { role: 'participant', position: [0, 100] }),
        createElement(Relation, {
          role: 'association',
          source: { id: 'direct-source' },
          target: { id: 'direct-target' },
        }),
      ),
    );
    const normalized = normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });

    for (const child of normalized.ir.children) {
      for (const key of definitionOptionKeys) expect(child).not.toHaveProperty(key);
    }

    expect(() =>
      processToStaticInputResult(input.scene, {
        adapters: synchronousAdapters(input.adapters),
        compile: { padding: 0 },
      }),
    ).not.toThrow();
  });
});

describe('GraphThemeProvider', () => {
  it('按声明顺序合并祖先和本地定义', () => {
    const parent = defineGraphTheme({ name: 'parent', resolve: () => ({}) });
    const local = defineGraphTheme({ name: 'local', resolve: () => ({}) });

    const Probe: FC = () => {
      const styles = useGraphThemeDefinitions();
      return createElement('span', null, styles?.map(style => style.name).join(','));
    };

    const markup = renderToStaticMarkup(
      createElement(
        GraphThemeProvider,
        { graphThemeDefinitions: [parent] },
        createElement(GraphThemeProvider, { graphThemeDefinitions: [local] }, createElement(Probe)),
      ),
    );

    expect(markup).toContain('parent,local');
  });

  it('为独立的 Graph 提供环境定义，并将 Graph props 保留在最后', () => {
    const ambient = defineGraphTheme({ name: 'ambient', resolve: () => ({}) });
    const brand = defineGraphTheme({
      name: 'brand',
      resolve: () => ({ defaults: { entity: { style: { stroke: '#2563eb', textColor: '#2563eb' } } } }),
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
        { graphThemeDefinitions: [ambient] },
        createElement(
          Graph,
          {
            theme: { name: 'brand' },
            themeDefinitions: [coreBrand],
            graphThemeDefinitions: [brand],
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
