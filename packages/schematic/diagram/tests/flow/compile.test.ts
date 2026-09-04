import type { CoreProviderContribution, GroupPrim, IRChild, ScenePrimitive, TextPrim } from '@retikz/core';

import {
  compileToScene,
  DEFAULT_RESOLVED_THEME,
  defineThemeStyle,
  resolveCoreProviderDependencies,
} from '@retikz/core';
import { defineGraphThemeStyle, defineRelationRole } from '@retikz/graph';
import { createFlexLayout, FlexLayoutArtifactSchema, LayoutItemKind } from '@retikz/layout';
import { LegendSchema } from '@retikz/standard';
import { describe, expect, it } from 'vitest';

import type {
  FlowLayoutDefinition,
  FlowLayoutExecutionContext,
  FlowLayoutInput,
  FlowLayoutOutput,
  IRFlowEntity,
} from '../../src/flow';
import type { FlowMeasurement } from '../../src/flow/pipeline/flow/types';

import { defineDiagramThemeStyle } from '../../src/_diagram';
import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../src/errors';
import * as Flow from '../../src/flow';
import { defineFlowLayout } from '../../src/flow';
import * as FlowPipeline from '../../src/flow/pipeline';
import { materializeFlowGraph } from '../../src/flow/pipeline/flow/materialize';
import { resolveFlowThemeStyleRegistry } from '../../src/flow/providers/theme';
import { resolveFlowDiagram } from '../../src/flow/resolve';
import { parseTestFlowDiagram } from './fixtures';

type ExecuteFlowLayout = (
  definition: FlowLayoutDefinition,
  input: FlowLayoutInput,
  context?: FlowLayoutExecutionContext,
) => FlowLayoutOutput;

const findDiagramError = (error: unknown): RetikzDiagramError | undefined => {
  let current = error;
  while (current !== null && typeof current === 'object') {
    if (current instanceof RetikzDiagramError) return current;
    current = 'cause' in current ? current.cause : undefined;
  }
  return undefined;
};

const isExecuteFlowLayout = (value: unknown): value is ExecuteFlowLayout => typeof value === 'function';

const getExecuteFlowLayout = (): ExecuteFlowLayout | undefined => {
  const candidate: unknown = FlowPipeline;
  if (
    typeof candidate === 'object' &&
    candidate !== null &&
    'executeFlowLayout' in candidate &&
    isExecuteFlowLayout(candidate.executeFlowLayout)
  ) {
    return candidate.executeFlowLayout;
  }
  return undefined;
};

const input: FlowLayoutInput = {
  layout: {
    direction: 'right',
    nodeGap: 20,
    rankGap: 40,
    routing: { kind: 'orthogonal', cornerRadius: 6 },
  },
  elements: [
    { kind: 'leaf', id: 'a', size: { width: 10, height: 10 }, margin: { top: 0, right: 0, bottom: 0, left: 0 } },
    { kind: 'leaf', id: 'b', size: { width: 10, height: 10 }, margin: { top: 0, right: 0, bottom: 0, left: 0 } },
  ],
  relations: [
    {
      source: 'a',
      target: 'b',
      direction: 'forward',
      routing: { kind: 'orthogonal', cornerRadius: 6 },
      labelSize: { width: 8, height: 4 },
    },
  ],
};

const output = (): {
  elements: Array<{ id: string; bounds: { x: number; y: number; width: number; height: number } }>;
  relations: Array<{
    points: Array<[number, number]>;
    labelBounds: { x: number; y: number; width: number; height: number };
  }>;
} => ({
  elements: [
    { id: 'a', bounds: { x: 0, y: 0, width: 10, height: 10 } },
    { id: 'b', bounds: { x: 20, y: 0, width: 10, height: 10 } },
  ],
  relations: [
    {
      points: [
        [-0, 5],
        [10, 5],
        [10, 5],
        [20, 5],
      ],
      labelBounds: { x: 11, y: 3, width: 8, height: 4 },
    },
  ],
});

const definition = (layout: FlowLayoutDefinition['layout']): FlowLayoutDefinition =>
  defineFlowLayout({
    name: 'test-layout',
    description: 'Deterministic test layout.',
    capabilities: {
      compoundScopes: true,
      groupEndpoints: true,
      crossScopeRelations: true,
      cycles: true,
      selfLoops: false,
      parallelRelations: true,
      relationLabels: true,
      relationDirections: ['none', 'forward', 'reverse', 'both'],
      routingKinds: ['straight', 'orthogonal'],
    },
    defaults: {
      direction: 'right',
      nodeGap: 20,
      rankGap: 40,
      routing: { kind: 'orthogonal', orthogonalCornerRadius: 6 },
    },
    layout,
  });

const expectDiagramError = (run: () => unknown, code: string): void => {
  try {
    run();
    expect.unreachable(`Expected ${code}`);
  } catch (error) {
    if (!(error instanceof RetikzDiagramError)) throw error;
    expect(error.code).toBe(code);
    expect(error.details).toMatchObject({ definition: 'test-layout' });
  }
};

const flattenPrimitives = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  primitives.flatMap(primitive =>
    primitive.type === 'group' ? [primitive, ...flattenPrimitives(primitive.children)] : [primitive],
  );

const textPrimitive = (primitives: ReadonlyArray<ScenePrimitive>, text: string): TextPrim | undefined =>
  flattenPrimitives(primitives).find(
    (primitive): primitive is TextPrim => primitive.type === 'text' && primitive.lines.some(line => line.text === text),
  );

const slopedLabelGroup = (primitives: ReadonlyArray<ScenePrimitive>, text: string): GroupPrim | undefined =>
  flattenPrimitives(primitives).find(
    (primitive): primitive is GroupPrim =>
      primitive.type === 'group' &&
      primitive.transforms?.some(transform => transform.kind === 'rotate') === true &&
      textPrimitive(primitive.children, text) !== undefined,
  );

