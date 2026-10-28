import { normalizeFlowDiagram } from '@retikz/diagram-vanilla/flow';
import { FlowDiagramSchema } from '@retikz/diagram/flow';
import { createInputScene } from '@retikz/react';
import { normalizeScene, prepareProcessingInput, processToStaticInputResult } from '@retikz/vanilla';
import type { FC, ReactNode } from 'react';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import * as FlowReact from '../src/flow';

/** 本组验证同步 Flow authoring；遇到异步 adapter 时显式失败 */
const synchronousAdapters = (adapters: ReturnType<typeof createInputScene>['adapters']) =>
  adapters.map(adapter => {
    if (adapter.lower === undefined) throw new Error('Expected a synchronous Flow adapter');
    return adapter;
  });

it('忽略具有等效解析默认值的 React 和 Vanilla Source 中的空目录', () => {
  const input = createInputScene(
    <FlowReact.FlowDiagram>
      <FlowReact.FlowEntity id="item" text="Item" />
    </FlowReact.FlowDiagram>,
  );
  const react = normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) }).ir.children[0];
  const vanilla = normalizeFlowDiagram({ entities: [{ id: 'item', text: 'Item' }], children: ['item'] });
  const explicitEmpty = normalizeFlowDiagram({
    entities: [{ id: 'item', text: 'Item' }],
    groups: [],
    layouts: [],
    children: ['item'],
  });
  expect(react).toEqual(vanilla);
  expect(explicitEmpty).toEqual(vanilla);
  expect(vanilla).not.toHaveProperty('groups');
  expect(vanilla).not.toHaveProperty('layouts');
  expect(FlowDiagramSchema.parse(vanilla)).toMatchObject({ groups: [], layouts: [] });
});

it('通过 React 和 Vanilla 同样保留 Graph Group 标题、标签和本地上下文', () => {
  const group = {
    id: 'service',
    caption: { description: { text: ['Service', 'Runtime boundary'] }, side: 'bottom' as const },
    labels: [{ text: 'Internal', position: 'bottom' as const }],
    defaultGraph: { entity: { style: { font: { size: 18 } } } },
    graphRules: [{ type: 'entity' as const, selector: { role: 'concept' }, style: { textColor: 'red' } }],
    meta: { owner: 'service' },
    defaults: { style: { opacity: { overall: 0.8 } } },
    zIndex: 2,
  };
  const input = createInputScene(
    <FlowReact.FlowDiagram>
      <FlowReact.FlowGroup {...group}>
        <FlowReact.FlowEntity id="request" text="Request" />
      </FlowReact.FlowGroup>
    </FlowReact.FlowDiagram>,
  );
  const normalized = normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });
  const vanilla = normalizeFlowDiagram({
    entities: [{ id: 'request', text: 'Request' }],
    groups: [{ ...group, children: ['request'] }],
    children: ['service'],
  });

  expect(FlowDiagramSchema.parse(normalized.ir.children[0])).toEqual(FlowDiagramSchema.parse(vanilla));
  expect(vanilla.groups?.[0]).toEqual({ ...group, children: ['request'] });
});

it('通过 React 和 Vanilla 同样保留局部 Layout 排除', () => {
  const input = createInputScene(
    <FlowReact.FlowDiagram>
      <FlowReact.FlowLayout id="row" kind="linear" direction="right" excludeFromBounds={['png']}>
        <FlowReact.FlowEntities items={['canvas', 'png']} />
      </FlowReact.FlowLayout>
    </FlowReact.FlowDiagram>,
  );
  const normalized = normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });
  const vanilla = normalizeFlowDiagram({
    entities: [
      { id: 'canvas', text: 'canvas' },
      { id: 'png', text: 'png' },
    ],
    layouts: [
      { id: 'row', kind: 'linear', direction: 'right', children: ['canvas', 'png'], excludeFromBounds: ['png'] },
    ],
    children: ['row'],
  });

  expect(FlowDiagramSchema.parse(normalized.ir.children[0])).toEqual(FlowDiagramSchema.parse(vanilla));
});

type FlowComponent = FC<Readonly<Record<string, unknown>> & Readonly<{ children?: ReactNode }>>;

const componentExport = (name: string): FlowComponent | undefined => {
  const value: unknown = FlowReact;
  if (typeof value !== 'object' || value === null || !(name in value)) return undefined;

  const candidate = value[name as keyof typeof value];

  return typeof candidate === 'function' ? (candidate as FlowComponent) : undefined;
};

