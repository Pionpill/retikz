import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import type { CompileWarning } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { createFlowDiagramProviderContribution, FlowDiagramSchema } from '../../src/flow';
import { FlowRoutingSchema, layeredFlowLayoutDefinition } from '../../src/flow';
import type { InputFlowLayoutComputation, FlowLayoutOutput } from '../../src/flow';
import { routeFlowRelations } from '../../src/flow';
import { executeFlowLayout } from '../../src/flow/pipeline';
import { evaluateFlowOrthogonalConflicts } from '../../src/flow/providers';
import { resolveEffectiveFlowLayout } from '../../src/flow/resolve';

const input = (): InputFlowLayoutComputation => ({
  layout: { direction: 'right', nodeGap: 48, rankGap: 48, routing: { kind: 'orthogonal', cornerRadius: 8 } },
  elements: ['a', 'b', 'obstacle'].map(id => ({
    kind: 'leaf',
    id,
    size: { width: 20, height: 20 },
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  })),
  relations: [
    {
      source: { id: 'a', overlap: 'allow' },
      target: { id: 'b', overlap: 'allow' },
      direction: 'forward',
      routing: { kind: 'orthogonal', cornerRadius: 8 },
    },
  ],
});

const elements: FlowLayoutOutput['elements'] = [
  { id: 'a', bounds: { x: 0, y: 0, width: 20, height: 20 } },
  { id: 'b', bounds: { x: 200, y: 160, width: 20, height: 20 } },
  { id: 'obstacle', bounds: { x: 100, y: 70, width: 20, height: 20 } },
];
describe('Flow 正交布线', () => {
  it('仅接受支持的正交分数并保留 JSON 意图', () => {
    for (const turnPosition of [0.25, 0.5, 0.75]) {
      const source = { kind: 'orthogonal', turnPosition };

      expect(FlowRoutingSchema.parse(JSON.parse(JSON.stringify(source)))).toEqual(source);
    }

    for (const turnPosition of [0, 1, 0.3, NaN])
      expect(FlowRoutingSchema.safeParse({ kind: 'orthogonal', turnPosition }).success).toBe(false);

    expect(FlowRoutingSchema.safeParse({ kind: '-|', turnPosition: 0.5 }).success).toBe(false);
  });

  it('路径畅通时优先使用中点，否则选择绕过障碍的四分之一位置通道', () => {
    const source = input();
    const before = structuredClone({ source, elements });
    routeFlowRelations(source, elements);

    expect({ source, elements }).toEqual(before);

    const clear = elements.map(e => (e.id === 'obstacle' ? { ...e, bounds: { ...e.bounds, y: 300 } } : e));

    expect(routeFlowRelations(input(), clear)[0].route.points).toEqual([
      [10, 10],
      [110, 10],
      [110, 170],
      [210, 170],
    ]);
    expect(routeFlowRelations(input(), elements)[0].route.points).toEqual([
      [10, 10],
      [65, 10],
      [65, 170],
      [210, 170],
    ]);
  });

  it('保留显式碰撞中点', () => {
    const source = input();
    const explicit: InputFlowLayoutComputation = {
      ...source,
      relations: [{ ...source.relations[0], routing: { kind: 'orthogonal', cornerRadius: 8, turnPosition: 0.5 } }],
    };

    expect(routeFlowRelations(explicit, elements)[0].route.points[1]).toEqual([110, 10]);
  });

  it.each(['horizontal', 'vertical'])('即使有障碍物，也能保持 %s 端点直线对齐', axis => {
    const placed = elements.map(e =>
      e.id === 'b'
        ? {
            ...e,
            bounds:
              axis === 'horizontal' ? { x: 200, y: 0, width: 20, height: 20 } : { x: 0, y: 160, width: 20, height: 20 },
          }
        : e,
    );

    expect(routeFlowRelations(input(), placed)[0].route.points).toHaveLength(2);
  });

  it('仅在正交路由内继承分数并允许覆盖', () => {
    const ancestor = resolveEffectiveFlowLayout(layeredFlowLayoutDefinition, {}, undefined, {
      kind: 'orthogonal',
      turnPosition: 0.75,
    });

    expect(
      resolveEffectiveFlowLayout(layeredFlowLayoutDefinition, {}, ancestor, { kind: 'orthogonal' }).routing,
    ).toMatchObject({ turnPosition: 0.75 });
    expect(
      resolveEffectiveFlowLayout(layeredFlowLayoutDefinition, {}, ancestor, { kind: 'orthogonal', turnPosition: 0.25 })
        .routing,
    ).toMatchObject({ turnPosition: 0.25 });
    expect(
      resolveEffectiveFlowLayout(layeredFlowLayoutDefinition, {}, ancestor, { kind: '-|' }).routing,
    ).not.toHaveProperty('turnPosition');
  });
});