describe('Flow layout callback execution', () => {
  it('publishes one detached, frozen and normalized provider boundary', () => {
    const executeFlowLayout = getExecuteFlowLayout();
    expect(executeFlowLayout).toBeDefined();
    if (executeFlowLayout === undefined) return;

    let callCount = 0;
    let receivedInput: FlowLayoutInput | undefined;
    const mutableOutput = output();
    const result = executeFlowLayout(
      definition(received => {
        callCount += 1;
        receivedInput = received;
        return mutableOutput;
      }),
      input,
    );

    mutableOutput.relations[0].points[0][0] = 99;

    expect(callCount).toBe(1);
    expect(receivedInput).not.toBe(input);
    expect(Object.isFrozen(receivedInput)).toBe(true);
    expect(Object.isFrozen(receivedInput?.elements)).toBe(true);
    expect(result.relations[0]?.points).toEqual([
      [0, 5],
      [10, 5],
      [20, 5],
    ]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.relations[0]?.points)).toBe(true);
  });

  it('rejects Promise and non-plain callback outputs with the Definition callback error', () => {
    const executeFlowLayout = getExecuteFlowLayout();
    expect(executeFlowLayout).toBeDefined();
    if (executeFlowLayout === undefined) return;

    const promiseDefinition = definition(() => output());
    Object.defineProperty(promiseDefinition, 'layout', { value: () => Promise.resolve(output()) });
    expectDiagramError(
      () => executeFlowLayout(promiseDefinition, input),
      RetikzDiagramErrorCode.DefinitionCallbackFailed,
    );

    const nonPlainOutput = Object.assign(new Map(), output());
    expectDiagramError(
      () =>
        executeFlowLayout(
          definition(() => nonPlainOutput),
          input,
        ),
      RetikzDiagramErrorCode.FlowLayoutOutputInvalid,
    );
  });

  it('rejects identity, order, coverage, leaf size, endpoint, route and label contract violations', () => {
    const executeFlowLayout = getExecuteFlowLayout();
    expect(executeFlowLayout).toBeDefined();
    if (executeFlowLayout === undefined) return;

    const relationWithIdentity = {
      ...output(),
      relations: [{ ...output().relations[0], id: 'synthetic-relation' }],
    };
    const invalidOutputs: Array<FlowLayoutOutput> = [
      { ...output(), elements: [...output().elements].reverse() },
      { ...output(), relations: [] },
      relationWithIdentity,
      {
        ...output(),
        elements: [{ ...output().elements[0], bounds: { x: 0, y: 0, width: 11, height: 10 } }, output().elements[1]],
      },
      {
        ...output(),
        relations: [
          {
            ...output().relations[0],
            points: [
              [11, 5],
              [20, 5],
            ],
          },
        ],
      },
      {
        ...output(),
        relations: [
          {
            ...output().relations[0],
            points: [
              [0, 5],
              [10, 7],
              [20, 5],
            ],
          },
        ],
      },
    ];

    for (const invalidOutput of invalidOutputs) {
      expectDiagramError(
        () =>
          executeFlowLayout(
            definition(() => invalidOutput),
            input,
          ),
        RetikzDiagramErrorCode.FlowLayoutOutputInvalid,
      );
    }
  });

  it('requires each authored Layout placement exactly once and preserves its relative child bounds', () => {
    const executeFlowLayout = getExecuteFlowLayout();
    expect(executeFlowLayout).toBeDefined();
    if (executeFlowLayout === undefined) return;

    const layoutInput: FlowLayoutInput = {
      layout: input.layout,
      elements: [
        {
          kind: 'layout',
          id: 'lane',
          layout: { ...input.layout, direction: 'down', nodeGap: 6 },
          align: 'end',
          elements: [input.elements[0]],
        },
      ],
      relations: [],
    };
    const placementContext: FlowLayoutExecutionContext = {
      placeLayout: () => ({
        bounds: { x: 0, y: 0, width: 10, height: 10 },
        elements: [{ id: 'a', bounds: { x: 0, y: 0, width: 10, height: 10 } }],
      }),
    };
    const place = (context: FlowLayoutExecutionContext) =>
      context.placeLayout({
        layout: { id: 'lane', direction: 'down', gap: 6, align: 'end' },
        elements: [
          {
            id: 'a',
            size: { width: 10, height: 10 },
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
          },
        ],
      });

    const accepted = executeFlowLayout(
      definition((_input, context) => {
        const placement = place(context);
        return {
          elements: [
            { id: 'lane', bounds: placement.bounds },
            { id: 'a', bounds: placement.elements[0].bounds },
          ],
          relations: [],
        };
      }),
      layoutInput,
      placementContext,
    );
    expect(accepted.elements).toHaveLength(2);

    for (const callback of [
      () => ({
        elements: [
          { id: 'lane', bounds: { x: 0, y: 0, width: 10, height: 10 } },
          { id: 'a', bounds: { x: 0, y: 0, width: 10, height: 10 } },
        ],
        relations: [],
      }),
      (_input: FlowLayoutInput, context: FlowLayoutExecutionContext) => {
        const placement = place(context);
        place(context);
        return {
          elements: [
            { id: 'lane', bounds: placement.bounds },
            { id: 'a', bounds: placement.elements[0].bounds },
          ],
          relations: [],
        };
      },
      (_input: FlowLayoutInput, context: FlowLayoutExecutionContext) => {
        const placement = place(context);
        return {
          elements: [
            { id: 'lane', bounds: placement.bounds },
            { id: 'a', bounds: { ...placement.elements[0].bounds, x: 1 } },
          ],
          relations: [],
        };
      },
    ]) {
      expectDiagramError(
        () => executeFlowLayout(definition(callback), layoutInput, placementContext),
        RetikzDiagramErrorCode.FlowLayoutOutputInvalid,
      );
    }

    expectDiagramError(
      () =>
        executeFlowLayout(
          definition((_input, context) => {
            Reflect.apply(context.placeLayout, context, [null]);
            return { elements: [], relations: [] };
          }),
          layoutInput,
          placementContext,
        ),
      RetikzDiagramErrorCode.FlowLayoutOutputInvalid,
    );
  });
});

