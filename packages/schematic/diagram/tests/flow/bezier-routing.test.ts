import { describe, expect, it } from 'vitest';

import { FlowRoutingSchema, FlowDiagramSchema } from '../../src/flow';
import { evaluateFlowBezierConflicts, flowRouteLabelBounds } from '../../src/flow/providers';

describe('Bezier authoring contract', () => {
  it.each([
    { kind: 'curve' },
    { kind: 'cubic' },
    { kind: 'curve', control: [80, -40] },
    { kind: 'cubic', control1: [20, -40], control2: [120, 60] },
  ])('preserves input and JSON round-trip: $kind', routing => {
    expect(FlowRoutingSchema.parse(routing)).toEqual(routing);
    expect(FlowRoutingSchema.parse(JSON.parse(JSON.stringify(routing)))).toEqual(routing);
  });
  it.each([
    { kind: 'cubic', control1: [20, 30] },
    { kind: 'cubic', control2: [20, 30] },
    { kind: 'curve', mode: 'auto' },
    { kind: 'curve', control: null },
    { kind: 'curve', control1: [20, 30] },
    { kind: 'cubic', control: [20, 30] },
  ])('rejects partial controls, invalid controls and unrelated fields', routing => {
    expect(FlowRoutingSchema.safeParse(routing).success).toBe(false);
  });
  it('rejects Bezier as root and Group routing defaults', () => {
    const source = {
      namespace: 'diagram',
      type: 'flow',
      entities: [{ id: 'a', text: 'A' }],
      groups: [],
      layouts: [],
      children: ['a'],
    };
    expect(FlowDiagramSchema.safeParse({ ...source, routing: { kind: 'curve' } }).success).toBe(false);
    expect(
      FlowDiagramSchema.safeParse({
        ...source,
        groups: [{ id: 'g', children: ['a'], routing: { kind: 'cubic' } }],
        children: ['g'],
      }).success,
    ).toBe(false);
  });
});

// 布局层契约：形状、避让、确定性与不可变作者点
import type { FlowLayoutInput, FlowLayoutOutput } from '../../src/flow';
import { LayeredFlowLayoutDefinition } from '../../src/flow';
import { executeFlowLayout } from '../../src/flow/pipeline';
import { routeLayeredRelations } from '../../src/flow/providers/layout/layered/routing';
import { findFlowCurveObstacleIntervals } from '../../src/flow/shared/geometry';

const elements: FlowLayoutOutput['elements'] = [
  { id: 'a', bounds: { x: -2, y: -2, width: 4, height: 4 } },
  { id: 'b', bounds: { x: 198, y: -2, width: 4, height: 4 } },
  { id: 'obstacle', bounds: { x: 90, y: -15, width: 20, height: 30 } },
];
const inputFor = (routing: FlowLayoutInput['relations'][number]['routing']): FlowLayoutInput => ({
  layout: { direction: 'right', nodeGap: 48, rankGap: 48, routing: { kind: 'straight' } },
  elements: elements.map(element => ({
    kind: 'leaf',
    id: element.id,
    size: { width: element.bounds.width, height: element.bounds.height },
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
  })),
  relations: [{ source: 'a', target: 'b', direction: 'forward', routing }],
});

describe('Bezier layout', () => {
  it.each(['curve', 'cubic'] as const)('automatically avoids a central obstacle deterministically: %s', kind => {
    const input = inputFor(kind === 'curve' ? { kind } : { kind });
    const before = JSON.stringify(input);
    const result = routeLayeredRelations(input, elements);
    expect(result).toEqual(routeLayeredRelations(input, elements));
    expect(JSON.stringify(input)).toBe(before);
    const route = result[0].route;
    if (route.kind !== 'curve' && route.kind !== 'cubic') throw new Error('expected Bezier');
    const segment =
      route.kind === 'curve'
        ? {
            kind: 'quadraticBezier' as const,
            from: [...route.points[0]] as [number, number],
            to: [...route.points[1]] as [number, number],
            control: [...route.control] as [number, number],
          }
        : {
            kind: 'cubicBezier' as const,
            from: [...route.points[0]] as [number, number],
            to: [...route.points[1]] as [number, number],
            control1: [...route.control1] as [number, number],
            control2: [...route.control2] as [number, number],
          };
    expect(findFlowCurveObstacleIntervals(segment, elements[2].bounds)).toEqual([]);
  });
  it('rejects provider mutation of explicit controls while accepting value-equal clones', () => {
    const input = inputFor({ kind: 'curve', control: [100, -80] });
    const provider = {
      ...LayeredFlowLayoutDefinition,
      layout: () => ({
        elements,
        relations: [
          {
            route: {
              kind: 'curve' as const,
              points: [
                [0, 0],
                [200, 0],
              ] as [[number, number], [number, number]],
              control: [100, -80] as [number, number],
            },
          },
        ],
      }),
    };
    expect(executeFlowLayout(provider, input).relations[0].route).toMatchObject({ control: [100, -80] });
    expect(() =>
      executeFlowLayout(
        {
          ...provider,
          layout: () => ({
            elements,
            relations: [
              {
                route: {
                  kind: 'curve',
                  points: [
                    [0, 0],
                    [200, 0],
                  ],
                  control: [100, -79],
                },
              },
            ],
          }),
        },
        input,
      ),
    ).toThrow('preserve effective input');
  });
  it('rejects coincident automatic endpoints', () => {
    expect(() =>
      routeLayeredRelations(
        inputFor({ kind: 'cubic' }),
        elements.map(element => (element.id === 'b' ? { ...element, bounds: elements[0].bounds } : element)),
      ),
    ).toThrow('Bezier');
  });
});

