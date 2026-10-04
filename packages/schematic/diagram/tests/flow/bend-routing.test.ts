import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import type { CompileWarning, ScenePrimitive } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import {
  createFlowDiagramProviderContribution,
  FlowDiagramArtifactSchema,
  FlowDiagramSchema,
  LayeredFlowLayoutDefinition,
} from '../../src/flow';
import type { FlowLayoutInput, FlowLayoutRoute, FlowLayoutOutput } from '../../src/flow';
import { FlowRouteArtifactSchema } from '../../src/flow';
import { executeFlowLayout } from '../../src/flow/pipeline';
import { createFlowBendCurve, flowRelationObstacles, scoreFlowBendNodes } from '../../src/flow/providers';
import { routeFlowRelations } from '../../src/flow/providers/layout/routing';
import { resolveEffectiveFlowLayout } from '../../src/flow/resolve';
import { findFlowCurveObstacleIntervals } from '../../src/flow/shared/geometry';

const routingInput = (): FlowLayoutInput => ({
  layout: { direction: 'right', nodeGap: 48, rankGap: 48, routing: { kind: 'bend', bendAngle: 60 } },
  elements: ['a', 'b', 'obstacle'].map(id => ({
    kind: 'leaf',
    id,
    size: { width: 4, height: 4 },
    margin: { top: 0, left: 0, bottom: 0, right: 0 },
  })),
  relations: [
    {
      source: { id: 'a', overlap: 'allow' },
      target: { id: 'b', overlap: 'allow' },
      direction: 'forward',
      routing: { kind: 'bend', bendAngle: 60 },
    },
  ],
});
const routingElements: FlowLayoutOutput['elements'] = [
  { id: 'a', bounds: { x: -2, y: -2, width: 4, height: 4 } },
  { id: 'b', bounds: { x: 198, y: -2, width: 4, height: 4 } },
  { id: 'obstacle', bounds: { x: 38, y: -39, width: 4, height: 4 } },
];

