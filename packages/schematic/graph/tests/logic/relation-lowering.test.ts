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
    Graph.resolveRelationStructure(canonical),
    Graph.resolveRelationAppearance(canonical, { ...options, theme }),
  );
};

describe('Relation lowering', () => {
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

  it('preserves an explicit route and every inherited Core Path instance field', () => {
    const route = [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [100, 0] },
    ] as const;
    const lowered = lower(
      relation({
        id: 'request',
        route,
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
        roundedCorners: 4,
        rotate: 10,
        scale: { x: 1.2, y: 0.8 },
        zIndex: 2,
        animations: [],
        meta: { source: 'author' },
      }),
    );

    expect(lowered).toMatchObject({
      id: 'request',
      children: route,
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
      roundedCorners: 4,
      rotate: 10,
      scale: { x: 1.2, y: 0.8 },
      zIndex: 2,
      animations: [],
      meta: { source: 'author' },
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