type CreateFlowDiagramProviderContribution = () => CoreProviderContribution;

const isCreateFlowDiagramProviderContribution = (value: unknown): value is CreateFlowDiagramProviderContribution =>
  typeof value === 'function';

describe('Flow Diagram compile transaction', () => {
  it('measures and renders a styled multi-line Entity text block through the Graph pipeline', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [Flow.createFlowDiagramProviderContribution()],
    });
    const compile = (text: IRFlowEntity['text'], style: NonNullable<IRFlowEntity['style']> = {}) => {
      const entity: IRFlowEntity = {
        id: 'form',
        text,
        ...(Object.keys(style).length === 0 ? {} : { style }),
      };
      const source: IRChild = parseTestFlowDiagram({
        namespace: 'diagram',
        type: 'flow',
        entities: [entity],
        groups: [],
        layouts: [],
        children: ['form'],
      });
      return compileToScene(
        { type: 'scene', version: 1, children: [source] },
        {
          ...definitions,
          padding: 0,
          measureText: textValue => ({ width: textValue.length * 8, height: 12, ascent: 9, descent: 3 }),
        },
      );
    };

    const plain = compile('Frontend form');
    const rich = compile(['Frontend form', { text: 'Complete user details', fill: 'gray', font: { size: 'sm' } }], {
      align: 'start',
      lineHeight: 18,
      maxTextWidth: 160,
    });
    const artifactOf = (result: ReturnType<typeof compileToScene>) =>
      Flow.FlowDiagramArtifactSchema.parse(
        result.artifacts.find(artifact => artifact.kind === 'composite' && artifact.namespace === 'diagram')?.value,
      );

    const text = textPrimitive(rich.scene.primitives, 'Frontend form');
    expect(text).toMatchObject({
      align: 'start',
      lineHeight: 18,
      lines: [
        { text: 'Frontend form' },
        { text: 'Complete user', fill: 'gray', fontSize: 14 },
        { text: 'details', fill: 'gray', fontSize: 14 },
      ],
    });
    expect(artifactOf(rich).elements[0]?.bounds.height).toBeGreaterThan(
      artifactOf(plain).elements[0]?.bounds.height ?? 0,
    );
  });

  it('renders Flow Entity and Relation status through the existing Graph Theme appearance', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [Flow.createFlowDiagramProviderContribution()],
    });
    const source = parseTestFlowDiagram({
      namespace: 'diagram',
      type: 'flow',
      entities: [
        { id: 'source', text: 'Source', status: 'error' },
        { id: 'target', text: 'Target', status: 'success' },
      ],
      groups: [],
      layouts: [],
      children: ['source', 'target'],
      relations: [{ source: 'source', target: 'target', status: 'warning' }],
    });
    const result = compileToScene(
      { type: 'scene', version: 1, children: [source] },
      {
        ...definitions,
        padding: 0,
        measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
      },
    );
    const scene = JSON.stringify(result.scene);

    expect(scene).toContain('#cf3f3f');
    expect(scene).toContain('#3b9b63');
    expect(scene).toContain(DEFAULT_RESOLVED_THEME.colors.semantic.warning);
  });

  it('produces Scene, one Flow artifact and world-space element handles from the same provider contribution', () => {
    const candidate: unknown = Flow;
    const createContribution =
      typeof candidate === 'object' &&
      candidate !== null &&
      'createFlowDiagramProviderContribution' in candidate &&
      isCreateFlowDiagramProviderContribution(candidate.createFlowDiagramProviderContribution)
        ? candidate.createFlowDiagramProviderContribution
        : undefined;

    expect(createContribution).toBeDefined();
    if (createContribution === undefined) return;

    const definitions = resolveCoreProviderDependencies({ contributions: [createContribution()] });
    const source: IRChild = parseTestFlowDiagram({
      namespace: 'diagram',
      type: 'flow',
      entities: [
        { id: 'source', text: 'Source' },
        { id: 'target', text: 'Target' },
      ],
      groups: [],
      layouts: [],
      children: ['source', 'target'],
      relations: [{ source: 'source', target: 'target', style: { stroke: '#c026d3' } }],
    });
    const result = compileToScene(
      { type: 'scene', version: 1, children: [source] },
      {
        ...definitions,
        padding: 0,
        measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
      },
    );
    const artifactEnvelope = result.artifacts.find(
      artifact => artifact.kind === 'composite' && artifact.namespace === 'diagram' && artifact.type === 'flow',
    );
    const artifact = Flow.FlowDiagramArtifactSchema.parse(artifactEnvelope?.value);
    const elementHandles = result.spatialHandles.entries.filter(entry => ['entity', 'group'].includes(entry.role));
    const serializedScene = JSON.stringify(result.scene);
    const relationPath = flattenPrimitives(result.scene.primitives).find(
      primitive => primitive.type === 'path' && primitive.stroke === '#c026d3',
    );

    expect(artifact.layout.definition).toBe('layered');
    expect(artifact.elements.map(element => element.id)).toEqual(['source', 'target']);
    expect(artifact.relations).toHaveLength(1);
    expect(artifact.relations[0]).not.toHaveProperty('id');
    expect(artifact.regions.drawing.allocationBounds.width).toBeGreaterThan(0);
    expect(elementHandles.map(entry => entry.key)).toEqual(['element:source', 'element:target']);
    expect(relationPath).toBeDefined();
    expect(relationPath?.id).toBeUndefined();
    expect(serializedScene).toContain('Source');
    expect(serializedScene).toContain('Target');
  });

  it('inherits named Graph Group appearance while the Flow definition remains empty', () => {
    const styleName = 'graph-owned-group';
    const source = parseTestFlowDiagram({
      namespace: 'diagram',
      type: 'flow',
      entities: [{ id: 'worker', text: 'Worker' }],
      groups: [{ id: 'runtime', label: 'Runtime', children: ['worker'] }],
      layouts: [],
      children: ['runtime'],
    });
    const definitions = resolveCoreProviderDependencies({
      contributions: [
        Flow.createFlowDiagramProviderContribution({
          diagramThemeStyles: [
            defineDiagramThemeStyle({ name: styleName, resolve: () => ({ frame: { background: { fill: 'none' } } }) }),
          ],
          flowThemeStyles: [Flow.defineFlowThemeStyle({ name: styleName, resolve: () => ({}) })],
          graphThemeStyles: [
            defineGraphThemeStyle({
              name: styleName,
              resolve: () => ({
                group: {
                  tokens: {
                    background: { fill: '#fef3c7' },
                    border: { stroke: '#92400e', strokeWidth: 3 },
                    cornerRadius: 6,
                  },
                },
              }),
            }),
          ],
        }),
      ],
    });
    const result = compileToScene(
      { type: 'scene', version: 1, theme: { style: styleName }, children: [source] },
      {
        ...definitions,
        themeStyles: [defineThemeStyle({ name: styleName, resolve: () => ({}) })],
        padding: 0,
        measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
      },
    );
    const paths = flattenPrimitives(result.scene.primitives).filter(primitive => primitive.type === 'path');

    expect(paths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fill: '#fef3c7' }),
        expect.objectContaining({ stroke: '#92400e', strokeWidth: 3 }),
      ]),
    );
    expect(JSON.stringify(source)).not.toContain('#fef3c7');
    expect(source).not.toHaveProperty('flowThemeTokens');
    expect(source).not.toHaveProperty('flowTheme');
  });

  it('reports only authored Foundation regions in the Flow artifact', () => {
    const createContribution = Flow.createFlowDiagramProviderContribution;
    const definitions = resolveCoreProviderDependencies({ contributions: [createContribution()] });
    const source: IRChild = parseTestFlowDiagram({
      namespace: 'diagram',
      type: 'flow',
      presentation: {
        title: 'Pipeline',
        description: 'One compile transaction',
      },
      entities: [{ id: 'only', text: 'Only' }],
      groups: [],
      layouts: [],
      children: ['only'],
    });
    const result = compileToScene(
      { type: 'scene', version: 1, children: [source] },
      {
        ...definitions,
        padding: 0,
        measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
      },
    );
    const artifactEnvelope = result.artifacts.find(
      artifact => artifact.kind === 'composite' && artifact.namespace === 'diagram' && artifact.type === 'flow',
    );
    const artifact = Flow.FlowDiagramArtifactSchema.parse(artifactEnvelope?.value);

    expect(Object.keys(artifact.regions)).toEqual(['title', 'description', 'drawing']);
    expect(artifact.regions.title?.allocationBounds.height).toBeGreaterThan(0);
    expect(artifact.regions.description?.allocationBounds.y).toBeGreaterThan(
      artifact.regions.title?.allocationBounds.y ?? 0,
    );
    expect(artifact.regions.drawing.allocationBounds.y).toBeGreaterThan(
      artifact.regions.description?.allocationBounds.y ?? 0,
    );
  });

  it('accepts four nested Groups and preserves depth-first artifact identity', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [Flow.createFlowDiagramProviderContribution()],
    });
    const source: IRChild = parseTestFlowDiagram({
      namespace: 'diagram',
      type: 'flow',
      entities: [{ id: 'leaf', text: 'Leaf' }],
      groups: [
        { id: 'group-0', label: 'Group 0', children: ['group-1'] },
        { id: 'group-1', label: 'Group 1', children: ['group-2'] },
        { id: 'group-2', label: 'Group 2', children: ['group-3'] },
        { id: 'group-3', label: 'Group 3', children: ['leaf'] },
      ],
      layouts: [],
      children: ['group-0'],
    });
    const result = compileToScene(
      { type: 'scene', version: 1, children: [source] },
      {
        ...definitions,
        padding: 0,
        measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
      },
    );
    const artifactEnvelope = result.artifacts.find(
      artifact => artifact.kind === 'composite' && artifact.namespace === 'diagram' && artifact.type === 'flow',
    );
    const artifact = Flow.FlowDiagramArtifactSchema.parse(artifactEnvelope?.value);

    const flattenIds = (elements: typeof artifact.elements): Array<string> =>
      elements.flatMap(element => [element.id, ...(element.kind === 'entity' ? [] : flattenIds(element.elements))]);

    expect(flattenIds(artifact.elements)).toEqual(['group-0', 'group-1', 'group-2', 'group-3', 'leaf']);
  });

  it('applies a standalone root routing corner-radius token to the orthogonal provider default', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [Flow.createFlowDiagramProviderContribution()],
    });
    const source: IRChild = parseTestFlowDiagram({
      namespace: 'diagram',
      type: 'flow',
      flowThemeTokens: { 'flow.routing.cornerRadius': 0 },
      entities: [
        { id: 'source', text: 'Source' },
        { id: 'target', text: 'Target' },
      ],
      groups: [],
      layouts: [],
      children: ['source', 'target'],
      relations: [{ source: 'source', target: 'target' }],
    });
    const result = compileToScene(
      { type: 'scene', version: 1, children: [source] },
      {
        ...definitions,
        padding: 0,
        measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
      },
    );
    const artifactEnvelope = result.artifacts.find(
      artifact => artifact.kind === 'composite' && artifact.namespace === 'diagram' && artifact.type === 'flow',
    );
    const artifact = Flow.FlowDiagramArtifactSchema.parse(artifactEnvelope?.value);

    expect(artifact.relations[0]?.route).toMatchObject({ kind: 'orthogonal', cornerRadius: 0 });
  });

  it('materializes an unconfigured layered Relation as a straight two-point route', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [Flow.createFlowDiagramProviderContribution()],
    });
    const source: IRChild = parseTestFlowDiagram({
      namespace: 'diagram',
      type: 'flow',
      entities: [
        { id: 'source', text: 'Source' },
        { id: 'target', text: 'Target' },
      ],
      groups: [],
      layouts: [],
      children: ['source', 'target'],
      relations: [{ source: 'source', target: 'target' }],
    });
    const result = compileToScene(
      { type: 'scene', version: 1, children: [source] },
      {
        ...definitions,
        padding: 0,
        measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
      },
    );
    const artifactEnvelope = result.artifacts.find(
      artifact => artifact.kind === 'composite' && artifact.namespace === 'diagram' && artifact.type === 'flow',
    );
    const artifact = Flow.FlowDiagramArtifactSchema.parse(artifactEnvelope?.value);
    const route = artifact.relations[0].route;

    expect(route.kind).toBe('straight');
    expect(route.points).toHaveLength(2);
  });

  it.each(['top', 'right', 'bottom', 'left'] as const)(
    'projects exact-proposal drawing and %s Legend regions in their physical order',
    legendPosition => {
      const definitions = resolveCoreProviderDependencies({
        contributions: [Flow.createFlowDiagramProviderContribution()],
      });
      const legend = LegendSchema.parse({
        namespace: 'standard',
        type: 'legend',
        content: {
          kind: 'items',
          items: [
            {
              key: 'active',
              sample: { type: 'node', position: [0, 0], minimumSize: 10, fill: '#2563eb' },
              label: { type: 'node', position: [0, 0], text: 'Active' },
            },
          ],
        },
      });
      const source: IRChild = parseTestFlowDiagram({
        namespace: 'diagram',
        type: 'flow',
        presentation: { title: 'Architecture', legend },
        frame: { padding: 12, legendPosition, legendAlign: 'center', drawingLegendGap: 9 },
        entities: [{ id: 'only', text: 'Only' }],
        groups: [],
        layouts: [],
        children: ['only'],
      });
      const result = compileToScene(
        {
          type: 'scene',
          version: 1,
          children: [
            createFlexLayout({
              size: { x: { kind: 'fixed', value: 420 }, y: { kind: 'fixed', value: 260 } },
              children: [{ kind: LayoutItemKind.Flex, child: source, grow: 1 }],
            }),
          ],
        },
        {
          ...definitions,
          padding: 0,
          measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
        },
      );
      const artifactEnvelope = result.artifacts.find(
        artifact => artifact.kind === 'composite' && artifact.namespace === 'diagram' && artifact.type === 'flow',
      );
      const artifact = Flow.FlowDiagramArtifactSchema.parse(artifactEnvelope?.value);
      const drawing = artifact.regions.drawing.allocationBounds;
      const legendBounds = artifact.regions.legend?.allocationBounds;

      expect(artifact.frame.allocationBounds).toMatchObject({ width: 420, height: 260 });
      expect(legendBounds).toBeDefined();
      if (legendBounds === undefined) return;
      if (legendPosition === 'top') expect(legendBounds.y + legendBounds.height + 9).toBe(drawing.y);
      if (legendPosition === 'bottom') expect(drawing.y + drawing.height + 9).toBe(legendBounds.y);
      if (legendPosition === 'left') expect(legendBounds.x + legendBounds.width + 9).toBe(drawing.x);
      if (legendPosition === 'right') expect(drawing.x + drawing.width + 9).toBe(legendBounds.x);
    },
  );

  it.each([
    { legendPosition: 'top', legendAlign: 'center' },
    { legendPosition: 'right', legendAlign: 'end' },
  ] as const)(
    'projects $legendPosition/$legendAlign Foundation regions and handles from the exact Flex placement',
    ({ legendPosition, legendAlign }) => {
      const definitions = resolveCoreProviderDependencies({
        contributions: [Flow.createFlowDiagramProviderContribution()],
      });
      const legend = LegendSchema.parse({
        namespace: 'standard',
        type: 'legend',
        content: {
          kind: 'items',
          items: [
            {
              key: 'active',
              sample: { type: 'node', position: [0, 0], minimumSize: 10, fill: '#2563eb' },
              label: { type: 'node', position: [0, 0], text: 'Active' },
            },
          ],
        },
      });
      const source: IRChild = parseTestFlowDiagram({
        namespace: 'diagram',
        type: 'flow',
        presentation: { legend },
        frame: { padding: 12, legendPosition, legendAlign, drawingLegendGap: 9 },
        entities: [{ id: 'only', text: 'Only' }],
        groups: [],
        layouts: [],
        children: ['only'],
      });
      const result = compileToScene(
        {
          type: 'scene',
          version: 1,
          children: [
            createFlexLayout({
              size: { x: { kind: 'fixed', value: 420 }, y: { kind: 'fixed', value: 260 } },
              children: [{ kind: LayoutItemKind.Flex, child: source, grow: 1 }],
            }),
          ],
        },
        {
          ...definitions,
          padding: 0,
          measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
        },
      );
      const flowArtifactEnvelope = result.artifacts.find(
        artifact => artifact.kind === 'composite' && artifact.namespace === 'diagram' && artifact.type === 'flow',
      );
      const flowArtifact = Flow.FlowDiagramArtifactSchema.parse(flowArtifactEnvelope?.value);
      const mainFlexArtifact = result.artifacts
        .filter(
          artifact =>
            artifact.kind === 'composite' && artifact.namespace === 'layout' && artifact.type === 'flexLayout',
        )
        .map(artifact => FlexLayoutArtifactSchema.parse(artifact.value))
        .find(
          artifact =>
            artifact.items.some(item => item.key === 'drawing') && artifact.items.some(item => item.key === 'legend'),
        );
      const actualDrawing = mainFlexArtifact?.items.find(item => item.key === 'drawing');
      const actualLegend = mainFlexArtifact?.items.find(item => item.key === 'legend');

      expect(mainFlexArtifact).toBeDefined();
      expect(actualDrawing).toBeDefined();
      expect(actualLegend).toBeDefined();
      if (actualDrawing === undefined || actualLegend === undefined) return;
      const contentOffsetX = flowArtifact.frame.allocationBounds.x + 12;
      const contentOffsetY = flowArtifact.frame.allocationBounds.y + 12;
      expect(flowArtifact.regions.drawing.allocationBounds).toEqual({
        x: actualDrawing.allocationBounds.x + contentOffsetX,
        y: actualDrawing.allocationBounds.y + contentOffsetY,
        width: actualDrawing.allocationBounds.width,
        height: actualDrawing.allocationBounds.height,
      });
      expect(flowArtifact.regions.legend?.allocationBounds).toEqual({
        x: actualLegend.allocationBounds.x + contentOffsetX,
        y: actualLegend.allocationBounds.y + contentOffsetY,
        width: actualLegend.allocationBounds.width,
        height: actualLegend.allocationBounds.height,
      });
      for (const [key, expectedBounds] of [
        ['region:drawing', flowArtifact.regions.drawing.allocationBounds],
        ['region:legend', flowArtifact.regions.legend?.allocationBounds],
      ] as const) {
        const handleBounds = result.spatialHandles.entries.find(entry => entry.key === key)?.geometry.bounds;
        expect(handleBounds).toBeDefined();
        expect(expectedBounds).toBeDefined();
        if (handleBounds === undefined || expectedBounds === undefined) continue;
        expect(handleBounds.x).toBeCloseTo(expectedBounds.x, 2);
        expect(handleBounds.y).toBeCloseTo(expectedBounds.y, 2);
        expect(handleBounds.width).toBeCloseTo(expectedBounds.width, 2);
        expect(handleBounds.height).toBeCloseTo(expectedBounds.height, 2);
      }
    },
  );

  it('uses provider labelBounds to place the rendered sloped Graph label', () => {
    const compile = (reservation: 'horizontal' | 'vertical'): { label: TextPrim; rotation: number | undefined } => {
      const customLayout = definition(layoutInput => {
        const sourceElement = layoutInput.elements[0];
        const targetElement = layoutInput.elements[1];
        const relation = layoutInput.relations[0];
        if (sourceElement.kind !== 'leaf' || targetElement.kind !== 'leaf') {
          throw new Error('invalid test input');
        }
        const sourceBounds = { x: 0, y: 0, width: sourceElement.size.width, height: sourceElement.size.height };
        const targetBounds = {
          x: 120,
          y: 80,
          width: targetElement.size.width,
          height: targetElement.size.height,
        };
        const sourceCenter: [number, number] = [sourceBounds.width / 2, sourceBounds.height / 2];
        const targetCenter: [number, number] = [
          targetBounds.x + targetBounds.width / 2,
          targetBounds.y + targetBounds.height / 2,
        ];
        const turnX = 80;
        const points: Array<[number, number]> = [
          sourceCenter,
          [turnX, sourceCenter[1]],
          [turnX, targetCenter[1]],
          targetCenter,
        ];
        const labelSize = relation.labelSize;
        if (labelSize === undefined) throw new Error('missing test label size');
        const labelCenter: [number, number] =
          reservation === 'horizontal' ? [50, sourceCenter[1] - 12] : [turnX + 18, 52];
        return {
          elements: [
            { id: sourceElement.id, bounds: sourceBounds },
            { id: targetElement.id, bounds: targetBounds },
          ],
          relations: [
            {
              points,
              labelBounds: {
                x: labelCenter[0] - labelSize.width / 2,
                y: labelCenter[1] - labelSize.height / 2,
                width: labelSize.width,
                height: labelSize.height,
              },
            },
          ],
        };
      });
      const definitions = resolveCoreProviderDependencies({
        contributions: [
          Flow.createFlowDiagramProviderContribution({
            flowLayouts: [customLayout],
            defaultFlowLayout: customLayout.name,
          }),
        ],
      });
      const source: IRChild = parseTestFlowDiagram({
        namespace: 'diagram',
        type: 'flow',
        entities: [
          { id: 'source', text: 'Source' },
          { id: 'target', text: 'Target' },
        ],
        groups: [],
        layouts: [],
        children: ['source', 'target'],
        relations: [{ source: 'source', target: 'target', label: 'edge-label' }],
      });
      const result = compileToScene(
        { type: 'scene', version: 1, children: [source] },
        {
          ...definitions,
          padding: 0,
          measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
        },
      );
      const label = textPrimitive(result.scene.primitives, 'edge-label');
      expect(label).toBeDefined();
      if (label === undefined) throw new Error('missing rendered relation label');
      const rotation = slopedLabelGroup(result.scene.primitives, 'edge-label')?.transforms?.find(
        transform => transform.kind === 'rotate',
      );
      return { label, rotation: rotation?.kind === 'rotate' ? rotation.degrees : undefined };
    };

    const horizontal = compile('horizontal');
    const vertical = compile('vertical');

    expect(horizontal.label.y).toBeLessThan(vertical.label.y);
    expect(vertical.label.x).toBeGreaterThan(horizontal.label.x);
    expect(horizontal.rotation).toBeDefined();
    expect(vertical.rotation).toBeDefined();
    expect(vertical.rotation).not.toBe(horizontal.rotation);
  });

  it('reports a final Graph relation probe failure as materialize with the authored relation context', () => {
    const failingRole = defineRelationRole({
      role: 'failing-relation',
      description: 'Fails only when Core materializes the Graph Relation marker',
      defaultDirection: 'forward',
      allowedDirections: ['forward'],
      directions: {
        forward: { sourceMarker: false, targetMarker: { shape: 'missing-flow-arrow' }, dashPattern: false },
      },
    });
    const definitions = resolveCoreProviderDependencies({
      contributions: [Flow.createFlowDiagramProviderContribution({ relationRoles: [failingRole] })],
    });
    const source: IRChild = parseTestFlowDiagram({
      namespace: 'diagram',
      type: 'flow',
      entities: [
        { id: 'source', text: 'Source' },
        { id: 'target', text: 'Target' },
      ],
      groups: [],
      layouts: [],
      children: ['source', 'target'],
      relations: [
        {
          source: 'source',
          target: 'target',
          role: 'failing-relation',
        },
      ],
    });

    try {
      compileToScene(
        { type: 'scene', version: 1, children: [source] },
        {
          ...definitions,
          padding: 0,
          measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
        },
      );
      expect.unreachable('Expected final Graph Relation probe to fail');
    } catch (error) {
      const diagramError = findDiagramError(error);
      expect(diagramError).toBeDefined();
      expect(diagramError?.code).toBe(RetikzDiagramErrorCode.FlowMaterializationFailed);
      expect(diagramError?.details).toMatchObject({
        stage: 'materialize',
        path: ['relations', 0],
        relatedIds: ['source', 'target'],
        definition: 'layered',
      });
      expect(diagramError?.cause).toBeDefined();
    }
  });

  it('wraps an exact Foundation allocation failure with the assemble stage and original cause', () => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [Flow.createFlowDiagramProviderContribution()],
    });
    const source: IRChild = parseTestFlowDiagram({
      namespace: 'diagram',
      type: 'flow',
      frame: { padding: 16 },
      entities: [{ id: 'only', text: 'Only' }],
      groups: [],
      layouts: [],
      children: ['only'],
    });

    try {
      compileToScene(
        {
          type: 'scene',
          version: 1,
          children: [
            createFlexLayout({
              size: { x: { kind: 'fixed', value: 20 }, y: { kind: 'fixed', value: 20 } },
              children: [{ kind: LayoutItemKind.Flex, child: source, grow: 1 }],
            }),
          ],
        },
        {
          ...definitions,
          padding: 0,
          measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
        },
      );
      expect.unreachable('Expected Flow Foundation assembly to fail');
    } catch (error) {
      const diagramError = findDiagramError(error);
      expect(diagramError).toBeDefined();
      expect(diagramError?.code).toBe(RetikzDiagramErrorCode.FlowMaterializationFailed);
      expect(diagramError?.details).toMatchObject({ stage: 'assemble', path: [] });
      expect(diagramError?.cause).toBeDefined();
    }
  });

  it('materializes recursive Group geometry and relation routing from one custom callback', () => {
    let callCount = 0;
    const customLayout = definition(layoutInput => {
      callCount += 1;
      const group = layoutInput.elements[0];
      const outside = layoutInput.elements[1];
      if (group.kind !== 'group' || outside.kind !== 'leaf') throw new Error('invalid test input');
      const child = group.elements[0];
      if (child.kind !== 'leaf') throw new Error('invalid test child');
      const groupWidth = group.contentInsets.left + child.size.width + group.contentInsets.right;
      const groupHeight = group.contentInsets.top + child.size.height + group.contentInsets.bottom;
      const outsideX = groupWidth + 48;
      const childCenter: [number, number] = [
        group.contentInsets.left + child.size.width / 2,
        group.contentInsets.top + child.size.height / 2,
      ];
      const outsideCenter: [number, number] = [outsideX + outside.size.width / 2, outside.size.height / 2];
      const labelSize = layoutInput.relations[0]?.labelSize;
      return {
        elements: [
          { id: group.id, bounds: { x: 0, y: 0, width: groupWidth, height: groupHeight } },
          {
            id: child.id,
            bounds: {
              x: group.contentInsets.left,
              y: group.contentInsets.top,
              width: child.size.width,
              height: child.size.height,
            },
          },
          { id: outside.id, bounds: { x: outsideX, y: 0, width: outside.size.width, height: outside.size.height } },
        ],
        relations: [
          {
            points: [childCenter, [outsideX - 16, childCenter[1]], [outsideX - 16, outsideCenter[1]], outsideCenter],
            ...(labelSize === undefined
              ? {}
              : {
                  labelBounds: {
                    x: outsideX - 16 - labelSize.width / 2,
                    y: childCenter[1] - labelSize.height - 4,
                    width: labelSize.width,
                    height: labelSize.height,
                  },
                }),
          },
        ],
      };
    });
    const contribution = Flow.createFlowDiagramProviderContribution({
      flowLayouts: [customLayout],
      defaultFlowLayout: customLayout.name,
    });
    const definitions = resolveCoreProviderDependencies({ contributions: [contribution] });
    const source: IRChild = parseTestFlowDiagram({
      namespace: 'diagram',
      type: 'flow',
      entities: [
        { id: 'nested', text: 'Nested' },
        { id: 'outside', text: 'Outside' },
      ],
      groups: [{ id: 'group', label: 'Group', children: ['nested'] }],
      layouts: [],
      children: ['group', 'outside'],
      relations: [
        {
          source: 'nested',
          target: 'outside',
          label: 'crosses',
          layout: { routing: { kind: 'orthogonal', cornerRadius: 6 } },
        },
      ],
    });
    const result = compileToScene(
      { type: 'scene', version: 1, children: [source] },
      {
        ...definitions,
        padding: 0,
        measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
      },
    );
    const artifactEnvelope = result.artifacts.find(
      artifact => artifact.kind === 'composite' && artifact.namespace === 'diagram' && artifact.type === 'flow',
    );
    const artifact = Flow.FlowDiagramArtifactSchema.parse(artifactEnvelope?.value);
    const group = artifact.elements[0];

    expect(callCount).toBe(1);
    expect(group).toMatchObject({
      id: 'group',
      kind: 'group',
      elements: [{ id: 'nested' }],
    });
    expect(artifact.relations[0]).toMatchObject({
      source: 'nested',
      target: 'outside',
      route: { kind: 'orthogonal', cornerRadius: 6 },
      labelReservation: { width: 56 },
    });
    expect(artifact.relations[0]?.labelReservation?.height).toBeGreaterThan(0);
    expect(result.spatialHandles.entries.map(entry => entry.key)).toEqual(
      expect.arrayContaining(['element:group', 'element:nested', 'element:outside']),
    );
    expect(JSON.stringify(result.scene)).toContain('crosses');
  });

  it('keeps Layout as a fixed zero-shell scope without Graph endpoint identity', () => {
    const customLayout = definition((layoutInput, context) => {
      const layout = layoutInput.elements[0];
      const outside = layoutInput.elements[1];
      if (layout.kind !== 'layout' || outside.kind !== 'leaf') throw new Error('invalid test input');
      const child = layout.elements[0];
      if (child.kind !== 'leaf') throw new Error('invalid test child');
      expect(layout.layout.direction).toBe('down');
      const placement = context.placeLayout({
        layout: {
          id: layout.id,
          direction: layout.layout.direction,
          gap: layout.layout.nodeGap,
          align: layout.align,
        },
        elements: [{ id: child.id, size: child.size, margin: child.margin }],
      });
      return {
        elements: [
          { id: layout.id, bounds: placement.bounds },
          { id: child.id, bounds: placement.elements[0].bounds },
          {
            id: outside.id,
            bounds: { x: child.size.width + 48, y: 0, width: outside.size.width, height: outside.size.height },
          },
        ],
        relations: [],
      };
    });
    const definitions = resolveCoreProviderDependencies({
      contributions: [
        Flow.createFlowDiagramProviderContribution({
          flowLayouts: [customLayout],
          defaultFlowLayout: customLayout.name,
        }),
      ],
    });
    const source: IRChild = Flow.FlowDiagramSchema.parse({
      namespace: 'diagram',
      type: 'flow',
      entities: [
        { id: 'nested', text: 'Nested' },
        { id: 'outside', text: 'Outside' },
      ],
      groups: [],
      layouts: [{ id: 'layout-only', direction: 'down', children: ['nested'] }],
      children: ['layout-only', 'outside'],
    });
    const result = compileToScene(
      { type: 'scene', version: 1, children: [source] },
      {
        ...definitions,
        padding: 0,
        measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
      },
    );
    const artifactEnvelope = result.artifacts.find(
      artifact => artifact.kind === 'composite' && artifact.namespace === 'diagram' && artifact.type === 'flow',
    );
    const artifact = Flow.FlowDiagramArtifactSchema.parse(artifactEnvelope?.value);
    const layoutArtifact = artifact.elements[0];
    const layoutHandle = result.spatialHandles.entries.find(entry => entry.key === 'element:layout-only');

    expect(layoutArtifact).toMatchObject({
      id: 'layout-only',
      kind: 'layout',
      elements: [{ id: 'nested', kind: 'entity' }],
    });
    expect(layoutHandle).toMatchObject({
      role: 'layout',
      payload: { id: 'layout-only', kind: 'layout' },
    });
    expect(JSON.stringify(result.scene)).not.toContain('layout-only');
    expect(JSON.stringify(result.scene)).toContain('Nested');
    expect(JSON.stringify(result.scene)).toContain('Outside');
  });

  it.each([
    ['right', 'x', 'y', 1],
    ['left', 'x', 'y', -1],
    ['down', 'y', 'x', 1],
    ['up', 'y', 'x', -1],
  ] as const)('places a real Layout %s through canonical Flex with end alignment', (direction, main, cross, sign) => {
    const definitions = resolveCoreProviderDependencies({
      contributions: [Flow.createFlowDiagramProviderContribution()],
    });
    const source: IRChild = Flow.FlowDiagramSchema.parse({
      namespace: 'diagram',
      type: 'flow',
      entities: [
        { id: 'short', text: 'A' },
        { id: 'long', text: 'Longer entity' },
      ],
      groups: [],
      layouts: [{ id: 'lane', direction, gap: 13, align: 'end', children: ['short', 'long'] }],
      children: ['lane'],
    });
    const result = compileToScene(
      { type: 'scene', version: 1, children: [source] },
      {
        ...definitions,
        padding: 0,
        measureText: text => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 }),
      },
    );
    const artifactEnvelope = result.artifacts.find(
      artifact => artifact.kind === 'composite' && artifact.namespace === 'diagram' && artifact.type === 'flow',
    );
    const artifact = Flow.FlowDiagramArtifactSchema.parse(artifactEnvelope?.value);
    const lane = artifact.elements[0];
    if (lane.kind !== 'layout') throw new Error('Expected Layout artifact');
    const [short, long] = lane.elements;
    const mainDelta = long.bounds[main] - short.bounds[main];
    const shortCrossEnd = short.bounds[cross] + (cross === 'x' ? short.bounds.width : short.bounds.height);
    const longCrossEnd = long.bounds[cross] + (cross === 'x' ? long.bounds.width : long.bounds.height);

    expect(Math.sign(mainDelta)).toBe(sign);
    expect(shortCrossEnd).toBe(longCrossEnd);
    expect(result.spatialHandles.entries).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'element:lane', role: 'layout' })]),
    );
  });
});