import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import type { CompileWarning, ScenePrimitive } from '@retikz/core';

import { createFlowDiagramProviderContribution, FlowDiagramArtifactSchema } from '../../src/flow';
import type { FlowLayoutDefinition, IRFlowRouting } from '../../src/flow';

const flatten = (items: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  items.flatMap(item => (item.type === 'group' ? flatten(item.children) : [item]));
const compileBezier = (
  routing: IRFlowRouting,
  provider?: FlowLayoutDefinition,
  direction: 'forward' | 'reverse' | 'both' | 'none' = 'forward',
) => {
  const warnings: Array<CompileWarning> = [];
  const source = FlowDiagramSchema.parse({
    namespace: 'diagram',
    type: 'flow',
    presentation: { title: { text: 'Bezier' } },
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
        role: 'association',
        direction,
        routing,
        label: { text: 'Label', sloped: true, position: 0 },
      },
    ],
  });
  const result = compileToScene(
    { type: 'scene', version: 1, children: [source] },
    {
      ...resolveCoreProviderDependencies({
        contributions: [
          createFlowDiagramProviderContribution(
            provider === undefined ? {} : { flowLayouts: [provider], defaultFlowLayout: provider.name },
          ),
        ],
      }),
      onWarn: warning => warnings.push(warning),
    },
  );
  const artifact = FlowDiagramArtifactSchema.parse(
    result.artifacts.find(item => item.kind === 'composite' && item.namespace === 'diagram' && item.type === 'flow')
      ?.value,
  );
  return { result, artifact, warnings };
};

it.each(['forward', 'reverse', 'both', 'none'] as const)(
  'preserves explicit cubic controls and translates all coordinates once: %s',
  direction => {
    const routing = {
      kind: 'cubic' as const,
      control1: [-40, -90] as [number, number],
      control2: [180, 70] as [number, number],
    };
    const { artifact, result } = compileBezier(routing, undefined, direction);
    const route = artifact.relations[0].route;
    if (route.kind !== 'cubic') throw new Error('expected cubic artifact');
    const origin = artifact.regions.drawing.origin;
    expect(route.control1.map((value, index) => value - origin[index])).toEqual(routing.control1);
    expect(route.control2.map((value, index) => value - origin[index])).toEqual(routing.control2);
    expect(origin[1]).not.toBe(0);
    expect(artifact.relations[0].labelReservation).toBeDefined();
    expect(JSON.parse(JSON.stringify(artifact))).toEqual(artifact);
    expect(
      flatten(result.scene.primitives).some(
        item => item.type === 'path' && item.commands.some(command => command.kind === 'cubic'),
      ),
    ).toBe(true);
  },
);
it('lowers explicit quadratic to native quad and round-trips artifact control using origin', () => {
  const first = compileBezier({ kind: 'curve', control: [100, -90] });
  const route = first.artifact.relations[0].route;
  if (route.kind !== 'curve') throw new Error('expected curve');
  const origin = first.artifact.regions.drawing.origin;
  const second = compileBezier({
    kind: 'curve',
    control: [route.control[0] - origin[0], route.control[1] - origin[1]],
  });
  expect(second.artifact).toEqual(first.artifact);
  expect(
    flatten(first.result.scene.primitives).some(
      item => item.type === 'path' && item.commands.some(command => command.kind === 'quad'),
    ),
  ).toBe(true);
});
it('checks automatic capability before callback, but permits complete explicit controls', () => {
  let calls = 0;
  const provider: FlowLayoutDefinition = {
    ...LayeredFlowLayoutDefinition,
    name: 'explicit-only',
    capabilities: {
      ...LayeredFlowLayoutDefinition.capabilities,
      routing: [{ kind: 'straight' }, { kind: 'orthogonal' }, { kind: 'curve', modes: ['explicit'] }],
    },
    layout: (input, context) => {
      calls++;
      return LayeredFlowLayoutDefinition.layout(input, context);
    },
  };
  expect(() => compileBezier({ kind: 'curve' }, provider)).toThrow('required capabilities');
  expect(calls).toBe(0);
  compileBezier({ kind: 'curve', control: [100, -90] }, provider);
  expect(calls).toBe(1);
});
it('keeps conflicted explicit controls and distinguishes automatic conflict warnings', () => {
  const provider: FlowLayoutDefinition = {
    ...LayeredFlowLayoutDefinition,
    name: 'conflicted',
    layout: (input, context) => {
      const output = LayeredFlowLayoutDefinition.layout(input, context);
      return {
        ...output,
        relations: output.relations.map((relation, index) => {
          const points = relation.route.points;
          const authored = input.relations[index].routing;
          const route = {
            kind: 'curve' as const,
            points: [points[0], points[1]] as const,
            control: authored.kind === 'curve' && authored.control !== undefined ? authored.control : points[0],
          };
          const labelBounds = flowRouteLabelBounds(route, input.relations[index]);
          return { route, ...(labelBounds === undefined ? {} : { labelBounds }) };
        }),
      };
    },
  };
  const explicit = compileBezier({ kind: 'curve', control: [-100, 0] }, provider);
  expect(explicit.warnings.some(warning => warning.code === 'FlowBezierObstacleConflict')).toBe(true);
  const automatic = compileBezier({ kind: 'curve' }, provider);
  expect(automatic.warnings.some(warning => warning.code === 'FlowBezierSearchExhausted')).toBe(true);
});

