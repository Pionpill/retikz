import { normalizeFlowDiagram } from '@retikz/diagram-vanilla/flow';
import { FlowDiagramSchema } from '@retikz/diagram/flow';
import { createInputScene } from '@retikz/react';
import { normalizeScene, processToStaticInputResult } from '@retikz/vanilla';
import type { FC, ReactNode } from 'react';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import * as FlowReact from '../src/flow';

it('preserves local Layout exclusion through React and Vanilla equally', () => {
  const input = createInputScene(
    <FlowReact.FlowDiagram>
      <FlowReact.FlowLayout id="row" kind="linear" direction="right" excludeFromBounds={['png']}>
        <FlowReact.FlowEntities items={['canvas', 'png']} />
      </FlowReact.FlowLayout>
    </FlowReact.FlowDiagram>,
  );
  const normalized = normalizeScene(input.scene, { adapters: input.adapters });
  const vanilla = normalizeFlowDiagram({
    entities: [
      { id: 'canvas', text: 'canvas' },
      { id: 'png', text: 'png' },
    ],
    groups: [],
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
  const normalized = normalizeScene(input.scene, { adapters: input.adapters });
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
  flowDefaults: { layout: { nodeGap: 0, rankGap: 48 } },
};

describe('@retikz/diagram-react/flow', () => {
  it.each(['-|', '|-'] as const)('renders %s with the same Source as Vanilla and direct IR', kind => {
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
      groups: [],
      layouts: [],
      children: ['a', 'b'],
      relations: [relation],
    });
    expect(normalizeScene(input.scene, { adapters: input.adapters }).ir.children[0]).toEqual(vanilla);
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
  ])(
    'preserves $form Grid placements through typed React, Vanilla and direct Source inside a Group',
    ({ placements }) => {
      const grid = {
        kind: 'grid' as const,
        id: 'grid',
        rowGap: 0,
        columnGap: 24,
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
      const react = normalizeScene(input.scene, { adapters: input.adapters }).ir.children[0];
      expect(react).toEqual(direct);
      expect(normalizeFlowDiagram(source)).toEqual(direct);
      const result = processToStaticInputResult(input.scene, {
        adapters: input.adapters,
        compile: { measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }) },
      });
      expect(JSON.stringify(result)).toContain('A');
    },
  );
  it('preserves Source-shaped defaults and instance paths through typed React and Vanilla authoring', () => {
    const props = {
      presentation: { title: { text: 'Pipeline', style: { font: { size: 21 } } } },
      diagramDefaults: { presentation: { title: { style: { opacity: 0.8 } } } },
      flowDefaults: { entity: { layout: { maxTextWidth: 180 } }, relation: { labelFont: { size: 11 } } },
      graphRules: [{ type: 'entity' as const, selector: { role: 'concept' }, style: { color: 'dodgerblue' } }],
    } satisfies FlowReact.FlowDiagramProps;
    const entity = { id: 'node', text: 'Node', layout: { lineHeight: 18 } };
    const relation = { source: 'node', target: 'node', group: 'forward' };
    const direct = FlowDiagramSchema.parse({
      namespace: 'diagram',
      type: 'flow',
      ...props,
      entities: [entity],
      groups: [],
      layouts: [],
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
    const react = normalizeScene(input.scene, { adapters: input.adapters }).ir.children[0];
    const vanilla = normalizeFlowDiagram({
      ...props,
      entities: [entity],
      groups: [],
      layouts: [],
      children: ['node'],
      relations: [relation],
    });
    expect(react).toEqual(direct);
    expect(vanilla).toEqual(direct);
  });

  it('exports the supported Flow root, single and batch JSX markers', () => {
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

  it('expands batch Entity and Relation forms in mixed JSX order', () => {
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
      groups: [],
      layouts: [],
      children: ['first', 'second', 'third', 'fourth'],
      relations: [
        { source: 'first', target: 'second' },
        { source: 'second', target: 'third', label: 'Next' },
        { source: 'third', target: 'fourth' },
      ],
    });
  });

  it.each(['entities', 'relations'] as const)(
    'rejects a complete %s marker beside any same-owner declaration',
    declarationKind => {
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
    },
  );

  it('scopes complete Entity lists to their direct Flow, Group, or Layout owner', () => {
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

  it('keeps duplicate ids in additive collectors on the existing Flow diagnostic path', () => {
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
        adapters: input.adapters,
        compile: { measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }) },
      }),
    ).toThrowError(
      expect.objectContaining({
        code: 'CORE_LAYOUT_PROBE_RECOVERABLE',
        cause: expect.objectContaining({ code: 'DIAGRAM_FLOW_DUPLICATE_ID' }),
      }),
    );
  });

  it('expands batch Entities inside Group and Layout owners', () => {
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

  it.each(['group', 'layout'] as const)('rejects batch Relations inside a %s owner', ownerKind => {
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

  it('treats empty batch markers as no operations', () => {
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
      groups: [],
      layouts: [],
      children: ['only'],
    });
  });

  it('produces the same Source from batch and single markers', () => {
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

  it('flattens nested Group and Layout JSX with root relations to the exact Direct Source', () => {
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
        { id: 'architecture', theme: { mode: 'dark' }, flowDefaults: { layout: { nodeGap: 0, rankGap: 48 } } },
        flowChildren(FlowEntity, FlowGroup, FlowLayout, FlowRelation),
      ),
    );
    const normalized = normalizeScene(input.scene, { adapters: input.adapters });

    expect(normalized.ir.children).toEqual([expectedSource]);
    expect(Object.keys(normalized.ir.children[0]).at(-1)).toBe('children');
  });

  it('normalizes a Core-compatible Entity text block and existing text layout props without JSX children', () => {
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
    const normalized = normalizeScene(input.scene, { adapters: input.adapters });

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
        groups: [],
        layouts: [],
        children: ['form'],
      },
    ]);
  });

  it('rejects Relation inside Group and every embedded standalone host prop including explicit undefined', () => {
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

  it('reuses Layout for standalone SSR without firing host lifecycle callbacks', () => {
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

  it('produces the same artifact value from embedded React authoring', () => {
    const { FlowDiagram, FlowEntity } = components();
    expect(FlowDiagram).toBeDefined();
    expect(FlowEntity).toBeDefined();
    if (FlowDiagram === undefined || FlowEntity === undefined) return;

    const input = createInputScene(
      createElement(FlowDiagram, null, createElement(FlowEntity, { id: 'only', text: 'Only' })),
    );
    const result = processToStaticInputResult(input.scene, {
      adapters: input.adapters,
      compile: {
        padding: 0,
        measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
      },
    });
    const artifact = result.artifacts.find(
      entry => entry.kind === 'composite' && entry.namespace === 'diagram' && entry.type === 'flow',
    );

    expect(artifact?.value).toMatchObject({ elements: [{ id: 'only', kind: 'entity' }] });
  });
});