const flatten = (items: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  items.flatMap(item => (item.type === 'group' ? flatten(item.children) : [item]));

describe('Flow bend routing', () => {
  it.each([1, 100])('在 %s 倍尺度下排除曲线内侧空白并保留相切接触', scale => {
    const route = {
      kind: 'bend' as const,
      points: [
        [0, 0],
        [200 * scale, 0],
      ] as const,
      bendDirection: 'left' as const,
      bendAngle: 60,
    };
    const relation = routingInput().relations[0];
    const score = (bounds: { x: number; y: number; width: number; height: number }) =>
      scoreFlowBendNodes(route, relation, [
        {
          id: 'obstacle',
          bounds: {
            x: bounds.x * scale,
            y: bounds.y * scale,
            width: bounds.width * scale,
            height: bounds.height * scale,
          },
        },
      ])[0];
    expect(score({ x: 90, y: 100, width: 20, height: 20 })).toBe(0);
    expect(score({ x: 90, y: -10, width: 20, height: 5 })).toBe(0);
    // 盒中心在曲线包围盒之外，但上边缘仍与曲线相切
    expect(score({ x: 99, y: -77.73502691896257, width: 2, height: 20 })).toBe(1);
  });

  it('searches six candidates, prefers smaller angles on ties, and honors a fixed side', () => {
    const input = routingInput();
    const automatic: FlowLayoutInput = {
      ...input,
      relations: [{ ...input.relations[0], routing: { kind: 'bend' } }],
    };
    const clear = routingElements.map(element =>
      element.id === 'obstacle' ? { ...element, bounds: { x: 90, y: 200, width: 20, height: 2 } } : element,
    );
    expect(routeFlowRelations(automatic, clear)[0].route).toMatchObject({ bendDirection: 'left', bendAngle: 30 });
    const blockThirty = clear.map(element =>
      element.id === 'obstacle' ? { ...element, bounds: { x: 90, y: -30, width: 20, height: 60 } } : element,
    );
    expect(routeFlowRelations(automatic, blockThirty)[0].route).toMatchObject({
      bendDirection: 'left',
      bendAngle: 45,
    });
    const blockFortyFive = clear.map(element =>
      element.id === 'obstacle' ? { ...element, bounds: { x: 90, y: -45, width: 20, height: 90 } } : element,
    );
    expect(routeFlowRelations(automatic, blockFortyFive)[0].route).toMatchObject({
      bendDirection: 'left',
      bendAngle: 60,
    });
    const fixedSide: FlowLayoutInput = {
      ...automatic,
      relations: [{ ...automatic.relations[0], routing: { kind: 'bend', bendDirection: 'right' } }],
    };
    expect(routeFlowRelations(fixedSide, blockFortyFive)[0].route).toMatchObject({
      bendDirection: 'right',
      bendAngle: 60,
    });
    expect(routeFlowRelations(automatic, blockFortyFive)).toEqual(routeFlowRelations(automatic, blockFortyFive));
  });

  it('preserves omitted angles through resolution and locks inherited explicit zero and negative angles', () => {
    const automatic = resolveEffectiveFlowLayout(LayeredFlowLayoutDefinition, {}, undefined, { kind: 'bend' });
    expect(automatic.routing).toEqual({ kind: 'bend' });
    expect(
      resolveEffectiveFlowLayout(LayeredFlowLayoutDefinition, {}, automatic, { kind: 'bend', bendDirection: 'right' })
        .routing,
    ).toEqual({ kind: 'bend', bendDirection: 'right' });
    for (const bendAngle of [0, -45, 30]) {
      const parent = resolveEffectiveFlowLayout(LayeredFlowLayoutDefinition, {}, automatic, {
        kind: 'bend',
        bendAngle,
      });
      expect(resolveEffectiveFlowLayout(LayeredFlowLayoutDefinition, {}, parent, { kind: 'bend' }).routing).toEqual({
        kind: 'bend',
        bendAngle,
      });
    }
  });

  it('accepts only automatic candidate angles and preserves the symmetric family at the provider boundary', () => {
    const input: FlowLayoutInput = {
      ...routingInput(),
      relations: [{ ...routingInput().relations[0], routing: { kind: 'bend' } }],
    };
    const run = (route: FlowLayoutRoute) =>
      executeFlowLayout(
        {
          ...LayeredFlowLayoutDefinition,
          layout: () => ({
            elements: routingElements,
            relations: [{ source: { id: 'a' }, target: { id: 'b' }, route }],
          }),
        },
        input,
      );
    for (const bendAngle of [30, 45, 60]) {
      const route: FlowLayoutRoute = {
        kind: 'bend',
        bendDirection: 'right',
        bendAngle,
        points: [
          [0, 0],
          [200, 0],
        ],
      };
      expect(run(route).relations[0].route).toEqual(route);
    }
    expect(() =>
      run({
        kind: 'bend',
        bendDirection: 'left',
        bendAngle: 75,
        points: [
          [0, 0],
          [200, 0],
        ],
      }),
    ).toThrow('automatic bend');
    expect(() =>
      run({
        kind: 'bend',
        outAngle: 0,
        inAngle: 180,
        looseness: 1,
        points: [
          [0, 0],
          [200, 0],
        ],
      }),
    ).toThrow('parameter family');
  });

  it('rejects the legacy relation output record from an external provider', () => {
    const outputJson = JSON.stringify({
      elements: routingElements,
      relations: [
        {
          points: [
            [0, 0],
            [200, 0],
          ],
        },
      ],
    });
    expect(() =>
      executeFlowLayout({ ...LayeredFlowLayoutDefinition, layout: () => JSON.parse(outputJson) }, routingInput()),
    ).toThrow('closed relation output');
  });
  it('uses reserved labels as a secondary score but never trades a clear node route for a clear label', () => {
    const input = routingInput();
    const labelRelation = {
      ...input.relations[0],
      routing: { kind: 'straight' as const },
      labelSize: { width: 30, height: 20 },
      labelPlacement: { side: 'top' as const, distance: 48 },
    };
    const labeled = { ...input, relations: [labelRelation, input.relations[0]] };
    const clear = routingElements.map(element =>
      element.id === 'obstacle' ? { ...element, bounds: { x: 98, y: 200, width: 4, height: 4 } } : element,
    );
    expect(routeFlowRelations(labeled, clear)[1].route).toMatchObject({ bendDirection: 'right', bendAngle: 60 });
    const nodeOnRight = clear.map(element =>
      element.id === 'obstacle' ? { ...element, bounds: { x: 98, y: 56, width: 4, height: 4 } } : element,
    );
    expect(routeFlowRelations(labeled, nodeOnRight)[1].route).toMatchObject({
      bendDirection: 'left',
      bendAngle: 60,
    });
  });
  it('artifact translates reference endpoints together while the drawing contains the curve extent', () => {
    let output: FlowLayoutOutput | undefined;
    const provider = {
      ...LayeredFlowLayoutDefinition,
      name: 'capture',
      layout: (...args: Parameters<typeof LayeredFlowLayoutDefinition.layout>) => {
        output = LayeredFlowLayoutDefinition.layout(...args);
        return output;
      },
    };
    const source = FlowDiagramSchema.parse({
      namespace: 'diagram',
      type: 'flow',
      presentation: { title: { text: 'Offset title' } },
      entities: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
      ],
      groups: [],
      layouts: [],
      children: ['a', 'b'],
      relations: [
        {
          source: 'a',
          target: 'b',
          routing: { kind: 'bend', bendDirection: 'left', bendAngle: 120 },
          label: { text: 'Label', sloped: true },
        },
      ],
    });
    const result = compileToScene(
      { type: 'scene', version: 1, children: [source] },
      resolveCoreProviderDependencies({
        contributions: [
          createFlowDiagramProviderContribution({ flowLayouts: [provider], defaultFlowLayout: provider.name }),
        ],
      }),
    );
    const artifact = FlowDiagramArtifactSchema.parse(
      result.artifacts.find(item => item.kind === 'composite' && item.namespace === 'diagram' && item.type === 'flow')
        ?.value,
    );
    if (output === undefined) throw new Error('expected layout output');
    const before = output.relations[0].route;
    const after = artifact.relations[0].route;
    expect(after).toMatchObject({ kind: 'bend', bendAngle: 120, bendDirection: 'left' });
    const delta = after.points[0].map((value, axis) => value - before.points[0][axis]);
    expect(delta[1]).not.toBe(0);
    after.points.forEach((point, index) =>
      point.forEach((value, axis) => expect(value).toBeCloseTo(before.points[index][axis] + delta[axis])),
    );
    expect(artifact.regions.drawing.visualBounds.height).toBeGreaterThan(
      Math.max(...output.elements.map(element => element.bounds.height)),
    );
    expect(JSON.parse(JSON.stringify(artifact))).toEqual(artifact);
  });
  it('rejects unsupported bend before invoking a custom layout callback', () => {
    let calls = 0;
    const provider = {
      ...LayeredFlowLayoutDefinition,
      name: 'straight-only',
      capabilities: { ...LayeredFlowLayoutDefinition.capabilities, routing: [{ kind: 'straight' as const }] },
      defaults: { ...LayeredFlowLayoutDefinition.defaults, routing: { kind: 'straight' as const } },
      layout: (...args: Parameters<typeof LayeredFlowLayoutDefinition.layout>) => {
        calls++;
        return LayeredFlowLayoutDefinition.layout(...args);
      },
    };
    const source = FlowDiagramSchema.parse({
      namespace: 'diagram',
      type: 'flow',
      entities: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
      ],
      groups: [],
      layouts: [],
      children: ['a', 'b'],
      relations: [{ source: 'a', target: 'b', routing: { kind: 'bend' } }],
    });
    expect(() =>
      compileToScene(
        { type: 'scene', version: 1, children: [source] },
        resolveCoreProviderDependencies({
          contributions: [
            createFlowDiagramProviderContribution({ flowLayouts: [provider], defaultFlowLayout: provider.name }),
          ],
        }),
      ),
    ).toThrowError(
      expect.objectContaining({
        cause: expect.objectContaining({
          code: 'DIAGRAM_FLOW_LAYOUT_CAPABILITY_UNSUPPORTED',
          details: expect.objectContaining({ missingCapabilities: ['routing:bend'] }),
        }),
      }),
    );
    expect(calls).toBe(0);
  });
  it('rejects a sloped label reservation with unrotated dimensions', () => {
    const input = routingInput();
    const relation = {
      ...input.relations[0],
      labelSize: { width: 40, height: 10 },
      labelPlacement: { sloped: true, position: 0.2 },
    };
    const labeled = { ...input, relations: [relation] };
    const relations = routeFlowRelations(labeled, routingElements);
    const provider = { ...LayeredFlowLayoutDefinition, layout: () => ({ elements: routingElements, relations }) };
    expect(executeFlowLayout(provider, labeled).relations[0].labelBounds).toEqual(relations[0].labelBounds);
    expect(() =>
      executeFlowLayout(
        {
          ...provider,
          layout: () => ({
            elements: routingElements,
            relations: [{ ...relations[0], labelBounds: { x: 0, y: 0, width: 40, height: 10 } }],
          }),
        },
        labeled,
      ),
    ).toThrow('preserve measured size');
  });
  it('rejects mixed, incomplete, legacy and nonfinite persisted routes at the external boundary', () => {
    const valid = {
      kind: 'bend',
      points: [
        [0, 0],
        [200, 0],
      ],
      bendDirection: 'left',
      bendAngle: 30,
    };
    expect(FlowRouteArtifactSchema.safeParse(valid).success).toBe(true);
    for (const value of [
      { ...valid, outAngle: 0 },
      { ...valid, bendDirection: undefined },
      {
        ...valid,
        points: [
          [0, 0],
          [100, 0],
          [200, 0],
        ],
      },
      { ...valid, bendAngle: Infinity },
      { points: valid.points },
    ]) {
      expect(FlowRouteArtifactSchema.safeParse(value).success).toBe(false);
    }
  });
  it('retains both-side conflicts and treats tangent contact conservatively', () => {
    const input = routingInput();
    const blocked = routingElements.map(element =>
      element.id === 'obstacle' ? { ...element, bounds: { x: 80, y: -100, width: 40, height: 200 } } : element,
    );
    const output = routeFlowRelations(input, blocked);
    expect(output[0].route).toMatchObject({ kind: 'bend', bendDirection: 'left', bendAngle: 60 });
    if (output[0].route.kind !== 'bend') throw new Error('expected bend');
    expect(
      scoreFlowBendNodes(
        output[0].route,
        input.relations[0],
        flowRelationObstacles(input, { elements: blocked }, input.relations[0]),
      )[0],
    ).toBe(1);
    const segment = createFlowBendCurve({
      kind: 'bend',
      points: [
        [0, 0],
        [200, 0],
      ],
      bendDirection: 'left',
      bendAngle: 60,
    });
    expect(
      findFlowCurveObstacleIntervals(segment, { x: 99, y: -57.735026918962575, width: 2, height: 0 }).length,
    ).toBeGreaterThan(0);
  });
  it('partial tangents preserve zero and different routing kinds break inheritance', () => {
    const root = resolveEffectiveFlowLayout(LayeredFlowLayoutDefinition, {}, undefined, {
      kind: 'bend',
      outAngle: 45,
      inAngle: 90,
      looseness: 2,
    });
    expect(
      resolveEffectiveFlowLayout(LayeredFlowLayoutDefinition, {}, root, { kind: 'bend', outAngle: 0 }).routing,
    ).toEqual({ kind: 'bend', outAngle: 0, inAngle: 90, looseness: 2 });
    const axis = resolveEffectiveFlowLayout(LayeredFlowLayoutDefinition, {}, root, {
      kind: 'orthogonal',
      cornerRadius: 12,
    });
    expect(resolveEffectiveFlowLayout(LayeredFlowLayoutDefinition, {}, axis, { kind: 'bend' }).routing).toEqual({
      kind: 'bend',
    });
  });
  it('legal endpoint ingress is exempt but a tangent route reentering its source is a conflict', () => {
    const route = {
      kind: 'bend' as const,
      points: [
        [0, 0],
        [200, 0],
      ] as const,
      outAngle: 180,
      inAngle: 180,
      looseness: 8,
    };
    const segment = createFlowBendCurve(route);
    const intervals = findFlowCurveObstacleIntervals(segment, routingElements[0].bounds, true, false);
    expect(intervals).toHaveLength(1);
    expect(intervals[0][0]).toBeGreaterThan(0.5);
    const ordinary = { kind: 'bend' as const, points: route.points, bendDirection: 'left' as const, bendAngle: 30 };
    expect(
      findFlowCurveObstacleIntervals(createFlowBendCurve(ordinary), routingElements[0].bounds, true, false),
    ).toEqual([]);
  });

  it('relevant Group shells and invisible Layouts are not solid while their children remain obstacles', () => {
    const input = routingInput();
    const grouped: FlowLayoutInput = {
      ...input,
      elements: [
        {
          kind: 'group',
          id: 'g',
          minimumSize: { width: 220, height: 100 },
          contentInsets: { top: 0, right: 0, bottom: 0, left: 0 },
          layout: input.layout,
          elements: input.elements,
        },
      ],
    };
    const obstacles = flowRelationObstacles(
      grouped,
      { elements: [{ id: 'g', bounds: { x: -10, y: -80, width: 220, height: 100 } }, ...routingElements] },
      input.relations[0],
    );
    expect(obstacles.map(obstacle => obstacle.id)).toEqual(['a', 'b', 'obstacle']);
    expect(
      scoreFlowBendNodes(
        {
          kind: 'bend',
          points: [
            [0, 0],
            [200, 0],
          ],
          bendDirection: 'left',
          bendAngle: 60,
        },
        input.relations[0],
        obstacles,
      )[0],
    ).toBe(1);
  });

  it('conflicting custom bends emit a source-located warning and remain drawable', () => {
    const provider = {
      ...LayeredFlowLayoutDefinition,
      name: 'fixed-bend',
      layout: (input: FlowLayoutInput) => {
        const elements = input.elements.map((element, index) => {
          if (element.kind !== 'leaf') throw new Error('leaf fixture required');
          const center = [
            [0, 0],
            [400, 0],
            [200, -115],
          ][index];
          return {
            id: element.id,
            bounds: { x: center[0] - element.size.width / 2, y: center[1] - element.size.height / 2, ...element.size },
          };
        });
        return { elements, relations: routeFlowRelations(input, elements) };
      },
    };
    const source = FlowDiagramSchema.parse({
      namespace: 'diagram',
      type: 'flow',
      entities: ['a', 'b', 'obstacle'].map(id => ({ id, text: id })),
      groups: [],
      layouts: [],
      children: ['a', 'b', 'obstacle'],
      relations: [{ source: 'a', target: 'b', routing: { kind: 'bend', bendDirection: 'left', bendAngle: 60 } }],
    });
    const warnings: Array<CompileWarning> = [];
    const result = compileToScene(
      { type: 'scene', version: 1, children: [source] },
      {
        ...resolveCoreProviderDependencies({
          contributions: [
            createFlowDiagramProviderContribution({ flowLayouts: [provider], defaultFlowLayout: provider.name }),
          ],
        }),
        onWarn: warning => {
          if (warning.code === 'FlowBendObstacleConflict') warnings.push(warning);
        },
      },
    );
    expect(warnings).toHaveLength(1);
    expect(JSON.stringify(warnings[0])).toContain('relations[0]');
    expect(
      flatten(result.scene.primitives).some(
        item => item.type === 'path' && item.commands.some(command => command.kind === 'cubic'),
      ),
    ).toBe(true);
  });

  it('bend overflow preserves the Core cause and offending relation path', () => {
    const input = routingInput();
    const overflowing: FlowLayoutInput = {
      ...input,
      relations: [
        input.relations[0],
        { ...input.relations[0], routing: { kind: 'bend', outAngle: 0, inAngle: 180, looseness: Number.MAX_VALUE } },
      ],
    };
    expect(() =>
      executeFlowLayout(
        {
          ...LayeredFlowLayoutDefinition,
          layout: received => ({
            elements: routingElements,
            relations: routeFlowRelations(received, routingElements),
          }),
        },
        overflowing,
      ),
    ).toThrow(
      expect.objectContaining({
        code: 'DIAGRAM_FLOW_MATERIALIZATION_FAILED',
        details: expect.objectContaining({ path: ['relations', 1] }),
        cause: expect.objectContaining({ code: 'CORE_COMPILE_ERROR' }),
      }),
    );
  });
  it('auto bend chooses the clear side at the authored angle using off-midpoint obstacles', () => {
    const input = routingInput();
    const first = routeFlowRelations(input, routingElements);
    expect(first[0].route).toMatchObject({ kind: 'bend', bendDirection: 'right', bendAngle: 60 });
    expect(routeFlowRelations(input, routingElements)).toEqual(first);
    expect(
      routeFlowRelations({ ...input, relations: [{ ...input.relations[0], direction: 'reverse' }] }, routingElements),
    ).toEqual(first);
    expect(routingElements[0].bounds.x).toBe(-2);
  });

  it('unlabeled parallel routes do not affect selection through overlap or crossings', () => {
    const input = routingInput();
    const elements = routingElements.map(element =>
      element.id === 'obstacle' ? { ...element, bounds: { ...element.bounds, y: 200 } } : element,
    );
    const routes = routeFlowRelations(
      { ...input, relations: [input.relations[0], input.relations[0], input.relations[0]] },
      elements,
    );
    expect(routes.map(output => output.route)).toEqual([
      expect.objectContaining({ kind: 'bend', bendDirection: 'left', bendAngle: 60 }),
      expect.objectContaining({ kind: 'bend', bendDirection: 'left', bendAngle: 60 }),
      expect.objectContaining({ kind: 'bend', bendDirection: 'left', bendAngle: 60 }),
    ]);
  });

  it('a crossing unlabeled edge does not redirect the chosen bend', () => {
    const input = routingInput();
    const elements = [
      ...routingElements.map(element =>
        element.id === 'obstacle' ? { ...element, bounds: { ...element.bounds, y: 200 } } : element,
      ),
      { id: 'c', bounds: { x: 98, y: -152, width: 4, height: 4 } },
      { id: 'd', bounds: { x: 98, y: -12, width: 4, height: 4 } },
    ];
    const crossing: FlowLayoutInput = {
      ...input,
      elements: [...input.elements, ...['c', 'd'].map(id => ({ ...input.elements[0], id }))],
      relations: [
        input.relations[0],
        {
          source: { id: 'c', overlap: 'allow' },
          target: { id: 'd', overlap: 'allow' },
          direction: 'forward',
          routing: { kind: 'straight' },
        },
      ],
    };
    expect(routeFlowRelations(crossing, elements)[0].route).toMatchObject({ bendDirection: 'left', bendAngle: 60 });
  });

  it('custom output preserves centers and explicit parameters', () => {
    const input = routingInput();
    const explicit = {
      ...input,
      relations: [
        { ...input.relations[0], routing: { kind: 'bend' as const, bendDirection: 'right' as const, bendAngle: 60 } },
      ],
    };
    const valid: FlowLayoutRoute = {
      kind: 'bend',
      bendDirection: 'right',
      bendAngle: 60,
      points: [
        [0, 0],
        [200, 0],
      ],
    };
    const run = (route: FlowLayoutRoute) =>
      executeFlowLayout(
        {
          ...LayeredFlowLayoutDefinition,
          layout: () => ({
            elements: routingElements,
            relations: [{ source: { id: 'a' }, target: { id: 'b' }, route }],
          }),
        },
        explicit,
      );
    expect(run(valid).relations[0].route).toEqual(valid);
    expect(() => run({ ...valid, bendDirection: 'left' })).toThrow('preserve effective input');
    expect(() =>
      run({
        ...valid,
        points: [
          [1, 0],
          [200, 0],
        ],
      }),
    ).toThrow('match assigned endpoint positions');
    expect(() => run({ ...valid, bendAngle: 30 })).toThrow('preserve effective input');
  });

  it('coincident reference endpoints are retained for distinct endpoint identities', () => {
    const input = routingInput();
    const routes = routeFlowRelations(
      input,
      routingElements.map(element =>
        element.id === 'b' ? { ...element, bounds: routingElements[0].bounds } : element,
      ),
    );
    expect(routes[0].route.points).toEqual([
      [0, 0],
      [0, 0],
    ]);
  });
  it('inherits only the active parameter family and supports explicit symmetric exit', () => {
    const root = resolveEffectiveFlowLayout(LayeredFlowLayoutDefinition, {}, undefined, {
      kind: 'bend',
      outAngle: 45,
      bendAngle: 70,
      bendDirection: 'right',
    });
    expect(root.routing).toEqual({ kind: 'bend', outAngle: 45, inAngle: 180, looseness: 1 });
    expect(resolveEffectiveFlowLayout(LayeredFlowLayoutDefinition, {}, root, { kind: 'bend' }).routing).toEqual(
      root.routing,
    );
    expect(
      resolveEffectiveFlowLayout(LayeredFlowLayoutDefinition, {}, root, { kind: 'bend', bendAngle: 0 }).routing,
    ).toEqual({ kind: 'bend', bendAngle: 0 });
    expect(
      resolveEffectiveFlowLayout(LayeredFlowLayoutDefinition, {}, undefined, { kind: 'bend', looseness: 4 }).routing,
    ).toEqual({ kind: 'bend' });
  });

  it('explicit bend lowers to cubic and preserves reference parameters in the artifact', () => {
    const source = FlowDiagramSchema.parse({
      namespace: 'diagram',
      type: 'flow',
      entities: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
      ],
      groups: [],
      layouts: [],
      children: ['a', 'b'],
      relations: [{ source: 'a', target: 'b', routing: { kind: 'bend', bendDirection: 'right', bendAngle: 60 } }],
    });
    const result = compileToScene(
      { type: 'scene', version: 1, children: [source] },
      resolveCoreProviderDependencies({ contributions: [createFlowDiagramProviderContribution()] }),
    );
    const artifact = FlowDiagramArtifactSchema.parse(
      result.artifacts.find(item => item.kind === 'composite' && item.namespace === 'diagram' && item.type === 'flow')
        ?.value,
    );
    expect(artifact.relations[0].route).toMatchObject({ kind: 'bend', bendDirection: 'right', bendAngle: 60 });
    expect(artifact.relations[0].route.points).toHaveLength(2);
    expect(
      flatten(result.scene.primitives)
        .filter(item => item.type === 'path')
        .some(path => path.commands.some(command => command.kind === 'cubic')),
    ).toBe(true);
  });
});