it.each(['curve', 'cubic'] as const)(
  'preserves avoidance under quarter-turn, translation and reversed endpoints: %s',
  kind => {
    const scenarios = [
      elements,
      elements.map(element => ({
        ...element,
        bounds: {
          x: 300 - element.bounds.y - element.bounds.height,
          y: 50 + element.bounds.x,
          width: element.bounds.height,
          height: element.bounds.width,
        },
      })),
    ];
    for (const output of scenarios)
      for (const reverse of [false, true]) {
        const input = inputFor(kind === 'curve' ? { kind } : { kind });
        const relation = { ...input.relations[0], source: reverse ? 'b' : 'a', target: reverse ? 'a' : 'b' };
        const route = routeLayeredRelations({ ...input, relations: [relation] }, output)[0].route;
        if (route.kind !== 'curve' && route.kind !== 'cubic') throw new Error('Bezier expected');
        expect(
          evaluateFlowBezierConflicts(route, relation, [{ id: 'obstacle', bounds: output[2].bounds }], []).nodes,
        ).toBe(0);
      }
  },
);
it('returns a collinear baseline when clear and expands for a reserved label', () => {
  const input = inputFor({ kind: 'curve' });
  const clear = elements.map(element =>
    element.id === 'obstacle' ? { ...element, bounds: { ...element.bounds, y: 200 } } : element,
  );
  expect(routeLayeredRelations(input, clear)[0].route).toMatchObject({ control: [100, 0] });
  const other = {
    ...input.relations[0],
    routing: { kind: 'straight' as const },
    labelSize: { width: 35, height: 25 },
    labelPlacement: { placement: 'inside' as const, position: 0.5 },
  };
  const result = routeLayeredRelations({ ...input, relations: [other, ...input.relations] }, clear);
  expect(result[1].route).not.toMatchObject({ control: [100, 0] });
});
it('uses subcurve boxes to exclude empty interiors while retaining tangency and endpoint re-entry', () => {
  const quadratic = {
    kind: 'quadraticBezier' as const,
    from: [0, 0] as [number, number],
    to: [200, 0] as [number, number],
    control: [100, -100] as [number, number],
  };
  expect(findFlowCurveObstacleIntervals(quadratic, { x: 90, y: -10, width: 20, height: 5 })).toEqual([]);
  expect(findFlowCurveObstacleIntervals(quadratic, { x: 99, y: -51, width: 2, height: 1 }).length).toBeGreaterThan(0);
  const cubic = {
    kind: 'cubicBezier' as const,
    from: [0, 0] as [number, number],
    to: [0, 0] as [number, number],
    control1: [100, 0] as [number, number],
    control2: [100, 100] as [number, number],
  };
  expect(
    findFlowCurveObstacleIntervals(cubic, { x: -2, y: -2, width: 4, height: 4 }, true, false).length,
  ).toBeGreaterThan(0);
});