const components = () => ({
  FlowDiagram: componentExport('FlowDiagram'),
  FlowEntities: componentExport('FlowEntities'),
  FlowEntity: componentExport('FlowEntity'),
  FlowGroup: componentExport('FlowGroup'),
  FlowLayout: componentExport('FlowLayout'),
  FlowRelations: componentExport('FlowRelations'),
  FlowRelation: componentExport('FlowRelation'),
});

const flowSourceFromChildren = (FlowDiagram: FlowComponent, children: ReactNode) => {
  const input = createInputScene(createElement(FlowDiagram, null, children));
  const normalized = normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });
  return normalized.ir.children[0];
};

const flowChildren = (
  FlowEntity: FlowComponent,
  FlowGroup: FlowComponent,
  FlowLayout: FlowComponent,
  FlowRelation: FlowComponent,
) =>
  createElement(
    Fragment,
    null,
    createElement(
      FlowGroup,
      { id: 'client', caption: { title: { text: 'Client' } } },
      createElement(
        FlowLayout,
        { kind: 'linear' as const, id: 'frontend', direction: 'down' },
        createElement(FlowEntity, { id: 'jsx', text: 'JSX', status: 'success', rank: 0 }),
      ),
    ),
    createElement(FlowEntity, { id: 'kernel', text: ['Kernel', 'IR compiler'] }),
    createElement(FlowRelation, {
      source: 'jsx',
      target: 'kernel',
      label: 'normalize',
      status: 'warning',
      routing: { kind: 'orthogonal', cornerRadius: 0 },
    }),
  );

const expectedSource = {
  namespace: 'diagram',
  type: 'flow',
  id: 'architecture',
  theme: { mode: 'dark' },
  entities: [
    { id: 'jsx', text: 'JSX', status: 'success', rank: 0 },
    { id: 'kernel', text: ['Kernel', 'IR compiler'] },
  ],
  groups: [{ id: 'client', caption: { title: { text: 'Client' } }, children: ['frontend'] }],
  layouts: [{ kind: 'linear' as const, id: 'frontend', direction: 'down', children: ['jsx'] }],
  children: ['client', 'kernel'],
  relations: [
    {
      source: 'jsx',
      target: 'kernel',
      label: 'normalize',
      status: 'warning',
      routing: { kind: 'orthogonal', cornerRadius: 0 },
    },
  ],
  defaultFlow: { layout: { nodeGap: 0, rankGap: 48 } },
};