describe('Flow Graph materialization invariants', () => {
  it('reports authored id and Source path when validated layout geometry loses an element', () => {
    const source = parseTestFlowDiagram({
      namespace: 'diagram',
      type: 'flow',
      entities: [{ id: 'only', text: 'Only' }],
      groups: [],
      layouts: [],
      children: ['only'],
    });
    const diagram = resolveFlowDiagram(source, {
      theme: DEFAULT_RESOLVED_THEME,
      flowThemeStyles: resolveFlowThemeStyleRegistry(),
    });
    const measurement: FlowMeasurement = {
      diagram,
      input: {
        layout: {
          direction: 'right',
          nodeGap: 24,
          rankGap: 48,
          routing: { kind: 'straight' },
        },
        elements: [
          {
            kind: 'leaf',
            id: 'only',
            size: { width: 40, height: 20 },
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
          },
        ],
        relations: [],
      },
      elementMeasurements: new Map(),
      effectiveLayouts: new Map(),
    };

    try {
      materializeFlowGraph(measurement, { elements: [], relations: [] });
      expect.unreachable('Expected missing element geometry to fail materialization');
    } catch (error) {
      if (!(error instanceof RetikzDiagramError)) throw error;
      expect(error.code).toBe(RetikzDiagramErrorCode.FlowMaterializationFailed);
      expect(error.details).toEqual({
        stage: 'materialize',
        path: ['entities', 0],
        relatedIds: ['only'],
        reason: 'layout output omitted element bounds.',
      });
    }
  });
});
