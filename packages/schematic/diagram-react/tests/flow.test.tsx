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
  FlowEntity: componentExport('FlowEntity'),
  FlowGroup: componentExport('FlowGroup'),
  FlowLayout: componentExport('FlowLayout'),
  FlowRelation: componentExport('FlowRelation'),
});

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
  it('exports the supported Flow root, Entity, Group, Layout and Relation JSX markers', () => {
    const exported = components();
    expect(exported.FlowDiagram).toBeDefined();
    expect(exported.FlowEntity).toBeDefined();
    expect(exported.FlowGroup).toBeDefined();
    expect(exported.FlowLayout).toBeDefined();
    expect(exported.FlowRelation).toBeDefined();
    expect(componentExport('FlowBlock')).toBeUndefined();
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