describe('@retikz/diagram-react/flow', () => {
  it.each(['-|', '|-'] as const)('用与 Vanilla 相同的 Source 和直接 IR 渲染 %s', kind => {
    const entities = [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
    ];
    const relation = { source: 'a', target: 'b', routing: { kind, cornerRadius: 3 } };
    const input = createInputScene(
      createElement(
        FlowReact.FlowDiagram,
        null,
        createElement(FlowReact.FlowEntities, { items: entities }),
        createElement(FlowReact.FlowRelation, relation),
      ),
    );
    const vanilla = normalizeFlowDiagram({
      entities,
      children: ['a', 'b'],
      relations: [relation],
    });

    expect(normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) }).ir.children[0]).toEqual(
      vanilla,
    );
    expect(FlowDiagramSchema.parse(vanilla).relations?.[0].routing).toEqual({ kind, cornerRadius: 3 });

    const markup = renderToStaticMarkup(
      createElement(
        FlowReact.FlowDiagram,
        null,
        createElement(FlowReact.FlowEntities, { items: entities }),
        createElement(FlowReact.FlowRelation, relation),
      ),
    );

    expect(markup).toContain('<svg');
    expect(markup).toContain('<path');
  });

  it.each([
    { form: 'matrix', placements: [['a'], [null, 'b']] },
    {
      form: 'id-keyed mapping',
      placements: {
        a: { row: 0, column: 0 },
        b: { row: 1, column: 1 },
      },
    },
  ])('通过键入 React、Vanilla 和 Group 内的直接 Source 保留 $form Grid 放置', ({ placements }) => {
    const grid = {
      kind: 'grid' as const,
      id: 'grid',
      gap: { row: 0, column: 24 },
      placements,
    };
    const entities = [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
    ];
    const source = {
      entities,
      groups: [{ id: 'group', children: ['grid'] }],
      layouts: [{ ...grid, children: ['a', 'b'] }],
      children: ['group'],
    };
    const direct = FlowDiagramSchema.parse({ namespace: 'diagram', type: 'flow', ...source });
    const input = createInputScene(
      createElement(
        FlowReact.FlowDiagram,
        null,
        createElement(
          FlowReact.FlowGroup,
          { id: 'group' },
          createElement(FlowReact.FlowLayout, grid, createElement(FlowReact.FlowEntities, { items: entities })),
        ),
      ),
    );
    const react = normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) }).ir.children[0];

    expect(FlowDiagramSchema.parse(react)).toEqual(direct);
    expect(FlowDiagramSchema.parse(normalizeFlowDiagram(source))).toEqual(direct);

    const result = processToStaticInputResult(input.scene, {
      adapters: synchronousAdapters(input.adapters),
      compile: { measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }) },
    });

    expect(JSON.stringify(result)).toContain('A');
  });

  it('通过类型化的 React 和 Vanilla 编写保留 Source 形状的默认值和实例路径', () => {
    const props = {
      presentation: { title: { text: 'Pipeline', style: { font: { size: 21 } } } },
      defaultDiagram: { presentation: { title: { style: { opacity: 0.8 } } } },
      defaultFlow: { entity: { layout: { maxTextWidth: 180 } }, relation: { labelFont: { size: 11 } } },
      graphRules: [{ type: 'entity' as const, selector: { role: 'concept' }, style: { color: 'dodgerblue' } }],
    } satisfies FlowReact.FlowDiagramProps;
    const entity = { id: 'node', text: 'Node', layout: { lineHeight: 18 } };
    const relation = { source: 'node', target: 'node', group: 'forward' };
    const direct = FlowDiagramSchema.parse({
      namespace: 'diagram',
      type: 'flow',
      ...props,
      entities: [entity],
      children: ['node'],
      relations: [relation],
    });
    const input = createInputScene(
      createElement(
        FlowReact.FlowDiagram,
        props,
        createElement(FlowReact.FlowEntity, entity),
        createElement(FlowReact.FlowRelation, relation),
      ),
    );
    const react = normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) }).ir.children[0];
    const vanilla = normalizeFlowDiagram({
      ...props,
      entities: [entity],
      children: ['node'],
      relations: [relation],
    });

    expect(FlowDiagramSchema.parse(react)).toEqual(direct);
    expect(FlowDiagramSchema.parse(vanilla)).toEqual(direct);
  });

  it('导出支持的 Flow 根、单个和批量 JSX 标记', () => {
    const exported = components();

    expect(exported.FlowDiagram).toBeDefined();
    expect(exported.FlowEntities).toBeDefined();
    expect(exported.FlowEntity).toBeDefined();
    expect(exported.FlowGroup).toBeDefined();
    expect(exported.FlowLayout).toBeDefined();
    expect(exported.FlowRelations).toBeDefined();
    expect(exported.FlowRelation).toBeDefined();
    expect(componentExport('FlowBlock')).toBeUndefined();
  });

  it('以 JSX 混合顺序扩展批次 Entity 和 Relation 形式', () => {
    const { FlowDiagram, FlowEntities, FlowEntity, FlowRelations, FlowRelation } = components();

    expect(FlowDiagram).toBeDefined();
    expect(FlowEntities).toBeDefined();
    expect(FlowEntity).toBeDefined();
    expect(FlowRelations).toBeDefined();
    expect(FlowRelation).toBeDefined();

    if (
      FlowDiagram === undefined ||
      FlowEntities === undefined ||
      FlowEntity === undefined ||
      FlowRelations === undefined ||
      FlowRelation === undefined
    )
      return;

    const source = flowSourceFromChildren(
      FlowDiagram,
      createElement(
        Fragment,
        null,
        createElement(FlowEntity, { id: 'first', text: 'First' }),
        createElement(FlowEntities, {
          items: ['second'],
        }),
        createElement(FlowEntities, {
          items: [{ id: 'third', text: 'Third', status: 'success' }],
          complete: false,
        }),
        createElement(Fragment, null, createElement(FlowEntity, { id: 'fourth', text: 'Fourth' })),
        createElement(FlowRelations, {
          items: [['first', 'second']],
        }),
        createElement(FlowRelations, {
          items: [{ source: 'second', target: 'third', label: 'Next' }],
          complete: false,
        }),
        createElement(FlowRelation, { source: 'third', target: 'fourth' }),
      ),
    );

    expect(source).toEqual({
      namespace: 'diagram',
      type: 'flow',
      entities: [
        { id: 'first', text: 'First' },
        { id: 'second', text: 'second' },
        { id: 'third', text: 'Third', status: 'success' },
        { id: 'fourth', text: 'Fourth' },
      ],
      children: ['first', 'second', 'third', 'fourth'],
      relations: [
        { source: 'first', target: 'second' },
        { source: 'second', target: 'third', label: 'Next' },
        { source: 'third', target: 'fourth' },
      ],
    });
  });

  it.each(['entities', 'relations'] as const)('拒绝任何同一所属模块声明旁边的完整 %s 标记', declarationKind => {
    const { FlowDiagram, FlowEntities, FlowEntity, FlowRelations, FlowRelation } = components();

    expect(FlowDiagram).toBeDefined();
    expect(FlowEntities).toBeDefined();
    expect(FlowEntity).toBeDefined();
    expect(FlowRelations).toBeDefined();
    expect(FlowRelation).toBeDefined();

    if (
      FlowDiagram === undefined ||
      FlowEntities === undefined ||
      FlowEntity === undefined ||
      FlowRelations === undefined ||
      FlowRelation === undefined
    )
      return;

    const completeMarker =
      declarationKind === 'entities'
        ? createElement(FlowEntities, { items: ['only'], complete: true })
        : createElement(FlowRelations, { items: [['source', 'target']], complete: true });
    const singleMarker =
      declarationKind === 'entities'
        ? createElement(FlowEntity, { id: 'extra', text: 'Extra' })
        : createElement(FlowRelation, { source: 'target', target: 'source' });
    const emptyBatchMarker =
      declarationKind === 'entities'
        ? createElement(FlowEntities, { items: [] })
        : createElement(FlowRelations, { items: [] });
    const secondCompleteMarker =
      declarationKind === 'entities'
        ? createElement(FlowEntities, { items: ['other'], complete: true })
        : createElement(FlowRelations, { items: [['target', 'source']], complete: true });
    const reason = declarationKind === 'entities' ? 'complete-entities-conflict' : 'complete-relations-conflict';

    for (const declarations of [
      [completeMarker, singleMarker],
      [singleMarker, completeMarker],
      [completeMarker, emptyBatchMarker],
      [completeMarker, secondCompleteMarker],
    ]) {
      expect(() => createInputScene(createElement(FlowDiagram, null, ...declarations))).toThrowError(
        expect.objectContaining({
          code: 'DIAGRAM_REACT_FLOW_CHILD_INVALID',
          details: expect.objectContaining({ reason }),
        }),
      );
    }
  });

  it('将完整的 Entity 列表范围扩展到其直接 Flow、Group 或 Layout 所属模块', () => {
    const { FlowDiagram, FlowEntities, FlowGroup, FlowLayout } = components();

    expect(FlowDiagram).toBeDefined();
    expect(FlowEntities).toBeDefined();
    expect(FlowGroup).toBeDefined();
    expect(FlowLayout).toBeDefined();

    if (FlowDiagram === undefined || FlowEntities === undefined || FlowGroup === undefined || FlowLayout === undefined)
      return;

    const source = flowSourceFromChildren(
      FlowDiagram,
      createElement(
        Fragment,
        null,
        createElement(FlowEntities, { items: ['root'], complete: true }),
        createElement(
          FlowGroup,
          { id: 'group' },
          createElement(FlowEntities, { items: ['group-entity'], complete: true }),
          createElement(
            FlowLayout,
            { kind: 'linear' as const, id: 'layout', direction: 'right' },
            createElement(FlowEntities, { items: ['layout-entity'], complete: true }),
          ),
        ),
      ),
    );

    expect(source).toEqual({
      namespace: 'diagram',
      type: 'flow',
      entities: [
        { id: 'root', text: 'root' },
        { id: 'group-entity', text: 'group-entity' },
        { id: 'layout-entity', text: 'layout-entity' },
      ],
      groups: [{ id: 'group', children: ['group-entity', 'layout'] }],
      layouts: [{ kind: 'linear' as const, id: 'layout', direction: 'right', children: ['layout-entity'] }],
      children: ['root', 'group'],
    });
  });

  it('在现有 Flow 诊断路径上的附加收集器中保留重复的 ID', () => {
    const { FlowDiagram, FlowEntities, FlowEntity } = components();

    expect(FlowDiagram).toBeDefined();
    expect(FlowEntities).toBeDefined();
    expect(FlowEntity).toBeDefined();

    if (FlowDiagram === undefined || FlowEntities === undefined || FlowEntity === undefined) return;

    const input = createInputScene(
      createElement(
        FlowDiagram,
        null,
        createElement(FlowEntities, { items: ['duplicate'] }),
        createElement(FlowEntity, { id: 'duplicate', text: 'Duplicate' }),
      ),
    );

    expect(() =>
      processToStaticInputResult(input.scene, {
        adapters: synchronousAdapters(input.adapters),
        compile: { measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }) },
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'CORE_LAYOUT_PROBE_RECOVERABLE',
        cause: expect.objectContaining({ code: 'DIAGRAM_FLOW_DUPLICATE_ID' }),
      }),
    );
  });

  it('扩展 Group 和 Layout 所属模块内的批量实体', () => {
    const { FlowDiagram, FlowEntities, FlowGroup, FlowLayout } = components();

    expect(FlowDiagram).toBeDefined();
    expect(FlowEntities).toBeDefined();
    expect(FlowGroup).toBeDefined();
    expect(FlowLayout).toBeDefined();

    if (FlowDiagram === undefined || FlowEntities === undefined || FlowGroup === undefined || FlowLayout === undefined)
      return;

    const source = flowSourceFromChildren(
      FlowDiagram,
      createElement(
        FlowGroup,
        { id: 'group' },
        createElement(FlowEntities, { items: [{ id: 'group-child', text: 'Group child' }] }),
        createElement(
          FlowLayout,
          { kind: 'linear' as const, id: 'row', direction: 'right' },
          createElement(FlowEntities, { items: ['layout-a', 'layout-b'] }),
        ),
      ),
    );

    expect(source).toEqual({
      namespace: 'diagram',
      type: 'flow',
      entities: [
        { id: 'group-child', text: 'Group child' },
        { id: 'layout-a', text: 'layout-a' },
        { id: 'layout-b', text: 'layout-b' },
      ],
      groups: [{ id: 'group', children: ['group-child', 'row'] }],
      layouts: [{ kind: 'linear' as const, id: 'row', direction: 'right', children: ['layout-a', 'layout-b'] }],
      children: ['group'],
    });
  });

  it.each(['group', 'layout'] as const)('拒绝 %s 所属模块内的批处理关系', ownerKind => {
    const { FlowDiagram, FlowGroup, FlowLayout, FlowRelations } = components();

    expect(FlowDiagram).toBeDefined();
    expect(FlowGroup).toBeDefined();
    expect(FlowLayout).toBeDefined();
    expect(FlowRelations).toBeDefined();

    if (FlowDiagram === undefined || FlowGroup === undefined || FlowLayout === undefined || FlowRelations === undefined)
      return;

    const nestedRelations = createElement(FlowRelations, { items: [['source', 'target']] });
    const owner =
      ownerKind === 'group'
        ? createElement(FlowGroup, { id: 'owner' }, nestedRelations)
        : createElement(FlowLayout, { kind: 'linear' as const, id: 'owner', direction: 'right' }, nestedRelations);

    expect(() => createInputScene(createElement(FlowDiagram, null, owner))).toThrowError(
      expect.objectContaining({
        code: 'DIAGRAM_REACT_FLOW_CHILD_INVALID',
        details: expect.objectContaining({ reason: 'relation-outside-root' }),
      }),
    );
  });

  it('将空批次标记视为无操作', () => {
    const { FlowDiagram, FlowEntities, FlowEntity, FlowRelations } = components();

    expect(FlowDiagram).toBeDefined();
    expect(FlowEntities).toBeDefined();
    expect(FlowEntity).toBeDefined();
    expect(FlowRelations).toBeDefined();

    if (
      FlowDiagram === undefined ||
      FlowEntities === undefined ||
      FlowEntity === undefined ||
      FlowRelations === undefined
    )
      return;

    const source = flowSourceFromChildren(
      FlowDiagram,
      createElement(
        Fragment,
        null,
        createElement(FlowEntities, { items: [] }),
        createElement(FlowEntity, { id: 'only', text: 'Only' }),
        createElement(FlowRelations, { items: [] }),
      ),
    );

    expect(source).toEqual({
      namespace: 'diagram',
      type: 'flow',
      entities: [{ id: 'only', text: 'Only' }],
      children: ['only'],
    });
  });

  it('从批次和单个标记生成相同的 Source', () => {
    const { FlowDiagram, FlowEntities, FlowEntity, FlowRelations, FlowRelation } = components();

    expect(FlowDiagram).toBeDefined();
    expect(FlowEntities).toBeDefined();
    expect(FlowEntity).toBeDefined();
    expect(FlowRelations).toBeDefined();
    expect(FlowRelation).toBeDefined();

    if (
      FlowDiagram === undefined ||
      FlowEntities === undefined ||
      FlowEntity === undefined ||
      FlowRelations === undefined ||
      FlowRelation === undefined
    )
      return;

    const batchSource = flowSourceFromChildren(
      FlowDiagram,
      createElement(
        Fragment,
        null,
        createElement(FlowEntities, {
          items: [
            { id: 'source', text: 'Source' },
            { id: 'target', text: 'Target', role: 'resource' },
          ],
          complete: true,
        }),
        createElement(FlowRelations, {
          items: [{ source: 'source', target: 'target', direction: 'forward' }],
          complete: true,
        }),
      ),
    );
    const singleSource = flowSourceFromChildren(
      FlowDiagram,
      createElement(
        Fragment,
        null,
        createElement(FlowEntity, { id: 'source', text: 'Source' }),
        createElement(FlowEntity, { id: 'target', text: 'Target', role: 'resource' }),
        createElement(FlowRelation, { source: 'source', target: 'target', direction: 'forward' }),
      ),
    );

    expect(batchSource).toEqual(singleSource);
  });

  it('展平嵌套的 Group 和 Layout JSX，其根关系与精确的 Direct Source 相同', () => {
    const { FlowDiagram, FlowEntity, FlowGroup, FlowLayout, FlowRelation } = components();

    expect(FlowDiagram).toBeDefined();
    expect(FlowEntity).toBeDefined();
    expect(FlowGroup).toBeDefined();
    expect(FlowLayout).toBeDefined();
    expect(FlowRelation).toBeDefined();

    if (
      FlowDiagram === undefined ||
      FlowEntity === undefined ||
      FlowGroup === undefined ||
      FlowLayout === undefined ||
      FlowRelation === undefined
    )
      return;

    const input = createInputScene(
      createElement(
        FlowDiagram,
        { id: 'architecture', theme: { mode: 'dark' }, defaultFlow: { layout: { nodeGap: 0, rankGap: 48 } } },
        flowChildren(FlowEntity, FlowGroup, FlowLayout, FlowRelation),
      ),
    );
    const normalized = normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });

    expect(normalized.ir.children).toEqual([expectedSource]);
    expect(Object.keys(normalized.ir.children[0]).at(-1)).toBe('children');
  });

  it('标准化 Core 兼容的 Entity 文本块和现有文本布局 props，没有 JSX 子项', () => {
    const { FlowDiagram, FlowEntity } = components();

    expect(FlowDiagram).toBeDefined();
    expect(FlowEntity).toBeDefined();

    if (FlowDiagram === undefined || FlowEntity === undefined) return;

    const input = createInputScene(
      createElement(
        FlowDiagram,
        null,
        createElement(FlowEntity, {
          id: 'form',
          text: ['Frontend form', { text: 'Complete user details', fill: 'gray', font: { size: 'sm' } }],
          layout: { align: 'start', lineHeight: 18, maxTextWidth: 160 },
        }),
      ),
    );
    const normalized = normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });

    expect(normalized.ir.children).toEqual([
      {
        namespace: 'diagram',
        type: 'flow',
        entities: [
          {
            id: 'form',
            text: ['Frontend form', { text: 'Complete user details', fill: 'gray', font: { size: 'sm' } }],
            layout: { align: 'start', lineHeight: 18, maxTextWidth: 160 },
          },
        ],
        children: ['form'],
      },
    ]);
  });

  it('拒绝 Group 内的 Relation 和每个嵌入式独立宿主属性，包括显式 undefined', () => {
    const { FlowDiagram, FlowEntity, FlowGroup, FlowRelation } = components();

    expect(FlowDiagram).toBeDefined();
    expect(FlowEntity).toBeDefined();
    expect(FlowGroup).toBeDefined();
    expect(FlowRelation).toBeDefined();

    if (FlowDiagram === undefined || FlowEntity === undefined || FlowGroup === undefined || FlowRelation === undefined)
      return;

    expect(() =>
      createInputScene(
        createElement(
          FlowDiagram,
          null,
          createElement(FlowGroup, { id: 'group' }, createElement(FlowRelation, { source: 'a', target: 'b' })),
        ),
      ),
    ).toThrowError(expect.objectContaining({ code: 'DIAGRAM_REACT_FLOW_CHILD_INVALID' }));

    expect(() =>
      createInputScene(
        createElement(FlowDiagram, { width: undefined }, createElement(FlowEntity, { id: 'only', text: 'Only' })),
      ),
    ).toThrowError(expect.objectContaining({ code: 'DIAGRAM_REACT_FLOW_HOST_PROPS_INVALID' }));
  });

  it('将 Layout 重用于独立 SSR，而不触发宿主生命周期回调', () => {
    const { FlowDiagram, FlowEntity } = components();

    expect(FlowDiagram).toBeDefined();
    expect(FlowEntity).toBeDefined();

    if (FlowDiagram === undefined || FlowEntity === undefined) return;

    let compileResultCalls = 0;
    const markup = renderToStaticMarkup(
      createElement(
        FlowDiagram,
        {
          width: 240,
          height: 120,
          onCompileResult: () => {
            compileResultCalls += 1;
          },
        },
        createElement(FlowEntity, { id: 'only', text: 'Only' }),
      ),
    );

    expect(markup.match(/<svg/g)).toHaveLength(1);
    expect(markup).toContain('Only');
    expect(compileResultCalls).toBe(0);
  });

  it('从嵌入式 React 编写中生成相同的产物值', () => {
    const { FlowDiagram, FlowEntity } = components();

    expect(FlowDiagram).toBeDefined();
    expect(FlowEntity).toBeDefined();

    if (FlowDiagram === undefined || FlowEntity === undefined) return;

    const input = createInputScene(
      createElement(FlowDiagram, null, createElement(FlowEntity, { id: 'only', text: 'Only' })),
    );
    const result = processToStaticInputResult(input.scene, {
      adapters: synchronousAdapters(input.adapters),
      compile: {
        padding: 0,
        measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
      },
    });
    const artifact = result.artifacts.find(entry => entry.namespace === 'diagram' && entry.type === 'flow');

    expect(artifact?.value).toMatchObject({ elements: [{ id: 'only', kind: 'entity' }] });
  });
});

