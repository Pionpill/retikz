import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import type { CompileWarning, IRTarget } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import {
  FlowRoutingSchema,
  FlowScopeRoutingSchema,
  FlowDiagramSchema,
  createFlowDiagramProviderContribution,
  FlowDiagramArtifactSchema,
  LayeredFlowLayoutDefinition,
} from '../../src/flow';
import type { FlowLayoutDefinition } from '../../src/flow';
import { flowRouteLabelBounds, flowSmoothConflicts } from '../../src/flow/providers';

describe('smooth authoring contract', () => {
  it('preserves intermediate targets, duplicate knots and tension through JSON', () => {
    const routing = {
      kind: 'smooth',
      points: [
        [40, 20],
        [40, 20],
        { id: 'via', anchor: 'right' },
        { relative: [10, 0] },
        { relativeAccumulate: [0, 10] },
      ],
      tension: 0.7,
    };
    expect(FlowRoutingSchema.parse(JSON.parse(JSON.stringify(routing)))).toEqual(routing);
  });
  it.each([
    { kind: 'smooth', points: [] },
    { kind: 'smooth', points: [[1, 2]], tension: 0 },
    { kind: 'smooth', points: [[1, 2]], tension: -1 },
    { kind: 'smooth', points: [[1, 2]], mode: 'auto' },
  ])('rejects incomplete or invalid smooth input', routing => {
    expect(FlowRoutingSchema.safeParse(routing).success).toBe(false);
  });
  it('keeps smooth relation-only and accepts omitted tension', () => {
    const routing = { kind: 'smooth', points: [[1, 2]] };
    expect(FlowRoutingSchema.parse(routing)).toEqual(routing);
    expect(FlowScopeRoutingSchema.safeParse(routing).success).toBe(false);
  });
});

