import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';
import { primitivesOf } from './test-utils';

const compileGraph = (source: unknown) => {
  const graph = Graph.GraphSchema.parse(source);
  const definitions = resolveCoreProviderDependencies({
    contributions: [{ roots: [Graph.GraphProviderKey], providers: Graph.createGraphProviders() }],
  });

  return compileToScene({ type: 'scene', version: 1, children: [graph] }, { ...definitions, padding: 0 });
};

const fillsOf = (output: ReturnType<typeof compileGraph>): Array<unknown> =>
  primitivesOf(output.scene.primitives).flatMap(primitive => ('fill' in primitive ? [primitive.fill] : []));

describe('Graph defaults and rules Source fragments', () => {
  it.each([{}, { entity: { style: { font: {} }, layout: {} } }])(
    'keeps Core Node font defaults effective when Graph contributes no font values',
    graphDefaults => {
      const output = compileGraph({
        namespace: 'graph',
        type: 'graph',
        defaults: { node: { style: { font: { family: 'monospace', size: 31, weight: 700 } } } },
        graphDefaults,
        children: [{ namespace: 'graph', type: 'entity', role: 'activity', position: [0, 0], text: 'Inherited' }],
      });
      const text = primitivesOf(output.scene.primitives).find(primitive => primitive.type === 'text');
      expect(text).toMatchObject({ fontFamily: 'monospace', fontSize: 31, fontWeight: 700 });
    },
  );

  it('does not materialize absent fonts or markers from empty defaults groups', () => {
    const defaults = Graph.mergeGraphDefaults(undefined, {
      entity: { style: { font: {} }, layout: {} },
      relation: { style: {}, labelFont: {}, sourceMarker: {}, targetMarker: {} },
    });
    expect(defaults?.entity).toEqual({});
    expect(defaults?.relation).toEqual({});
  });

  it('ignores empty Node fonts and replaces nonempty fonts while completing label fonts by field', () => {
    const project = (font: Record<string, unknown>) => {
      const source = Graph.GraphSchema.parse({
        namespace: 'graph',
        type: 'graph',
        graphDefaults: {
          entity: { style: { font: { family: 'serif', weight: 700 } } },
          relation: { labelFont: { family: 'serif', weight: 700 } },
        },
        children: [
          { namespace: 'graph', type: 'entity', id: 'a', role: 'activity', position: [0, 0], style: { font } },
          {
            namespace: 'graph',
            type: 'relation',
            role: 'dependency',
            source: { id: 'a' },
            target: { id: 'b' },
            labelFont: font,
          },
        ],
      });
      return Graph.resolveGraph(source, Graph.resolveGraphDefinitionOptions());
    };
    expect(project({})[0]).toMatchObject({ style: { font: { family: 'serif', weight: 700 } } });
    expect(
      Graph.mergeGraphDefaults(
        { entity: { style: { font: { family: 'serif', weight: 700 } } } },
        { entity: { style: { font: { size: undefined } } } },
      ),
    ).toMatchObject({ entity: { style: { font: { family: 'serif', weight: 700 } } } });
    const replaced = project({ size: 20 });
    expect(Graph.EntitySchema.parse(replaced[0]).style?.font).toEqual({ size: 20 });
    expect(replaced[1]).toMatchObject({ labelFont: { family: 'serif', weight: 700, size: 20 } });
  });

  it('accepts source-shaped Graph defaults and ordered rules and preserves their JSON form', () => {
    const source = {
      namespace: 'graph',
      type: 'graph',
      graphDefaults: {
        entity: {
          style: { color: '#2563eb', font: { size: 14 } },
          layout: { align: 'middle', minimumSize: { width: 100 } },
        },
        relation: { style: { strokeWidth: 2 }, labelFont: { size: 12 } },
        group: { border: { stroke: '#64748b' } },
        block: { cornerRadius: 6 },
      },
      graphRules: [{ type: 'entity', selector: { status: 'error' }, style: { color: '#dc2626' } }],
      children: [],
    };

    const parsed = Graph.GraphSchema.parse(source);

    expect(parsed).toEqual(source);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(source);
  });

  it('rejects the removed graphTheme root with an exact unknown-key issue', () => {
    const result = Graph.GraphSchema.safeParse({
      namespace: 'graph',
      type: 'graph',
      graphTheme: { rules: [{ type: 'entity', appearance: { color: '#dc2626' } }] },
      children: [],
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unrecognized_keys',
          path: [],
          keys: expect.arrayContaining(['graphTheme']),
        }),
      ]),
    );
  });

  it('rejects the removed appearance rule field at the graphRules item path', () => {
    const result = Graph.GraphSchema.safeParse({
      namespace: 'graph',
      type: 'graph',
      graphRules: [{ type: 'entity', selector: { status: 'error' }, appearance: { color: '#dc2626' } }],
      children: [],
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unrecognized_keys',
          path: ['graphRules', 0],
          keys: expect.arrayContaining(['appearance']),
        }),
      ]),
    );
  });

  it.each([
    {
      name: 'Entity padding in style',
      source: {
        namespace: 'graph',
        type: 'graph',
        graphDefaults: { entity: { style: { padding: 4 } } },
        children: [],
      },
      path: ['graphDefaults', 'entity', 'style'],
      key: 'padding',
    },
    {
      name: 'Relation fill in style',
      source: {
        namespace: 'graph',
        type: 'graph',
        graphDefaults: { relation: { style: { fill: '#ffffff' } } },
        children: [],
      },
      path: ['graphDefaults', 'relation', 'style'],
      key: 'fill',
    },
    {
      name: 'Entity rule layout',
      source: {
        namespace: 'graph',
        type: 'graph',
        graphRules: [{ type: 'entity', layout: { align: 'middle' }, style: { color: '#2563eb' } }],
        children: [],
      },
      path: ['graphRules', 0],
      key: 'layout',
    },
  ])('rejects $name and points to the offending field', ({ source, path, key }) => {
    const result = Graph.GraphSchema.safeParse(source);

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unrecognized_keys',
          path,
          keys: expect.arrayContaining([key]),
        }),
      ]),
    );
  });

  it('applies Graph defaults before rules and keeps explicit Entity style highest across a themed Scope', () => {
    const createSource = (entity: Record<string, unknown>) => ({
      namespace: 'graph',
      type: 'graph',
      graphDefaults: { entity: { style: { fill: '#111111' } } },
      graphRules: [{ type: 'entity', selector: { status: 'error' }, style: { fill: '#ff0000' } }],
      children: [
        {
          type: 'scope',
          theme: { mode: 'dark' },
          children: [
            {
              namespace: 'graph',
              type: 'entity',
              id: 'entity',
              role: 'activity',
              position: [0, 0],
              text: 'Entity',
              ...entity,
            },
          ],
        },
      ],
    });

    const defaultOutput = compileGraph(createSource({}));
    const ruleOutput = compileGraph(createSource({ status: 'error' }));
    const explicitOutput = compileGraph(createSource({ status: 'error', style: { fill: '#0000ff' } }));

    expect(fillsOf(defaultOutput)).toContain('#111111');
    expect(fillsOf(defaultOutput)).not.toContain('#ff0000');
    expect(fillsOf(ruleOutput)).toContain('#ff0000');
    expect(fillsOf(ruleOutput)).not.toContain('#111111');
    expect(fillsOf(explicitOutput)).toContain('#0000ff');
    expect(fillsOf(explicitOutput)).not.toContain('#ff0000');
  });

  it('uses incoming ancestor defaults for descendant Group and Block shells', () => {
    const output = compileGraph({
      namespace: 'graph',
      type: 'graph',
      graphDefaults: {
        group: { background: { fill: '#111111' } },
        block: { background: { fill: '#222222' } },
      },
      children: [
        {
          namespace: 'graph',
          type: 'group',
          id: 'outer-group',
          graphDefaults: { group: { background: { fill: '#333333' } } },
          children: [{ namespace: 'graph', type: 'group', id: 'inner-group', children: [] }],
        },
        {
          namespace: 'graph',
          type: 'block',
          id: 'outer-block',
          graphDefaults: { block: { background: { fill: '#444444' } } },
          children: [{ namespace: 'graph', type: 'block', id: 'inner-block', children: [] }],
        },
      ],
    });
    const fills = fillsOf(output);

    expect(fills.filter(fill => fill === '#111111')).toHaveLength(1);
    expect(fills.filter(fill => fill === '#222222')).toHaveLength(1);
    expect(fills.filter(fill => fill === '#333333')).toHaveLength(1);
    expect(fills.filter(fill => fill === '#444444')).toHaveLength(1);
  });

  it('keeps an unknown composite payload opaque when Graph defaults are projected', () => {
    const opaque = {
      namespace: 'custom',
      type: 'opaque',
      payload: {
        namespace: 'graph',
        type: 'entity',
        role: 'activity',
        text: 'Hidden',
      },
    };
    const source = Graph.GraphSchema.parse({
      namespace: 'graph',
      type: 'graph',
      graphDefaults: { entity: { style: { fill: '#111111' } } },
      graphRules: [],
      children: [opaque],
    });

    const projected = Graph.resolveGraph(source, Graph.resolveGraphDefinitionOptions());

    expect(projected[0]).toEqual(opaque);
  });

  it('applies relation style defaults without changing role-owned marker structure', () => {
    const source = {
      namespace: 'graph',
      type: 'graph',
      graphDefaults: {
        relation: {
          style: { stroke: '#123456', strokeWidth: 2 },
          targetMarker: { color: '#123456' },
        },
      },
      children: [
        { namespace: 'graph', type: 'entity', id: 'source', role: 'activity', position: [0, 0], text: 'Source' },
        { namespace: 'graph', type: 'entity', id: 'target', role: 'activity', position: [100, 0], text: 'Target' },
        {
          namespace: 'graph',
          type: 'relation',
          source: { id: 'source' },
          target: { id: 'target' },
          role: 'dependency',
        },
      ],
    };
    const output = compileGraph(source);
    const baseline = compileGraph({ ...source, graphDefaults: undefined });
    const paths = primitivesOf(output.scene.primitives).filter(primitive => primitive.type === 'path');
    const baselinePaths = primitivesOf(baseline.scene.primitives).filter(primitive => primitive.type === 'path');

    expect(paths).toEqual(expect.arrayContaining([expect.objectContaining({ stroke: '#123456', strokeWidth: 2 })]));
    expect(paths).toHaveLength(baselinePaths.length);
    expect(paths.map(path => path.dashPattern)).toEqual(baselinePaths.map(path => path.dashPattern));
  });
});