it('通过 React、Vanilla 和直接 Source 相同地编译弯曲和完整标签', () => {
  const relation = {
    source: 'a',
    target: 'b',
    routing: { kind: 'bend' as const, outAngle: -45 },
    label: {
      text: 'Continue',
      position: 0.25,
      sloped: true,
      interrupt: true,
      gap: 6,
      font: { size: 18 },
      textColor: '#123456',
    },
  };
  const entities = [
    { id: 'a', text: 'A' },
    { id: 'b', text: 'B' },
  ];
  const input = createInputScene(
    <FlowReact.FlowDiagram>
      <FlowReact.FlowEntities items={entities} />
      <FlowReact.FlowRelations items={[relation]} />
    </FlowReact.FlowDiagram>,
  );
  const normalized = normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });
  const vanilla = normalizeFlowDiagram({
    entities,
    children: ['a', 'b'],
    relations: [relation],
  });
  const direct = FlowDiagramSchema.parse({
    namespace: 'diagram',
    type: 'flow',
    entities,
    children: ['a', 'b'],
    relations: [relation],
  });

  expect(FlowDiagramSchema.parse(normalized.ir.children[0])).toEqual(direct);
  expect(FlowDiagramSchema.parse(vanilla)).toEqual(direct);

  const providers = prepareProcessingInput(input.scene, { adapters: synchronousAdapters(input.adapters) }).coreOptions;
  const expected = processToStaticInputResult(
    { type: 'scene', version: 1, children: [direct] },
    { compile: providers },
  ).scene;

  expect(
    processToStaticInputResult({ type: 'scene', version: 1, children: [vanilla] }, { compile: providers }).scene,
  ).toEqual(expected);
  expect(processToStaticInputResult(input.scene, { adapters: synchronousAdapters(input.adapters) }).scene).toEqual(
    expected,
  );
});

