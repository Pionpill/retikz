import type { ZodType } from 'zod';

import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

const publicSchema = (name: string): ZodType => {
  const schema = (Graph as Record<string, unknown>)[name];
  expect(schema, `missing public schema ${name}`).toBeDefined();
  return schema as ZodType;
};

const entity = {
  namespace: 'graph',
  type: 'entity',
  id: 'service',
  role: 'participant',
  kind: 'architecture.service',
  predicate: { name: 'deployment', params: { replicas: 2 } },
  position: [20, 30],
  text: 'API',
  minimumSize: { width: 72, height: 36 },
  zIndex: 1,
  meta: { source: 'catalog' },
} as const;

const relation = {
  namespace: 'graph',
  type: 'relation',
  source: { id: 'service', anchor: { side: 'right', fraction: 0.5 }, offset: [2, -1], boundary: 'shape' },
  target: { id: 'database', anchor: 'west' },
  role: 'dependency',
  kind: 'architecture.runtime',
  predicate: { name: 'traffic', params: { protocol: 'https' } },
  direction: 'forward',
  labels: [{ text: 'reads', position: 'midway', side: 'top' }],
  route: [
    { type: 'step', kind: 'move', to: { id: 'service' } },
    { type: 'step', kind: 'line', to: { id: 'database' } },
  ],
  roundedCorners: 4,
  zIndex: 2,
  meta: { source: 'catalog' },
} as const;

const graph = {
  namespace: 'graph',
  type: 'graph',
  id: 'architecture',
  theme: { mode: 'dark' },
  graphTheme: {
    rules: [{ type: 'entity', selector: { role: 'participant' }, appearance: { fill: '#eef6ff' } }],
  },
  localNamespace: true,
  transforms: [{ kind: 'translate', x: 10, y: 20 }],
  placement: { target: [30, 40], selfAnchor: 'center' },
  fill: 'lightblue',
  opacity: 0.8,
  nodeDefault: { fill: 'white' },
  pathDefault: { stroke: 'green' },
  labelDefault: { font: { size: 10 } },
  arrowDefault: { shape: 'stealth', scale: 1.5 },
  resetStyle: ['path'],
  zIndex: 2,
  clip: { kind: 'rect', x: 0, y: 0, width: 220, height: 120 },
  boundingShape: 'circle',
  animations: [],
  children: [
    entity,
    { namespace: 'graph', type: 'entity', id: 'database', role: 'resource', position: [160, 30] },
    relation,
    { type: 'scope', children: [{ type: 'node', position: [0, 0], text: 'Legend' }] },
  ],
  meta: { source: 'architecture-catalog' },
} as const;

