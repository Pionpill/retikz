import type { CompileWarning, ScenePrimitive } from '@retikz/core';
import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { FlowLayoutOutput, FlowLayoutRoute, InputFlowLayoutComputation } from '../../src/flow';
import {
  createFlowDiagramProviderContribution,
  FlowDiagramArtifactSchema,
  FlowDiagramSchema,
  FlowRouteArtifactSchema,
  layeredFlowLayoutDefinition,
} from '../../src/flow';
import { executeFlowLayout } from '../../src/flow/pipeline';
import { createFlowBendCurve, flowRelationObstacles, scoreFlowBendNodes } from '../../src/flow/providers';
import { routeFlowRelations } from '../../src/flow/providers/layout/routing';
import { resolveEffectiveFlowLayout } from '../../src/flow/resolve';
import { findFlowCurveObstacleIntervals } from '../../src/flow/shared/geometry';

const routingInput = (): InputFlowLayoutComputation => ({
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

describe('Flow 弯曲布线', () => {
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

  it('搜索六名候选人，喜欢平局上较小的角度，并尊重固定的一面', () => {
    const input = routingInput();
    const automatic: InputFlowLayoutComputation = {
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

    const fixedSide: InputFlowLayoutComputation = {
      ...automatic,
      relations: [{ ...automatic.relations[0], routing: { kind: 'bend', bendDirection: 'right' } }],
    };

    expect(routeFlowRelations(fixedSide, blockFortyFive)[0].route).toMatchObject({
      bendDirection: 'right',
      bendAngle: 60,
    });
    expect(routeFlowRelations(automatic, blockFortyFive)).toEqual(routeFlowRelations(automatic, blockFortyFive));
  });

  it('通过解析结果保留省略的角度并锁定继承的显式零角和负角', () => {
    const automatic = resolveEffectiveFlowLayout(layeredFlowLayoutDefinition, {}, undefined, { kind: 'bend' });

    expect(automatic.routing).toEqual({ kind: 'bend' });
    expect(
      resolveEffectiveFlowLayout(layeredFlowLayoutDefinition, {}, automatic, { kind: 'bend', bendDirection: 'right' })
        .routing,
    ).toEqual({ kind: 'bend', bendDirection: 'right' });

    for (const bendAngle of [0, -45, 30]) {
      const parent = resolveEffectiveFlowLayout(layeredFlowLayoutDefinition, {}, automatic, {
        kind: 'bend',
        bendAngle,
      });

      expect(resolveEffectiveFlowLayout(layeredFlowLayoutDefinition, {}, parent, { kind: 'bend' }).routing).toEqual({
        kind: 'bend',
        bendAngle,
      });
    }
  });

  it('仅接受自动候选角度并保留提供者边界处的对称族', () => {
    const input: InputFlowLayoutComputation = {
      ...routingInput(),
      relations: [{ ...routingInput().relations[0], routing: { kind: 'bend' } }],
    };
    const run = (route: FlowLayoutRoute) =>
      executeFlowLayout(
        {
          ...layeredFlowLayoutDefinition,
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

  it('使用保留标签作为辅助分数，但绝不会用清晰的节点路由来换取清晰的标签', () => {
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

  it('产物将参考端点一起平移，同时绘图包含曲线范围', () => {
    let output: FlowLayoutOutput | undefined;
    const provider = {
      ...layeredFlowLayoutDefinition,
      name: 'capture',
      layout: (...args: Parameters<typeof layeredFlowLayoutDefinition.layout>) => {
        output = layeredFlowLayoutDefinition.layout(...args);
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
      result.artifacts.find(item => item.namespace === 'diagram' && item.type === 'flow')?.value,
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

  it('在调用自定义布局回调之前拒绝不支持的弯曲', () => {
    let calls = 0;
    const provider = {
      ...layeredFlowLayoutDefinition,
      name: 'straight-only',
      capabilities: { ...layeredFlowLayoutDefinition.capabilities, routing: [{ kind: 'straight' as const }] },
      defaults: { ...layeredFlowLayoutDefinition.defaults, routing: { kind: 'straight' as const } },
      layout: (...args: Parameters<typeof layeredFlowLayoutDefinition.layout>) => {
        calls++;
        return layeredFlowLayoutDefinition.layout(...args);
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

  it('拒绝具有未旋转尺寸的倾斜标签预留', () => {
    const input = routingInput();
    const relation = {
      ...input.relations[0],
      labelSize: { width: 40, height: 10 },
      labelPlacement: { sloped: true, position: 0.2 },
    };
    const labeled = { ...input, relations: [relation] };
    const relations = routeFlowRelations(labeled, routingElements);
    const provider = { ...layeredFlowLayoutDefinition, layout: () => ({ elements: routingElements, relations }) };

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

  it('拒绝外部边界处的混合、不完整、遗留和非有限持久路由', () => {
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

  it('保留双方冲突，保守对待切线接触', () => {
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

  it('部分切线保留零，不同的布线类型会破坏继承', () => {
    const root = resolveEffectiveFlowLayout(layeredFlowLayoutDefinition, {}, undefined, {
      kind: 'bend',
      outAngle: 45,
      inAngle: 90,
      looseness: 2,
    });

    expect(
      resolveEffectiveFlowLayout(layeredFlowLayoutDefinition, {}, root, { kind: 'bend', outAngle: 0 }).routing,
    ).toEqual({ kind: 'bend', outAngle: 0, inAngle: 90, looseness: 2 });

    const axis = resolveEffectiveFlowLayout(layeredFlowLayoutDefinition, {}, root, {
      kind: 'orthogonal',
      cornerRadius: 12,
    });

    expect(resolveEffectiveFlowLayout(layeredFlowLayoutDefinition, {}, axis, { kind: 'bend' }).routing).toEqual({
      kind: 'bend',
    });
  });

  it('合法端点入口不受限制，但重新进入其源的切线路径存在冲突', () => {
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

  it('相关的 Group shell 和不可见的布局不是固体，而它们的子级仍然是障碍', () => {
    const input = routingInput();
    const grouped: InputFlowLayoutComputation = {
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

  it('冲突的自定义弯曲会发出源定位警告并保持可绘制', () => {
    const provider = {
      ...layeredFlowLayoutDefinition,
      name: 'fixed-bend',
      layout: (input: InputFlowLayoutComputation) => {
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

  it('弯曲溢出保留 Core 原因和违规关系路径', () => {
    const input = routingInput();
    const overflowing: InputFlowLayoutComputation = {
      ...input,
      relations: [
        input.relations[0],
        { ...input.relations[0], routing: { kind: 'bend', outAngle: 0, inAngle: 180, looseness: Number.MAX_VALUE } },
      ],
    };

    expect(() =>
      executeFlowLayout(
        {
          ...layeredFlowLayoutDefinition,
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

  it('自动弯曲使用中点障碍物以编写的角度选择清晰的一侧', () => {
    const input = routingInput();
    const first = routeFlowRelations(input, routingElements);

    expect(first[0].route).toMatchObject({ kind: 'bend', bendDirection: 'right', bendAngle: 60 });
    expect(routeFlowRelations(input, routingElements)).toEqual(first);
    expect(
      routeFlowRelations({ ...input, relations: [{ ...input.relations[0], direction: 'reverse' }] }, routingElements),
    ).toEqual(first);
    expect(routingElements[0].bounds.x).toBe(-2);
  });

  it('未标记的平行路线不影响通过重叠或交叉进行的选择', () => {
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

  it('交叉的未标记边不会重定向所选的弯曲', () => {
    const input = routingInput();
    const elements = [
      ...routingElements.map(element =>
        element.id === 'obstacle' ? { ...element, bounds: { ...element.bounds, y: 200 } } : element,
      ),
      { id: 'c', bounds: { x: 98, y: -152, width: 4, height: 4 } },
      { id: 'd', bounds: { x: 98, y: -12, width: 4, height: 4 } },
    ];
    const crossing: InputFlowLayoutComputation = {
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

  it('自定义输出保留中心和显式参数', () => {
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
          ...layeredFlowLayoutDefinition,
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

  it('为不同的端点标识保留重合的参考端点', () => {
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

  it('仅继承活动参数族并支持显式对称退出', () => {
    const root = resolveEffectiveFlowLayout(layeredFlowLayoutDefinition, {}, undefined, {
      kind: 'bend',
      outAngle: 45,
      bendAngle: 70,
      bendDirection: 'right',
    });

    expect(root.routing).toEqual({ kind: 'bend', outAngle: 45, inAngle: 180, looseness: 1 });
    expect(resolveEffectiveFlowLayout(layeredFlowLayoutDefinition, {}, root, { kind: 'bend' }).routing).toEqual(
      root.routing,
    );
    expect(
      resolveEffectiveFlowLayout(layeredFlowLayoutDefinition, {}, root, { kind: 'bend', bendAngle: 0 }).routing,
    ).toEqual({ kind: 'bend', bendAngle: 0 });
    expect(
      resolveEffectiveFlowLayout(layeredFlowLayoutDefinition, {}, undefined, { kind: 'bend', looseness: 4 }).routing,
    ).toEqual({ kind: 'bend' });
  });

  it('显式弯曲下沉到立方并保留产物中的参考参数', () => {
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
      result.artifacts.find(item => item.namespace === 'diagram' && item.type === 'flow')?.value,
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