it('在所有编写条目中保留自动、显式贝塞尔曲线和平滑路由', () => {
  const relations = [
    {
      source: 'a',
      target: 'b',
      routing: {
        kind: 'smooth' as const,
        points: [
          [40, -50] as [number, number],
          { relative: [20, 0] as [number, number] },
          { id: 'a', anchor: 'right' },
        ],
        tension: 0.8,
      },
    },
    {
      source: 'a',
      target: 'b',
      routing: { kind: 'orthogonal' as const, turnPosition: 0.25 as const, cornerRadius: 8 },
    },
    { source: 'a', target: 'b', routing: { kind: 'curve' as const } },
    {
      source: 'a',
      target: 'b',
      routing: {
        kind: 'cubic' as const,
        control1: [20, -40] as [number, number],
        control2: [120, 60] as [number, number],
      },
    },
  ];
  const input = createInputScene(
    <FlowReact.FlowDiagram>
      <FlowReact.FlowEntity id="a" text="A" />
      <FlowReact.FlowEntity id="b" text="B" />
      <FlowReact.FlowRelations items={relations} />
    </FlowReact.FlowDiagram>,
  );
  const react = normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });
  const vanilla = normalizeFlowDiagram({
    entities: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
    ],
    children: ['a', 'b'],
    relations,
  });
  const direct = FlowDiagramSchema.parse({
    namespace: 'diagram',
    type: 'flow',
    entities: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
    ],
    children: ['a', 'b'],
    relations,
  });

  expect(FlowDiagramSchema.parse(react.ir.children[0])).toEqual(direct);
  expect(FlowDiagramSchema.parse(vanilla)).toEqual(direct);

  const providers = prepareProcessingInput(input.scene, { adapters: synchronousAdapters(input.adapters) }).coreOptions;
  const expected = processToStaticInputResult(
    { type: 'scene', version: 1, children: [direct] },
    { compile: providers },
  ).scene;

  expect(
    processToStaticInputResult({ type: 'scene', version: 1, children: [vanilla] }, { compile: providers }).scene,
  ).toEqual(expected);
  expect(processToStaticInputResult(input.scene, { adapters: synchronousAdapters(input.adapters) }).scene).toEqual(
    expected,
  );
});