describe('Graph Source data assembly', () => {
  it('round-trips one strict Graph whose members directly own lower-facing fields', () => {
    const parsed = publicSchema('GraphSchema').parse(graph);

    expect(JSON.parse(JSON.stringify(parsed))).toEqual(graph);
    expect(() => publicSchema('GraphSchema').parse({ ...graph, presentation: {} })).toThrow();
    expect(() => publicSchema('GraphSchema').parse({ ...graph, geometry: {} })).toThrow();
    expect(() => publicSchema('GraphSchema').parse({ ...graph, registry: {} })).toThrow();
    expect(() => publicSchema('GraphSchema').parse({ ...graph, meta: { invalid: () => 'not JSON' } })).toThrow();
  });

  it('uses the complete Core child grammar without Graph-owned duplicate prevalidation', () => {
    const duplicate = { type: 'node', id: 'service', position: [240, 30] } as const;
    const thirdParty = { namespace: 'custom', type: 'badge', payload: { text: 'external' } } as const;
    const parsed = publicSchema('GraphSchema').parse({
      ...graph,
      children: [...graph.children, duplicate, thirdParty],
    }) as typeof graph;

    expect(parsed.children.at(-2)).toEqual(duplicate);
    expect(parsed.children.at(-1)).toEqual(thirdParty);
  });

  it('keeps Core Theme and Graph-local rules in disjoint fields', () => {
    const schema = publicSchema('GraphSchema');

    expect(schema.parse(graph)).toMatchObject({ theme: { mode: 'dark' }, graphTheme: graph.graphTheme });
    expect(() => schema.parse({ ...graph, theme: graph.graphTheme, graphTheme: undefined })).toThrow();
    expect(() => schema.parse({ ...graph, theme: undefined, graphTheme: { mode: 'dark' } })).toThrow();
  });

  it('strictly rejects the removed Variant fields in Source and Theme selectors', () => {
    expect(() => publicSchema('GraphSchema').parse({ ...graph, entityVariant: 'fill' })).toThrow();
    expect(() => publicSchema('EntitySchema').parse({ ...entity, variant: 'mixed' })).toThrow();
    expect(() => publicSchema('RelationSchema').parse({ ...relation, variant: 'default' })).toThrow();
    expect(() =>
      publicSchema('GraphEntityThemeSelectorSchema').parse({ role: 'participant', variant: 'fill' }),
    ).toThrow();
    expect(() =>
      publicSchema('GraphRelationThemeSelectorSchema').parse({ role: 'dependency', variant: 'default' }),
    ).toThrow();
  });

  it('accepts the non-structural Core Node surface while rejecting role-owned structure', () => {
    const schema = publicSchema('EntitySchema');
    const nonStructuralEntity = {
      ...entity,
      color: '#334155',
      fill: '#e2e8f0',
      stroke: '#475569',
      strokeWidth: 2,
      dashed: true,
      dotted: false,
      dashPattern: [6, 2],
      dashOffset: -1,
      textColor: '#0f172a',
      fillOpacity: 0.8,
      strokeOpacity: 0.7,
      opacity: 0.9,
      shadow: 'sm',
      blendMode: 'multiply',
    } as const;

    expect(schema.parse(nonStructuralEntity)).toEqual(nonStructuralEntity);
    expect(() => schema.parse({ ...entity, shape: 'rectangle' })).toThrow();
    expect(() => schema.parse({ ...entity, boundary: 'rectangle' })).toThrow();
    expect(() => schema.parse({ ...entity, padding: 8 })).toThrow();
    expect(() => schema.parse({ ...entity, cornerRadius: 8 })).toThrow();
  });

  it('rejects removed Entity ports and reuses the complete Core NodeTarget endpoint', () => {
    const entitySchema = publicSchema('EntitySchema');
    const relationSchema = publicSchema('RelationSchema');

    expect(() => entitySchema.parse({ ...entity, ports: [{ id: 'api' }] })).toThrow();
    expect(relationSchema.parse(relation)).toMatchObject({ source: relation.source, target: relation.target });
    expect(() => relationSchema.parse({ ...relation, source: { entity: 'service' } })).toThrow();
  });

  it('reuses the non-conflicting Core Path surface and full Geometry Labels', () => {
    const schema = publicSchema('RelationSchema');
    const pathCompatibleRelation = {
      ...relation,
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
      rotate: 10,
      scale: { x: 1.2, y: 0.8 },
      animations: [],
      labels: [
        { text: 'reads', position: 'midway', side: 'top' },
        {
          text: 'precise',
          position: 0.75,
          textColor: '#ffffff',
          opacity: 0.6,
          font: { size: 14, weight: 'bold' },
        },
      ],
    } as const;

    expect(schema.parse(pathCompatibleRelation)).toEqual(pathCompatibleRelation);
    expect(() => schema.parse({ ...relation, children: relation.route })).toThrow();
    expect(() => schema.parse({ ...relation, kindOptions: {} })).toThrow();
    expect(() => schema.parse({ ...relation, fill: '#fff' })).toThrow();
    expect(() => schema.parse({ ...relation, fillOpacity: 0.5 })).toThrow();
    expect(() => schema.parse({ ...relation, fillRule: 'evenodd' })).toThrow();
    expect(() => schema.parse({ ...relation, marks: [] })).toThrow();
    expect(() =>
      schema.parse({
        ...relation,
        route: [relation.route[0], { ...relation.route[1], label: { text: 'hidden style' } }],
      }),
    ).toThrow();
  });

  it('keeps Relation structure separate from Theme-owned appearance', () => {
    const relationRole = publicSchema('GraphRelationRoleTokenRecipeSchema');
    const relationStructure = publicSchema('GraphRelationStructureTokenOverridesSchema');
    const relationAppearance = publicSchema('GraphRelationAppearanceTokenOverridesSchema');

    expect(relationRole.parse({ sourceMarker: false, targetMarker: { shape: 'kite' }, dashPattern: false })).toEqual({
      sourceMarker: false,
      targetMarker: { shape: 'kite' },
      dashPattern: false,
    });
    expect(relationStructure.parse({ targetMarker: { shape: 'openKite' } })).toEqual({
      targetMarker: { shape: 'openKite' },
    });
    expect(relationAppearance.parse({ opacity: 0.8, targetMarker: { fill: 'currentColor' } })).toEqual({
      opacity: 0.8,
      targetMarker: { fill: 'currentColor' },
    });
    expect(() =>
      relationRole.parse({ sourceMarker: false, targetMarker: false, dashPattern: false, appearance: {} }),
    ).toThrow();
    expect(() => relationAppearance.parse({ dashPattern: [4, 2] })).toThrow();
  });

  it('allows Graph semantic composites wherever Core children are valid', () => {
    const parsed = publicSchema('GraphSchema').parse({
      namespace: 'graph',
      type: 'graph',
      children: [{ type: 'scope', children: [entity, relation] }],
    });

    expect(parsed).toEqual({
      namespace: 'graph',
      type: 'graph',
      children: [{ type: 'scope', children: [entity, relation] }],
    });
  });
});
