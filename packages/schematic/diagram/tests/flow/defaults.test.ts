import type { ScenePrimitive } from '@retikz/core';

import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { GraphSchema, resolveGraph, resolveGraphDefinitionOptions } from '@retikz/graph';
import { describe, expect, it } from 'vitest';

import * as Flow from '../../src/flow';

const compileFlow = (source: unknown, options: Flow.FlowDiagramDefinitionOptions = {}) => {
  const flow = Flow.FlowDiagramSchema.parse(source);
  const definitions = resolveCoreProviderDependencies({
    contributions: [Flow.createFlowDiagramProviderContribution(options)],
  });

  return compileToScene(
    { type: 'scene', version: 1, children: [flow] },
    {
      ...definitions,
      padding: 0,
      measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
    },
  );
};

const artifactOf = (output: ReturnType<typeof compileFlow>) => {
  const envelope = output.artifacts.find(
    artifact => artifact.kind === 'composite' && artifact.namespace === 'diagram' && artifact.type === 'flow',
  );
  return Flow.FlowDiagramArtifactSchema.parse(envelope?.value);
};

const flattenPrimitives = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  primitives.flatMap(primitive =>
    primitive.type === 'group' ? [primitive, ...flattenPrimitives(primitive.children)] : [primitive],
  );

const textPrimitive = (primitives: ReadonlyArray<ScenePrimitive>, text: string) =>
  flattenPrimitives(primitives).find(
    (primitive): primitive is Extract<ScenePrimitive, { type: 'text' }> =>
      primitive.type === 'text' && primitive.lines.some(line => line.text === text),
  );

const baseFlow = {
  namespace: 'diagram',
  type: 'flow',
  entities: [{ id: 'source', text: 'Source' }],
  groups: [],
  layouts: [],
  children: ['source'],
};

