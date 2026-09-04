import type { FC, ReactNode } from 'react';

import { createInputScene } from '@retikz/react';
import { normalizeScene, processToStaticInputResult } from '@retikz/vanilla';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import * as FlowReact from '../src/flow';

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
      { id: 'client', label: 'Client' },
      createElement(
        FlowLayout,
        { id: 'frontend', direction: 'down' },
        createElement(FlowEntity, { id: 'jsx', text: 'JSX', status: 'success', rank: 0 }),
      ),
    ),
    createElement(FlowEntity, { id: 'kernel', text: ['Kernel', 'IR compiler'] }),
    createElement(FlowRelation, {
      source: 'jsx',
      target: 'kernel',
      label: 'normalize',
      status: 'warning',
      layout: { routing: { kind: 'orthogonal', cornerRadius: 0 } },
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
  groups: [{ id: 'client', label: 'Client', children: ['frontend'] }],
  layouts: [{ id: 'frontend', direction: 'down', children: ['jsx'] }],
  children: ['client', 'kernel'],
  relations: [
    {
      source: 'jsx',
      target: 'kernel',
      label: 'normalize',
      status: 'warning',
      layout: { routing: { kind: 'orthogonal', cornerRadius: 0 } },
    },
  ],
  flowTheme: { layout: { nodeGap: 0, rankGap: 48 } },
};

describe('@retikz/diagram-react/flow', () => {
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
            { id: 'layout', direction: 'right' },
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
      layouts: [{ id: 'layout', direction: 'right', children: ['layout-entity'] }],
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
          { id: 'row', direction: 'right' },
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
      layouts: [{ id: 'row', direction: 'right', children: ['layout-a', 'layout-b'] }],
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
        : createElement(FlowLayout, { id: 'owner', direction: 'right' }, nestedRelations);

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
        { id: 'architecture', theme: { mode: 'dark' }, flowTheme: { layout: { nodeGap: 0, rankGap: 48 } } },
        flowChildren(FlowEntity, FlowGroup, FlowLayout, FlowRelation),
      ),
    );
    const normalized = normalizeScene(input.scene, { adapters: input.adapters });

    expect(normalized.ir.children).toEqual([expectedSource]);
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
          style: { align: 'start', lineHeight: 18, maxTextWidth: 160 },
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
            style: { align: 'start', lineHeight: 18, maxTextWidth: 160 },
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
