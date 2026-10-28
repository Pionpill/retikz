import type { CompileWarning, IRTarget } from '@retikz/core';
import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { FlowLayoutDefinition } from '../../src/flow';
import {
  createFlowDiagramProviderContribution,
  FlowDiagramArtifactSchema,
  FlowDiagramSchema,
  FlowRoutingSchema,
  FlowScopeRoutingSchema,
  layeredFlowLayoutDefinition,
} from '../../src/flow';
import { flowRouteLabelBounds, flowSmoothConflicts } from '../../src/flow/providers';

describe('顺利的编写契约', () => {
  it('通过 JSON 保留中间目标、重复结和张力', () => {
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
  ])('拒绝不完整或无效的平滑输入', routing => {
    expect(FlowRoutingSchema.safeParse(routing).success).toBe(false);
  });

  it('仅保持平滑关系并接受省略的张力', () => {
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
    result.artifacts.find(item => item.namespace === 'diagram' && item.type === 'flow')?.value,
  );

  return { result, artifact, warnings };
};

it('解析游标目标，保留重复项并附加真实的关系目标', () => {
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
  expect(artifact.relations[0].target).toEqual({ id: 'b' });
  expect(artifact.relations[0].labelReservation).toBeDefined();
  expect(JSON.parse(JSON.stringify(artifact))).toEqual(artifact);
});

it('拒绝流外嵌套引用而不删除点', () => {
  expect(() => compileSmooth([{ between: [[0, 0], { of: 'outside', offset: [1, 2] }], fraction: 0.5 }])).toThrow();
});

it('接受真实的 Group 锚点，但拒绝嵌套目标中的 Layout 身份', () => {
  const { artifact } = compileSmooth([{ id: 'container', anchor: 'top' }], undefined, 1, 'group');

  expect(artifact.relations[0].route.points).toHaveLength(3);
  expect(() => compileSmooth([{ origin: 'container', angle: 0, radius: 10 }], undefined, 1, 'layout')).toThrow(
    /Entity or Group/,
  );
});

it('当路线重新进入其来源时发出警告并保留所有编写的节点', () => {
  const { artifact, warnings } = compileSmooth([[100, -50], { id: 'a' }, [100, -50]]);

  expect(warnings.some(warning => warning.code === 'FlowSmoothObstacleConflict')).toBe(true);
  expect(artifact.relations[0].route.points).toHaveLength(5);
});

it('在 Flow 根变换下保留世界单位中的 NodeTarget 偏移量', () => {
  const { artifact } = compileSmooth([{ id: 'a', offset: [20, 0] }], undefined, 2);
  const points = artifact.relations[0].route.points;

  expect(points[1][0] - points[0][0]).toBeCloseTo(10);
  expect(points[1][1] - points[0][1]).toBeCloseTo(0);
});

it('在调用未声明支持的提供者之前拒绝平滑', () => {
  let called = false;
  const provider: FlowLayoutDefinition = {
    ...layeredFlowLayoutDefinition,
    name: 'without-smooth',
    capabilities: {
      ...layeredFlowLayoutDefinition.capabilities,
      routing: layeredFlowLayoutDefinition.capabilities.routing.filter(item => item.kind !== 'smooth'),
    },
    layout: (input, context) => {
      called = true;
      return layeredFlowLayoutDefinition.layout(input, context);
    },
  };

  expect(() => compileSmooth([[40, -50]], provider)).toThrow();
  expect(called).toBe(false);
});

it('拒绝中间结的提供者突变', () => {
  const provider: FlowLayoutDefinition = {
    ...layeredFlowLayoutDefinition,
    name: 'changed-smooth',
    layout: (input, context) => {
      const output = layeredFlowLayoutDefinition.layout(input, context);
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

          return { ...relation, route, labelBounds: flowRouteLabelBounds(route, input.relations[relationIndex]) };
        }),
      };
    },
  };

  expect(() => compileSmooth([[40, -50]], provider)).toThrow(/smooth route must preserve/);
});

it('检测安全结之间的平滑交叉并保留重新进入端点节点', () => {
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
    source: { id: 'a', overlap: 'allow' as const },
    target: { id: 'b', overlap: 'allow' as const },
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