describe('Flow defaults and formal Source fragments', () => {
  it('keeps Flow private entities outside ancestor Graph defaults and rules', () => {
    const flow = Flow.FlowDiagramSchema.parse(baseFlow);
    const source = GraphSchema.parse({
      namespace: 'graph',
      type: 'graph',
      graphDefaults: { entity: { style: { color: '#123456' } } },
      graphRules: [{ type: 'entity', style: { fill: '#654321' } }],
      children: [flow],
    });

    expect(resolveGraph(source, resolveGraphDefinitionOptions())).toEqual([flow]);
  });

  it('accepts presentation, Diagram defaults, Flow defaults and formal routing and round-trips them', () => {
    const source = {
      namespace: 'diagram',
      type: 'flow',
      presentation: {
        title: {
          text: 'Pipeline',
          style: { textColor: '#0f172a', font: { size: 18 } },
          layout: { align: 'start', maxTextWidth: 320 },
        },
        description: { text: 'Service graph', style: { opacity: 0 }, layout: { lineHeight: 14 } },
      },
      diagramDefaults: {
        presentation: { title: { style: { font: { size: 22 } } } },
        frame: {
          padding: 0,
          titleDescriptionGap: 0,
          headingMainGap: 0,
          drawingLegendGap: 0,
          background: { fill: 'none' },
          border: { stroke: 'none' },
          cornerRadius: 0,
        },
      },
      flowDefaults: {
        layout: { nodeGap: 12, rankGap: 24 },
        entity: { style: { font: { size: 14 } }, layout: { maxTextWidth: 180 } },
        group: { padding: 12, caption: { title: { font: { size: 12 } } } },
        relation: { style: { strokeWidth: 2 }, labelFont: { size: 11 } },
      },
      layout: { direction: 'right', nodeGap: 20, rankGap: 40 },
      routing: { kind: 'orthogonal', cornerRadius: 9 },
      entities: [
        { id: 'source', text: 'Source', style: { font: { size: 14 } }, layout: { maxTextWidth: 120 } },
        { id: 'target', text: 'Target' },
      ],
      groups: [
        {
          id: 'group',
          layout: { direction: 'down', nodeGap: 8, rankGap: 16 },
          routing: { kind: 'orthogonal', cornerRadius: 4 },
          caption: { title: { text: 'Group', font: { size: 12 } } },
          children: ['source'],
        },
      ],
      layouts: [{ id: 'lane', direction: 'down', gap: 4, align: 'center', children: ['target'] }],
      children: ['group', 'lane'],
      relations: [
        {
          source: 'source',
          target: 'target',
          label: 'edge',
          style: { stroke: '#334155' },
          sourceMarker: { color: '#334155' },
          labelTextForeground: '#475569',
          labelFont: { size: 10 },
          labelOpacity: 0.8,
          routing: { kind: 'straight' },
        },
      ],
    };

    const parsed = Flow.FlowDiagramSchema.parse(source);

    expect(parsed).toEqual(source);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(source);
  });

  it('rejects legacy and misplaced fields with their real schema paths and keys', () => {
    const presentation = Flow.FlowDiagramSchema.safeParse({
      ...baseFlow,
      presentation: { title: 'Legacy title' },
    });
    expect(presentation.success).toBe(false);
    if (presentation.success) return;
    expect(presentation.error.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ['presentation', 'title'] })]),
    );

    const legacy = Flow.FlowDiagramSchema.safeParse({
      ...baseFlow,
      diagramTheme: { frame: { padding: 0 } },
      flowThemeTokens: { 'flow.layout.nodeGap': 1 },
      flowTheme: { layout: { nodeGap: 1 } },
    });
    expect(legacy.success).toBe(false);
    if (legacy.success) return;
    const legacyIssue = legacy.error.issues.find(
      issue => issue.code === 'unrecognized_keys' && issue.path.length === 0,
    );
    expect(legacyIssue).toMatchObject({
      keys: expect.arrayContaining(['diagramTheme', 'flowThemeTokens', 'flowTheme']),
    });

    const groupLayout = Flow.FlowDiagramSchema.safeParse({
      ...baseFlow,
      groups: [{ id: 'group', layout: { direction: 'right', routing: { kind: 'straight' } }, children: ['source'] }],
      children: ['group'],
    });
    expect(groupLayout.success).toBe(false);
    if (groupLayout.success) return;
    expect(groupLayout.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['groups', 0, 'layout'],
          keys: expect.arrayContaining(['routing']),
        }),
      ]),
    );

    const relationLayout = Flow.FlowDiagramSchema.safeParse({
      ...baseFlow,
      entities: [
        { id: 'source', text: 'Source' },
        { id: 'target', text: 'Target' },
      ],
      children: ['source', 'target'],
      relations: [{ source: 'source', target: 'target', layout: { routing: { kind: 'straight' } } }],
    });
    expect(relationLayout.success).toBe(false);
    if (relationLayout.success) return;
    expect(relationLayout.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['relations', 0],
          keys: expect.arrayContaining(['layout']),
        }),
      ]),
    );

    const defaults = Flow.FlowDiagramSchema.safeParse({
      ...baseFlow,
      flowDefaults: { layout: { direction: 'right', routing: { kind: 'straight' } } },
    });
    expect(defaults.success).toBe(false);
    if (defaults.success) return;
    expect(defaults.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['flowDefaults', 'layout'],
          keys: expect.arrayContaining(['direction', 'routing']),
        }),
      ]),
    );
  });

  it('creates only authored presentation regions and applies Diagram title defaults', () => {
    const output = compileFlow({
      ...baseFlow,
      presentation: { title: { text: 'Pipeline' } },
      diagramDefaults: { presentation: { title: { style: { font: { size: 22 } } } } },
    });
    const artifact = artifactOf(output);
    const title = textPrimitive(output.scene.primitives, 'Pipeline');

    expect(artifact.regions.title).toBeDefined();
    expect(artifact.regions.description).toBeUndefined();
    expect(title).toEqual(expect.objectContaining({ fontSize: 22 }));
  });

  it('takes routing from the nearest common Group scope through a nested Layout', () => {
    const source = {
      namespace: 'diagram',
      type: 'flow',
      layout: { direction: 'right', nodeGap: 16, rankGap: 32 },
      routing: { kind: 'straight' },
      entities: [
        { id: 'source', text: 'Source' },
        { id: 'target', text: 'Target' },
      ],
      groups: [
        {
          id: 'group',
          routing: { kind: 'orthogonal', cornerRadius: 9 },
          children: ['lane'],
        },
      ],
      layouts: [{ id: 'lane', direction: 'right', gap: 0, children: ['source', 'target'] }],
      children: ['group'],
      relations: [{ source: 'source', target: 'target' }],
    };
    const inputs: Array<Flow.FlowLayoutInput> = [];
    const layout = Flow.defineFlowLayout({
      ...Flow.LayeredFlowLayoutDefinition,
      name: 'observe-routing',
      layout: (input, context) => {
        inputs.push(input);
        return Flow.LayeredFlowLayoutDefinition.layout(input, context);
      },
    });
    const output = compileFlow(source, { flowLayouts: [layout], defaultFlowLayout: layout.name });
    const artifact = artifactOf(output);

    expect(inputs).toHaveLength(1);
    expect(inputs[0]?.relations[0]?.routing).toEqual({ kind: 'orthogonal', cornerRadius: 9 });
    expect(artifact.relations[0]?.route).toMatchObject({ kind: 'orthogonal', cornerRadius: 9 });

    const straightOnly = Flow.defineFlowLayout({
      ...layout,
      name: 'straight-only',
      capabilities: { ...layout.capabilities, routingKinds: ['straight'] },
    });
    expect(() => compileFlow(source, { flowLayouts: [straightOnly], defaultFlowLayout: straightOnly.name })).toThrow();
    expect(inputs).toHaveLength(1);
  });

  it('replaces Entity Node font as a whole while completing Relation labelFont by field', () => {
    const output = compileFlow({
      namespace: 'diagram',
      type: 'flow',
      flowDefaults: {
        entity: { style: { font: { family: 'EntityWholeFont', size: 16, weight: 700 } } },
        relation: { labelFont: { family: 'RelationLabelFont', size: 16, weight: 700 } },
      },
      entities: [
        { id: 'source', text: 'Source', style: { font: { size: 12 } } },
        { id: 'target', text: 'Target' },
      ],
      groups: [],
      layouts: [],
      children: ['source', 'target'],
      relations: [{ source: 'source', target: 'target', label: 'edge', labelFont: { size: 13 } }],
    });
    const entity = textPrimitive(output.scene.primitives, 'Source');
    const label = textPrimitive(output.scene.primitives, 'edge');

    expect(entity).toEqual(expect.objectContaining({ fontSize: 12 }));
    expect(entity?.fontFamily).not.toBe('EntityWholeFont');
    expect(entity?.fontWeight).not.toBe(700);
    expect(label).toEqual(expect.objectContaining({ fontFamily: 'RelationLabelFont', fontSize: 13, fontWeight: 700 }));
  });
  it.each([{}, { size: undefined }])('keeps caption defaults when the authored font is empty: %j', font => {
    const output = compileFlow({
      namespace: 'diagram',
      type: 'flow',
      flowDefaults: { group: { caption: { title: { font: { family: 'CaptionFont', size: 19, weight: 700 } } } } },
      entities: [{ id: 'node', text: 'Node' }],
      groups: [{ id: 'group', caption: { title: { text: 'Caption', font } }, children: ['node'] }],
      layouts: [],
      children: ['group'],
    });
    expect(textPrimitive(output.scene.primitives, 'Caption')).toMatchObject({
      fontFamily: 'CaptionFont',
      fontSize: 19,
      fontWeight: 700,
    });
  });

  it('inherits explicit ancestor spacing through Group and Layout before applying local overrides', () => {
    const inputs: Array<Flow.FlowLayoutInput> = [];
    const layout = Flow.defineFlowLayout({
      ...Flow.LayeredFlowLayoutDefinition,
      name: 'observe-spacing',
      layout: (input, context) => {
        inputs.push(input);
        return Flow.LayeredFlowLayoutDefinition.layout(input, context);
      },
    });
    compileFlow(
      {
        namespace: 'diagram',
        type: 'flow',
        flowDefaults: { layout: { nodeGap: 12, rankGap: 24 } },
        layout: { direction: 'right', nodeGap: 50, rankGap: 60 },
        entities: [{ id: 'node', text: 'Node' }],
        groups: [
          { id: 'outer', children: ['lane'] },
          { id: 'inner', layout: { nodeGap: 0 }, children: ['node'] },
        ],
        layouts: [{ id: 'lane', direction: 'down', children: ['inner'] }],
        children: ['outer'],
      },
      { flowLayouts: [layout], defaultFlowLayout: layout.name },
    );
    const outer = inputs[0]?.elements[0];
    if (outer.kind !== 'group') throw new Error('Expected outer Group');
    const lane = outer.elements[0];
    if (lane.kind !== 'layout') throw new Error('Expected Layout');
    const inner = lane.elements[0];
    if (inner.kind !== 'group') throw new Error('Expected inner Group');
    expect(outer.layout).toMatchObject({ direction: 'right', nodeGap: 50, rankGap: 60 });
    expect(lane.layout).toMatchObject({ direction: 'down', nodeGap: 50, rankGap: 60 });
    expect(inner.layout).toMatchObject({ direction: 'down', nodeGap: 0, rankGap: 60 });
  });
});