it.each(['right', 'left', 'down', 'up'] as const)('在 %s 布局中使用源相对四分之一位置', direction => {
  const source = input();
  const horizontal = direction === 'right' || direction === 'left';
  const sign = direction === 'right' || direction === 'down' ? 1 : -1;
  const placed = elements.map(element => {
    const center = [element.bounds.x + 10, element.bounds.y + 10];
    const x = horizontal ? center[0] * sign : center[1],
      y = horizontal ? center[1] : center[0] * sign;

    return { ...element, bounds: { x: x - 10, y: y - 10, width: 20, height: 20 } };
  });
  const configured: InputFlowLayoutComputation = {
    ...source,
    layout: { ...source.layout, direction },
    relations: [{ ...source.relations[0], routing: { kind: 'orthogonal', cornerRadius: 0, turnPosition: 0.25 } }],
  };
  const route = routeFlowRelations(configured, placed)[0].route;

  expect(route.points[1][horizontal ? 0 : 1]).toBe(65 * sign);
});
it('保留外部反馈通道并跳过对齐的反馈绕路', () => {
  const source = input();
  const configured: InputFlowLayoutComputation = {
    ...source,
    relations: [{ ...source.relations[0], direction: 'reverse' }],
  };
  const route = routeFlowRelations(configured, elements)[0].route;

  expect(route.points[1][0]).toBeGreaterThan(220);

  const aligned = elements.map(e => (e.id === 'b' ? { ...e, bounds: { ...e.bounds, y: 0 } } : e));

  expect(routeFlowRelations(configured, aligned)[0].route.points).toHaveLength(2);
});
it('两个通道被阻挡时选择剩余的四分之三位置候选', () => {
  const source = input();
  const extra = { ...source.elements[2], id: 'second' };
  const configured: InputFlowLayoutComputation = { ...source, elements: [...source.elements, extra] };
  const placed = [...elements, { id: 'second', bounds: { x: 55, y: 70, width: 20, height: 20 } }];

  expect(routeFlowRelations(configured, placed)[0].route.points[1]).toEqual([155, 10]);
});
it('独立对实际穿透、切线和端点重入进行评分', () => {
  const relation = input().relations[0];
  const route = {
    kind: 'orthogonal' as const,
    cornerRadius: 0,
    points: [
      [0, 0],
      [100, 0],
      [100, 100],
      [200, 100],
    ] as const,
  };

  expect(
    evaluateFlowOrthogonalConflicts(
      route,
      relation,
      [{ id: 'block', bounds: { x: 90, y: 20, width: 20, height: 30 } }],
      [],
    ).score,
  ).toEqual([1, 30, 0]);
  expect(
    evaluateFlowOrthogonalConflicts(
      route,
      relation,
      [{ id: 'block', bounds: { x: 100, y: 100, width: 10, height: 10 } }],
      [],
    ).score[0],
  ).toBe(1);

  const reentry = {
    ...route,
    points: [
      [0, 0],
      [30, 0],
      [30, 5],
      [0, 5],
      [0, 50],
    ] as const,
  };

  expect(
    evaluateFlowOrthogonalConflicts(
      reentry,
      relation,
      [{ id: 'a', bounds: { x: -10, y: -10, width: 20, height: 20 } }],
      [],
    ).score[0],
  ).toBe(1);
  expect(
    evaluateFlowOrthogonalConflicts(route, relation, [], [{ bounds: { x: 90, y: 20, width: 20, height: 30 } }]).score,
  ).toEqual([0, 0, 1]);
});
it('拒绝回显锁定分数但返回另一通道的提供者', () => {
  const source = input();
  const configured: InputFlowLayoutComputation = {
    ...source,
    relations: [{ ...source.relations[0], routing: { kind: 'orthogonal', cornerRadius: 8, turnPosition: 0.75 } }],
  };
  const definition = {
    ...layeredFlowLayoutDefinition,
    layout: () => ({
      elements,
      relations: [
        {
          source: { id: 'a' },
          target: { id: 'b' },
          route: {
            kind: 'orthogonal' as const,
            cornerRadius: 8,
            turnPosition: 0.75 as const,
            points: [
              [10, 10],
              [110, 10],
              [110, 170],
              [210, 170],
            ] as Array<[number, number]>,
          },
        },
      ],
    }),
  };

  expect(() => executeFlowLayout(definition, configured)).toThrow('orthogonal points');
});
it.each([false, true])('保留可绘制的阻塞路线，并在 aligned=%s 时省略回避警告', aligned => {
  const provider = {
    ...layeredFlowLayoutDefinition,
    name: 'fixed-orthogonal',
    layout: (source: InputFlowLayoutComputation) => {
      const centers = aligned
        ? [
            [0, 0],
            [400, 0],
            [200, 0],
          ]
        : [
            [0, 0],
            [400, 200],
            [200, 100],
          ];
      const placed = source.elements.map((element, index) => {
        if (element.kind !== 'leaf') throw new Error('Leaf fixture required');

        return {
          id: element.id,
          bounds: {
            x: centers[index][0] - element.size.width / 2,
            y: centers[index][1] - element.size.height / 2,
            ...element.size,
          },
        };
      });

      return { elements: placed, relations: routeFlowRelations(source, placed) };
    },
  };
  const source = FlowDiagramSchema.parse({
    namespace: 'diagram',
    type: 'flow',
    entities: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
      { id: 'obstacle', text: 'Obstacle', layout: { minimumSize: { width: aligned ? 120 : 360, height: 80 } } },
    ],
    groups: [],
    layouts: [],
    children: ['a', 'b', 'obstacle'],
    relations: [{ source: 'a', target: 'b', routing: { kind: 'orthogonal', cornerRadius: 8 } }],
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
        if (warning.code === 'FlowOrthogonalObstacleConflict') warnings.push(warning);
      },
    },
  );

  expect(result.scene.primitives.length).toBeGreaterThan(0);
  expect(warnings).toHaveLength(aligned ? 0 : 1);

  if (!aligned) expect(warnings[0]).toMatchObject({ path: ['children', 0, 'relations', 0] });
});