const compileSmooth = (
  points: Array<IRTarget>,
  provider?: FlowLayoutDefinition,
  scale = 1,
  container?: 'group' | 'layout',
) => {
  const warnings: Array<CompileWarning> = [];
  const source = FlowDiagramSchema.parse({
    namespace: 'diagram',
    type: 'flow',
    transforms: [{ kind: 'scale', x: scale, y: scale }],
    entities: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
    ],
    groups: container === 'group' ? [{ id: 'container', children: ['a', 'b'] }] : [],
    layouts:
      container === 'layout' ? [{ id: 'container', kind: 'linear', direction: 'right', children: ['a', 'b'] }] : [],
    children: container === undefined ? ['a', 'b'] : ['container'],
    relations: [
      { source: 'a', target: 'b', routing: { kind: 'smooth', points }, label: { text: 'Via', sloped: true } },
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

it('resolves cursor targets, preserves duplicates and appends the real relation target', () => {
  const { artifact } = compileSmooth([
    [40, -50],
    [40, -50],
    { relative: [5, 0] },
    { relativeAccumulate: [20, 0] },
    { relative: [0, 5] },
  ]);
  const route = artifact.relations[0].route;
  expect(route.kind).toBe('smooth');
  if (route.kind !== 'smooth') throw new Error('expected smooth');
  expect(route.tension).toBe(1);
  const origin = artifact.regions.drawing.origin;
  expect(route.points.slice(1, -1).map(point => [point[0] - origin[0], point[1] - origin[1]])).toEqual([
    [40, -50],
    [40, -50],
    [45, -50],
    [60, -50],
    [60, -45],
  ]);
  expect(route.points).toHaveLength(7);
  expect(artifact.relations[0].target).toBe('b');
  expect(artifact.relations[0].labelReservation).toBeDefined();
  expect(JSON.parse(JSON.stringify(artifact))).toEqual(artifact);
});

it('rejects an out-of-flow nested reference without dropping the point', () => {
  expect(() => compileSmooth([{ between: [[0, 0], { of: 'outside', offset: [1, 2] }], fraction: 0.5 }])).toThrow();
});

it('accepts real Group anchors but rejects Layout identities in nested targets', () => {
  const { artifact } = compileSmooth([{ id: 'container', anchor: 'top' }], undefined, 1, 'group');
  expect(artifact.relations[0].route.points).toHaveLength(3);
  expect(() => compileSmooth([{ origin: 'container', angle: 0, radius: 10 }], undefined, 1, 'layout')).toThrow(
    /Entity or Group/,
  );
});

it('warns when a route reenters its source and keeps all authored knots', () => {
  const { artifact, warnings } = compileSmooth([[100, -50], { id: 'a' }, [100, -50]]);
  expect(warnings.some(warning => warning.code === 'FlowSmoothObstacleConflict')).toBe(true);
  expect(artifact.relations[0].route.points).toHaveLength(5);
});

it('keeps NodeTarget offsets in world units under the Flow root transform', () => {
  const { artifact } = compileSmooth([{ id: 'a', offset: [20, 0] }], undefined, 2);
  const points = artifact.relations[0].route.points;
  expect(points[1][0] - points[0][0]).toBeCloseTo(10);
  expect(points[1][1] - points[0][1]).toBeCloseTo(0);
});

it('rejects smooth before calling a provider that does not declare support', () => {
  let called = false;
  const provider: FlowLayoutDefinition = {
    ...LayeredFlowLayoutDefinition,
    name: 'without-smooth',
    capabilities: {
      ...LayeredFlowLayoutDefinition.capabilities,
      routing: LayeredFlowLayoutDefinition.capabilities.routing.filter(item => item.kind !== 'smooth'),
    },
    layout: (input, context) => {
      called = true;
      return LayeredFlowLayoutDefinition.layout(input, context);
    },
  };
  expect(() => compileSmooth([[40, -50]], provider)).toThrow();
  expect(called).toBe(false);
});

it('rejects provider mutation of a middle knot', () => {
  const provider: FlowLayoutDefinition = {
    ...LayeredFlowLayoutDefinition,
    name: 'changed-smooth',
    layout: (input, context) => {
      const output = LayeredFlowLayoutDefinition.layout(input, context);
      return {
        ...output,
        relations: output.relations.map((relation, relationIndex) => {
          if (relation.route.kind !== 'smooth') return relation;
          const route = {
            ...relation.route,
            points: relation.route.points.map((point, index) =>
              index === 1 ? ([point[0] + 1, point[1]] as [number, number]) : point,
            ),
          };
          return { route, labelBounds: flowRouteLabelBounds(route, input.relations[relationIndex]) };
        }),
      };
    },
  };
  expect(() => compileSmooth([[40, -50]], provider)).toThrow(/smooth route must preserve/);
});

it('detects smooth crossings between safe knots and retains reentry into endpoint nodes', () => {
  const route = {
    kind: 'smooth' as const,
    points: [
      [0, 0],
      [100, 0],
      [200, 0],
    ] as Array<[number, number]>,
    tension: 1,
  };
  const relation = {
    source: 'a',
    target: 'b',
    direction: 'forward' as const,
    routing: { kind: 'smooth' as const, points: [[100, 0]] as Array<[number, number]>, tension: 1 },
  };
  expect(
    flowSmoothConflicts(route, relation, [{ id: 'obstacle', bounds: { x: 45, y: -5, width: 10, height: 10 } }]),
  ).toEqual(['obstacle']);
  expect(
    flowSmoothConflicts(route, relation, [
      { id: 'a', bounds: { x: -5, y: -5, width: 10, height: 10 } },
      { id: 'b', bounds: { x: 195, y: -5, width: 10, height: 10 } },
    ]),
  ).toEqual([]);
  expect(
    flowSmoothConflicts(
      {
        ...route,
        points: [
          [0, 0],
          [100, 0],
          [0, 0],
          [200, 0],
        ],
      },
      relation,
      [{ id: 'a', bounds: { x: -5, y: -5, width: 10, height: 10 } }],
    ),
  ).toEqual(['a']);
});
