import type { CompileWarning } from '@retikz/core';

import {
  compileToScene,
  resolveCoreProviderDependencies,
  resolveDefaultCoreThemeColors,
  ThemeMode,
} from '@retikz/core';
import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';
import { pathPrimitivesOf, primitivesOf } from './test-utils';

const theme = {
  mode: ThemeMode.Light,
  colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
} as const;

const relation = (input: Record<string, unknown> = {}) =>
  Graph.RelationSchema.parse({
    namespace: 'graph',
    type: 'relation',
    source: { id: 'source' },
    target: { id: 'target' },
    role: 'dependency',
    ...input,
  });

const lower = (source: Graph.IRGraphRelation) => {
  const options = Graph.resolveGraphDefinitionOptions();
  const canonical = Graph.resolveRelation(source, options);
  return Graph.lowerRelation(
    canonical,
    Graph.resolveRelationStructure(canonical, { ...options, theme }),
    Graph.resolveRelationAppearance(canonical, { ...options, theme }),
  );
};

describe('Relation lowering', () => {
  it.each(['fill', 'fillOpacity', 'fillRule'])('style 分组继续禁止 %s', field => {
    expect(
      Graph.RelationSchema.safeParse({
        namespace: 'graph',
        type: 'relation',
        role: 'association',
        source: { id: 'a' },
        target: { id: 'b' },
        style: { [field]: field === 'fillOpacity' ? 0.5 : field === 'fillRule' ? 'evenodd' : 'red' },
      }).success,
    ).toBe(false);
  });

  it('creates a direct source-to-target route when route is omitted and preserves omitted id', () => {
    const source = relation({
      source: { id: 'source', anchor: 'east', offset: [1, 0] },
      target: { id: 'target', anchor: 'west' },
    });

    expect(lower(source)).toMatchObject({
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: source.source },
        { type: 'step', kind: 'line', to: source.target },
      ],
    });
    expect(lower(source)).not.toHaveProperty('id');
  });

  it('does not pass the Graph-only Relation group to the lowered Core Path', () => {
    const lowered = lower(relation({ group: 'forward' }));

    expect(lowered).not.toHaveProperty('group');
  });

  it('preserves an explicit route and every inherited Core Path instance field', () => {
    const route = [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [100, 0] },
    ] as const;
    const lowered = lower(
      relation({
        id: 'request',
        route,
        roundedCorners: 4,
        rotate: 10,
        scale: { x: 1.2, y: 0.8 },
        zIndex: 2,
        animations: [],
        meta: { source: 'author' },
        style: {
          color: '#334155',
          stroke: '#475569',
          strokeWidth: 2,
          strokeOpacity: 0.7,
          opacity: 0.9,
          shadow: 'sm',
          blendMode: 'multiply',
          dashPattern: [6, 2],
          dashOffset: -1,
          lineCap: 'round',
          lineJoin: 'bevel',
        },
      }),
    );

    expect(lowered).toMatchObject({
      id: 'request',
      children: route,
      roundedCorners: 4,
      rotate: 10,
      scale: { x: 1.2, y: 0.8 },
      zIndex: 2,
      animations: [],
      meta: { source: 'author' },
      style: {
        color: '#334155',
        stroke: '#475569',
        strokeWidth: 2,
        strokeOpacity: 0.7,
        opacity: 0.9,
        shadow: 'sm',
        blendMode: 'multiply',
        dashPattern: [6, 2],
        dashOffset: -1,
        lineCap: 'round',
        lineJoin: 'bevel',
      },
    });
  });

  it('uses Relation label appearance as defaults and lets each label override exact fields', () => {
    const lowered = lower(
      relation({
        labelTextForeground: '#334155',
        labelFont: { family: 'Inter', size: 14 },
        labelOpacity: 0.8,
        labels: [
          { text: 'default', position: 0.25 },
          {
            text: 'precise',
            position: 0.75,
            textColor: '#dc2626',
            font: { weight: 'bold' },
            opacity: 0.4,
          },
        ],
      }),
    );

    expect(lowered.label).toEqual([
      {
        text: 'default',
        position: 0.25,
        textColor: '#334155',
        font: { family: 'Inter', size: 14 },
        opacity: 0.8,
      },
      {
        text: 'precise',
        position: 0.75,
        textColor: '#dc2626',
        font: { family: 'Inter', size: 14, weight: 'bold' },
        opacity: 0.4,
      },
    ]);
  });

  it.each([
    {
      name: 'UML association',
      source: { role: 'association', kind: 'uml.association' },
      expected: {},
    },
    {
      name: 'aggregation',
      source: { role: 'association', kind: 'uml.aggregation' },
      expected: { marks: [{ pos: 0, mark: { kind: 'arrow', shape: 'openDiamond' } }] },
    },
    {
      name: 'composition',
      source: { role: 'association', kind: 'uml.composition' },
      expected: { marks: [{ pos: 0, mark: { kind: 'arrow', shape: 'diamond' } }] },
    },
    {
      name: 'generalization',
      source: { role: 'generalization' },
      expected: { marks: [{ pos: 1, mark: { kind: 'arrow', shape: 'normal' } }] },
    },
    {
      name: 'UML generalization',
      source: { role: 'generalization', kind: 'uml.generalization' },
      expected: { marks: [{ pos: 1, mark: { kind: 'arrow', shape: 'open' } }] },
    },
    {
      name: 'dependency',
      source: { role: 'dependency' },
      expected: { marks: [{ pos: 1, mark: { kind: 'arrow', shape: 'straightBarb' } }] },
    },
    {
      name: 'UML dependency',
      source: { role: 'dependency', kind: 'uml.dependency' },
      expected: { marks: [{ pos: 1, mark: { kind: 'arrow', shape: 'straightBarb' } }], style: { dashPattern: [6, 4] } },
    },
    {
      name: 'realization',
      source: { role: 'dependency', kind: 'uml.realization' },
      expected: { marks: [{ pos: 1, mark: { kind: 'arrow', shape: 'open' } }], style: { dashPattern: [6, 4] } },
    },
  ])('lowers UML $name to its path and endpoint structure', ({ source, expected }) => {
    const loweredRelation = lower(relation(source));

    expect(loweredRelation).toMatchObject(expected);
    if (source.kind === undefined && source.role === 'dependency') {
      expect(loweredRelation).not.toHaveProperty('style.dashPattern');
    }
    if (source.kind === 'uml.association') {
      expect(loweredRelation).not.toHaveProperty('marks');
      expect(loweredRelation).not.toHaveProperty('style.dashPattern');
    }
  });

  it('compiles a direct Relation between a Core Node and Scope target', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [Graph.RelationProviderKey], providers: Graph.createGraphProviders() }],
    });
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          { type: 'node', id: 'source', position: [0, 0], text: 'source' },
          {
            type: 'scope',
            id: 'target',
            children: [{ type: 'node', position: [100, 0], text: 'target' }],
          },
          relation({
            id: 'edge',
            target: { id: 'target', anchor: 'left' },
            labels: [{ text: 'depends on' }],
          }),
        ],
      },
      { ...definitions, padding: 0 },
    );

    const relationPath = pathPrimitivesOf(output.scene.primitives).find(path => path.id === 'edge');
    expect(relationPath?.arrowEnd?.shape).toBe('straightBarb');
    expect(
      primitivesOf(output.scene.primitives).some(
        primitive => primitive.type === 'text' && primitive.lines.some(line => line.text === 'depends on'),
      ),
    ).toBe(true);
  });

  it('applies the Graph preset font size and color to an unstyled Relation label', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [Graph.RelationProviderKey], providers: Graph.createGraphProviders() }],
    });
    const output = compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [
          { type: 'node', id: 'source', position: [0, 0] },
          { type: 'node', id: 'target', position: [100, 0] },
          relation({ role: 'association', direction: 'none', labels: [{ text: 'default label' }] }),
        ],
      },
      { ...definitions, padding: 0 },
    );
    const label = primitivesOf(output.scene.primitives).find(
      primitive => primitive.type === 'text' && primitive.lines.some(line => line.text === 'default label'),
    );

    expect(label).toMatchObject({ type: 'text', fill: 'gray', fontSize: 14 });
  });

  it.each([
    { status: 'error', color: theme.colors.semantic.error, structureDashPattern: false, dashPattern: undefined },
    { status: 'success', color: theme.colors.semantic.success, structureDashPattern: false, dashPattern: undefined },
    { status: 'warning', color: theme.colors.semantic.warning, structureDashPattern: false, dashPattern: undefined },
    { status: 'disabled', color: theme.colors.semantic.guide, structureDashPattern: [6, 4], dashPattern: [6, 4] },
  ] as const)(
    'resolves the Neutral $status status to Core semantic colors for the Relation path and markers',
    ({ status, color, structureDashPattern, dashPattern }) => {
      const options = Graph.resolveGraphDefinitionOptions();
      const canonical = Graph.resolveRelation(relation({ status }), options);
      const structure = Graph.resolveRelationStructure(canonical, { ...options, theme });
      const appearance = Graph.resolveRelationAppearance(canonical, { ...options, theme });

      expect(appearance).toMatchObject({
        style: { color, stroke: color },
        sourceMarker: { color },
        targetMarker: { color },
      });
      expect(structure.dashPattern).toEqual(structureDashPattern);
      const lowered = lower(relation({ status }));

      expect(lowered.style?.dashPattern).toEqual(dashPattern);
      expect(lowered).not.toHaveProperty('status');
    },
  );

  it('keeps an authored dash pattern above a matching Relation rule structure', () => {
    const options = Graph.resolveGraphDefinitionOptions();
    const canonical = Graph.resolveRelation(relation({ status: 'disabled', style: { dashPattern: [2, 1] } }), options);

    expect(Graph.resolveRelationStructure(canonical, { ...options, theme }).dashPattern).toEqual([6, 4]);
    expect(lower(relation({ status: 'disabled', style: { dashPattern: [2, 1] } })).style?.dashPattern).toEqual([2, 1]);
  });

  it('lets authored Relation and endpoint appearance override the status Theme without removing status', () => {
    const options = Graph.resolveGraphDefinitionOptions();
    const canonical = Graph.resolveRelation(
      relation({
        status: 'warning',
        sourceMarker: { color: '#0f766e' },
        targetMarker: { color: '#b45309' },
        style: { color: '#7c3aed' },
      }),
      options,
    );

    expect(canonical.source).toMatchObject({ status: 'warning' });
    expect(Graph.resolveRelationAppearance(canonical, { ...options, theme })).toMatchObject({
      style: { color: '#7c3aed', stroke: '#7c3aed' },
      sourceMarker: { color: '#0f766e' },
      targetMarker: { color: '#b45309' },
    });
  });

  it('delegates an unresolved target to the Core reference diagnostic', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [{ roots: [Graph.RelationProviderKey], providers: Graph.createGraphProviders() }],
    });

    const warnings: Array<CompileWarning> = [];
    compileToScene(
      {
        type: 'scene',
        version: 1,
        children: [{ type: 'node', id: 'source', position: [0, 0] }, relation({ target: { id: 'missing' } })],
      },
      { ...definitions, padding: 0, onWarn: warning => warnings.push(warning) },
    );

    expect(warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("undefined node id 'missing'") }),
      ]),
    );
  });
});