it('在 React、Vanilla 和 JSON 上保持端点约束和稀疏默认值相等', () => {
  const entities = [
    { id: 'a', text: 'A' },
    { id: 'b', text: 'B' },
  ];
  const relations = [
    { source: { id: 'a', side: 'right' as const }, target: { id: 'b', overlap: 'separate' as const } },
  ];
  const defaultFlow = { relation: { source: { overlap: 'separate' as const } } };
  const input = createInputScene(
    <FlowReact.FlowDiagram defaultFlow={defaultFlow}>
      <FlowReact.FlowEntities items={entities} />
      <FlowReact.FlowRelations items={relations} />
    </FlowReact.FlowDiagram>,
  );
  const normalized = normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });
  const vanilla = normalizeFlowDiagram({
    entities,
    relations,
    defaultFlow,
    children: ['a', 'b'],
  });
  const direct = FlowDiagramSchema.parse({
    namespace: 'diagram',
    type: 'flow',
    entities,
    relations,
    defaultFlow,
    children: ['a', 'b'],
  });

  expect(FlowDiagramSchema.parse(normalized.ir.children[0])).toEqual(direct);
  expect(FlowDiagramSchema.parse(vanilla)).toEqual(direct);
  expect(direct.relations).toEqual(relations);
});

it('容器等宽与行内填充在 React 和 Vanilla 中保留相同 Source', () => {
  const input = createInputScene(
    <FlowReact.FlowDiagram>
      <FlowReact.FlowLayout id="rows" kind="linear" direction="down" containerWidth="match-largest">
        <FlowReact.FlowLayout id="row" kind="linear" direction="right" itemWidth="fill">
          <FlowReact.FlowEntity id="a" text="A" />
          <FlowReact.FlowEntity id="b" text="B" />
        </FlowReact.FlowLayout>
      </FlowReact.FlowLayout>
      <FlowReact.FlowRelation source="a" target="b" />
    </FlowReact.FlowDiagram>,
  );
  const normalized = normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });
  const vanilla = normalizeFlowDiagram({
    entities: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
    ],
    layouts: [
      { id: 'rows', kind: 'linear', direction: 'down', containerWidth: 'match-largest', children: ['row'] },
      { id: 'row', kind: 'linear', direction: 'right', itemWidth: 'fill', children: ['a', 'b'] },
    ],
    children: ['rows'],
    relations: [{ source: 'a', target: 'b' }],
  });

  expect(FlowDiagramSchema.parse(normalized.ir.children[0])).toEqual(FlowDiagramSchema.parse(vanilla));
});

it('分组等高在 React、Vanilla 和直接 IR 中保持同一 Source', () => {
  const input = createInputScene(
    <FlowReact.FlowDiagram>
      <FlowReact.FlowLayout id="row" kind="linear" direction="right" containerHeight="match-largest">
        <FlowReact.FlowGroup id="g">
          <FlowReact.FlowEntity id="a" text="A" />
        </FlowReact.FlowGroup>
      </FlowReact.FlowLayout>
    </FlowReact.FlowDiagram>,
  );
  const normalized = normalizeScene(input.scene, { adapters: synchronousAdapters(input.adapters) });
  const vanilla = normalizeFlowDiagram({
    entities: [{ id: 'a', text: 'A' }],
    groups: [{ id: 'g', children: ['a'] }],
    layouts: [{ id: 'row', kind: 'linear', direction: 'right', containerHeight: 'match-largest', children: ['g'] }],
    children: ['row'],
  });
  const direct = FlowDiagramSchema.parse({
    namespace: 'diagram',
    type: 'flow',
    entities: [{ id: 'a', text: 'A' }],
    groups: [{ id: 'g', children: ['a'] }],
    layouts: [{ id: 'row', kind: 'linear', direction: 'right', containerHeight: 'match-largest', children: ['g'] }],
    children: ['row'],
  });
  expect(FlowDiagramSchema.parse(normalized.ir.children[0])).toEqual(direct);
  expect(FlowDiagramSchema.parse(vanilla)).toEqual(direct);
});
