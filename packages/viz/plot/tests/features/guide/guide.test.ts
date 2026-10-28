import type { IRNode, IRPath, IRScope } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { CoordinateFrame, PositionScale } from '../../../src/contract';
import type { GuideContext } from '../../../src/contract';
import { createCoordinateFrame } from '../../../src/contract';
import { lowerPlots } from '../../../src/pipeline/expand';
import { lowerPlotWithDataArtifact } from '../../../src/pipeline/expand/lower';
import { lowerCustomAxis, lowerGuide } from '../../../src/pipeline/guide';
import type { IRPlot } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

/** 测试用最小 PositionScale：guide 只调 coordinate，其余成员给占位 */
const fakeScale = (
  coordinate: (value: number) => number,
  domain: ReadonlyArray<number> = [0, 1],
  scaleRange: readonly [number, number] = [0, 0],
): PositionScale => ({
  coordinate: value => coordinate(value as number),
  domain: () => domain,
  bandwidth: 0,
  step: 0,
  ticks: () => ({ values: [], labels: [] }),
  range: () => [scaleRange[0], scaleRange[1]],
  setRange: () => {},
});

/** 测试曲线轴用 scale：lowerCustomAxis 依赖 ticks 推导轴采样范围 */
const fakeTickScale = (coordinate: (value: number) => number, values: Array<number>): PositionScale => ({
  coordinate: value => coordinate(value as number),
  domain: () => [values[0], values[values.length - 1]],
  bandwidth: 0,
  step: 0,
  ticks: () => ({ values, labels: values.map(value => String(value)) }),
  range: () => [coordinate(values[0]), coordinate(values[values.length - 1])],
  setRange: () => {},
});

const fakeBandScale = (
  coordinates: Record<string, number>,
  bandwidth: number,
  scaleRange: readonly [number, number] = [
    Math.min(...Object.values(coordinates)),
    Math.max(...Object.values(coordinates)),
  ],
): PositionScale => ({
  coordinate: value => coordinates[String(value)] ?? Number.NaN,
  domain: () => Object.keys(coordinates),
  bandwidth,
  step: bandwidth,
  ticks: () => ({ values: Object.keys(coordinates), labels: Object.keys(coordinates) }),
  tickKind: 'category',
  range: () => [scaleRange[0], scaleRange[1]],
  setRange: () => {},
});

const fakePolarPlacementBoundary = {
  isCyclic: () => false,
  unitNormal: () => [1, 0] as const,
  glyphExtentInRoleUnits: (_role: string, _mappedRoles: ReadonlyArray<number>, screenExtent: number) => screenExtent,
} satisfies NonNullable<CoordinateFrame['placementBoundary']>;

const ctx: GuideContext = {
  textMeasurer: measureLabel,
  plotArea: { x: 40, y: 10, width: 400, height: 250 },
  projectX: fakeScale(value => 40 + value * 40),
  projectY: fakeScale(value => 260 - value * 25),
  xTicks: { values: [0, 1, 2], labels: ['0', '1', '2'] },
  yTicks: { values: [9, 10, 11], labels: ['9', '10', '11'] },
  fontSize: 11,
};

const polarAngularGuideContext = (values: Array<number>, labels: Array<string>): GuideContext => {
  const angularScale = fakeScale(value => value, values, [0, 360]);
  const radialScale = fakeScale(value => value);

  return {
    ...ctx,
    fontSize: 10,
    frame: {
      type: 'polar2D',
      roles: ['x', 'y'],
      center: [200, 200],
      innerRadius: 0,
      outerRadius: 100,
      startAngle: 0,
      endAngle: 360,
      interpolation: 'polar',
      angularSkeleton: [0, 90, 180, 270],
      primary: angularScale,
      secondary: radialScale,
      roleScales: { x: angularScale, y: radialScale },
      project: () => null,
      projectRoles: () => null,
      mapRoles: () => null,
      projectMappedRoles: () => null,
      placementBoundary: fakePolarPlacementBoundary,
      projectPolar: () => null,
      projectCell: () => ({
        kind: 'sector',
        center: [200, 200],
        innerRadius: 0,
        outerRadius: 1,
        startAngle: 0,
        endAngle: 1,
      }),
    },
    angularTicks: { values, labels },
  };
};

const nodeChildren = (layer: IRScope): Array<IRNode> =>
  layer.children.filter(child => child.type === 'node') as Array<IRNode>;

const nodeByText = (layer: IRScope, text: string): IRNode => {
  const node = nodeChildren(layer).find(child => child.text === text);

  expect(node).toBeDefined();
  return node as IRNode;
};

describe('lowerGuide（契约）', () => {
  // Happy path
  it('下沉 x 轴结构', () => {
    const { gridLayer, axisLayer } = lowerGuide({ type: 'axis', dimension: 'x' }, ctx);

    expect(gridLayer).toBeNull();
    expect(axisLayer).not.toBeNull();

    const layer = axisLayer as IRScope;

    // 1 条 Path（轴线 + 刻度线）+ 3 个 label Node
    expect(layer.children).toHaveLength(5);
    expect((layer.children[0] as IRPath).type).toBe('path');

    const labels = nodeChildren(layer);

    expect(labels.map(n => n.text)).toEqual(['0', '1', '2']);

    // 轴线起点 = plot area 底边左端
    expect((layer.children[0] as IRPath).children[0]).toEqual({ type: 'step', kind: 'move', to: [40, 260] });
  });

  it('下沉 y 轴结构', () => {
    const { axisLayer } = lowerGuide({ type: 'axis', dimension: 'y' }, ctx);
    const layer = axisLayer as IRScope;
    const labels = nodeChildren(layer);

    expect(labels.map(n => n.text)).toEqual(['9', '10', '11']);

    // y label 垂直居中于 tick y（projectY(9)=35），水平在左侧轴外
    expect((labels[0].position as [number, number])[1]).toBe(35);
    expect((labels[0].position as [number, number])[0]).toBeLessThan(40);
  });

  it('y 轴标题默认为左轴附近的旋转顶部边缘', () => {
    const { axisLayer } = lowerGuide({ type: 'axis', dimension: 'y', title: 'Revenue' }, ctx);
    const title = nodeByText(axisLayer as IRScope, 'Revenue');

    expect(title.rotate).toBe(90);
    expect((title.position as [number, number])[0]).toBeCloseTo(7.3, 6);
    expect((title.position as [number, number])[1]).toBe(135);
  });

  it('右 y 轴标题默认为旋转顶部边缘靠近左侧', () => {
    const { axisLayer } = lowerGuide(
      { type: 'axis', dimension: 'y', placement: { kind: 'side', side: 'right' }, title: 'Revenue' },
      ctx,
    );
    const title = nodeByText(axisLayer as IRScope, 'Revenue');

    expect(title.rotate).toBe(-90);
    expect((title.position as [number, number])[0]).toBeCloseTo(472.7, 6);
    expect((title.position as [number, number])[1]).toBe(135);
  });

  it('保留显式 y 轴标题旋转角', () => {
    const { axisLayer } = lowerGuide({ type: 'axis', dimension: 'y', title: { text: 'Revenue', rotate: 0 } }, ctx);
    const title = nodeByText(axisLayer as IRScope, 'Revenue');

    expect(title.rotate).toBe(0);
  });

  it('水平 y 轴标题朝向覆盖默认旋转角', () => {
    const { axisLayer } = lowerGuide(
      { type: 'axis', dimension: 'y', title: { text: 'y', placement: 'at-end', orientation: 'horizontal' } },
      ctx,
    );
    const title = nodeByText(axisLayer as IRScope, 'y');

    expect(title.rotate).toBe(0);
    expect((title.position as [number, number])[1]).toBe(10);
  });

  it('显式标题 rotate 优先于标题朝向', () => {
    const { axisLayer } = lowerGuide(
      { type: 'axis', dimension: 'y', title: { text: 'Revenue', orientation: 'horizontal', rotate: 45 } },
      ctx,
    );
    const title = nodeByText(axisLayer as IRScope, 'Revenue');

    expect(title.rotate).toBe(45);
  });

  it('轴标题位于末端，x 标题靠近正轴末端', () => {
    const { axisLayer } = lowerGuide({ type: 'axis', dimension: 'x', title: { text: 'x', placement: 'at-end' } }, ctx);
    const title = nodeByText(axisLayer as IRScope, 'x');

    expect((title.position as [number, number])[0]).toBe(440);
  });

  it('坐标轴标题按比例沿基线从负向到正向采样放置', () => {
    const { axisLayer } = lowerGuide({ type: 'axis', dimension: 'x', title: { text: 'x', placement: 0.4 } }, ctx);
    const title = nodeByText(axisLayer as IRScope, 'x');

    expect((title.position as [number, number])[0]).toBe(200);
  });

  it('轴标题填充移位并将锚点下沉到标题节点', () => {
    const { axisLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        title: {
          text: 'x',
          padding: 10,
          placement: 'at-end',
          shift: { along: -6, normal: 2 },
          anchor: { align: 'end' },
        },
      },
      ctx,
    );
    const title = nodeByText(axisLayer as IRScope, 'x');

    expect(title.layout?.align).toBe('end');
    expect((title.position as [number, number])[0]).toBe(434);
    // 11px 字号的 Core 默认行高为 13.2，标签和标题均按实际行高占位
    expect((title.position as [number, number])[1]).toBe(301.8);
  });

  it('末端的轴标题将 y 标题放置在视觉顶部附近', () => {
    const { axisLayer } = lowerGuide({ type: 'axis', dimension: 'y', title: { text: 'y', placement: 'at-end' } }, ctx);
    const title = nodeByText(axisLayer as IRScope, 'y');

    expect((title.position as [number, number])[1]).toBe(10);
  });

  it('极坐标角度轴标题放置沿角度范围采样', () => {
    const { axisLayer } = lowerGuide(
      { type: 'axis', dimension: 'x', title: { text: 'theta', placement: 'at-end' } },
      {
        ...ctx,
        frame: {
          type: 'polar2D',
          roles: ['x', 'y'],
          center: [100, 100],
          innerRadius: 20,
          outerRadius: 80,
          startAngle: 0,
          endAngle: 180,
          interpolation: 'polar',
          angularSkeleton: [0, 90, 180, 270],
          primary: fakeScale(value => value),
          secondary: fakeScale(value => value),
          roleScales: { x: fakeScale(value => value), y: fakeScale(value => value) },
          project: () => null,
          projectRoles: () => null,
          mapRoles: () => null,
          projectMappedRoles: () => null,
          placementBoundary: fakePolarPlacementBoundary,
          projectPolar: () => null,
          projectCell: () => ({
            kind: 'sector',
            center: [100, 100],
            innerRadius: 0,
            outerRadius: 1,
            startAngle: 0,
            endAngle: 1,
          }),
        },
        angularTicks: { values: [], labels: [] },
      },
    );
    const title = nodeByText(axisLayer as IRScope, 'theta');

    expect((title.position as [number, number])[0]).toBeLessThan(40);
  });

  it('极坐标角度轴标题采用 axis 朝向时沿圆弧切线', () => {
    const { axisLayer } = lowerGuide(
      { type: 'axis', dimension: 'x', title: { text: 'theta', placement: 'at-end', orientation: 'axis' } },
      {
        ...ctx,
        frame: {
          type: 'polar2D',
          roles: ['x', 'y'],
          center: [100, 100],
          innerRadius: 20,
          outerRadius: 80,
          startAngle: 0,
          endAngle: 180,
          interpolation: 'polar',
          angularSkeleton: [0, 90, 180, 270],
          primary: fakeScale(value => value),
          secondary: fakeScale(value => value),
          roleScales: { x: fakeScale(value => value), y: fakeScale(value => value) },
          project: () => null,
          projectRoles: () => null,
          mapRoles: () => null,
          projectMappedRoles: () => null,
          placementBoundary: fakePolarPlacementBoundary,
          projectPolar: () => null,
          projectCell: () => ({
            kind: 'sector',
            center: [100, 100],
            innerRadius: 0,
            outerRadius: 1,
            startAngle: 0,
            endAngle: 1,
          }),
        },
        angularTicks: { values: [], labels: [] },
      },
    );
    const title = nodeByText(axisLayer as IRScope, 'theta');

    expect(title.rotate).toBeCloseTo(-90, 6);
  });

  it('极坐标角度刻度标签随角度向外延伸', () => {
    const values = [0, 30, 90, 180, 270];
    const labels = ['Right', 'Diagonal label', 'Bottom', 'Left', 'Top'];
    const { axisLayer } = lowerGuide({ type: 'axis', dimension: 'x' }, polarAngularGuideContext(values, labels));

    const right = nodeByText(axisLayer as IRScope, 'Right');
    const diagonal = nodeByText(axisLayer as IRScope, 'Diagonal label');
    const bottom = nodeByText(axisLayer as IRScope, 'Bottom');
    const left = nodeByText(axisLayer as IRScope, 'Left');
    const top = nodeByText(axisLayer as IRScope, 'Top');

    expect(right.layout?.align).toBe('start');
    expect(right.position).toEqual([323.75, 200]);
    expect(diagonal.layout?.align).toBe('start');
    // Core 默认宽度为 14 × 10 × 0.55，行高为 12；矩形沿径向投影后与刻度间距相切
    const diagonalRadius = 110 + (Math.cos(Math.PI / 6) * 77) / 2 + (Math.sin(Math.PI / 6) * 12) / 2;
    expect((diagonal.position as [number, number])[0]).toBeCloseTo(200 + Math.cos(Math.PI / 6) * diagonalRadius, 6);
    expect((diagonal.position as [number, number])[1]).toBeCloseTo(200 + Math.sin(Math.PI / 6) * diagonalRadius, 6);
    expect(bottom.layout?.align).toBe('middle');
    expect(bottom.position).toEqual([200, 316]);
    expect(left.layout?.align).toBe('end');
    expect(left.position).toEqual([79, 200]);
    expect(top.layout?.align).toBe('middle');
    expect(top.position).toEqual([200, 84]);
  });

  it('极坐标角度刻度标签中心跨越主方位角时连续移动', () => {
    const atCardinal = nodeByText(
      lowerGuide({ type: 'axis', dimension: 'x' }, polarAngularGuideContext([90], ['Waseca'])).axisLayer as IRScope,
      'Waseca',
    );
    const pastCardinal = nodeByText(
      lowerGuide({ type: 'axis', dimension: 'x' }, polarAngularGuideContext([91.5], ['Waseca'])).axisLayer as IRScope,
      'Waseca',
    );
    const [cardinalX, cardinalY] = atCardinal.position as [number, number];
    const [pastX, pastY] = pastCardinal.position as [number, number];

    expect(Math.hypot(pastX - cardinalX, pastY - cardinalY)).toBeLessThan(4);
  });

  it('极坐标角度刻度标签的显式对齐覆盖角度默认值', () => {
    const { axisLayer } = lowerGuide(
      { type: 'axis', dimension: 'x', tickLabels: { align: 'middle' } },
      polarAngularGuideContext([0], ['Right']),
    );

    expect(nodeByText(axisLayer as IRScope, 'Right').layout?.align).toBe('middle');
  });

  it('极坐标半径轴标题放置沿半径范围采样', () => {
    const { axisLayer } = lowerGuide(
      { type: 'axis', dimension: 'y', title: { text: 'radius', placement: 'at-end' } },
      {
        ...ctx,
        frame: {
          type: 'polar2D',
          roles: ['x', 'y'],
          center: [100, 100],
          innerRadius: 20,
          outerRadius: 80,
          startAngle: 0,
          endAngle: 180,
          interpolation: 'polar',
          angularSkeleton: [0, 90, 180, 270],
          primary: fakeScale(value => value),
          secondary: fakeScale(value => value),
          roleScales: { x: fakeScale(value => value), y: fakeScale(value => value) },
          project: () => null,
          projectRoles: () => null,
          mapRoles: () => null,
          projectMappedRoles: () => null,
          placementBoundary: fakePolarPlacementBoundary,
          projectPolar: () => null,
          projectCell: () => ({
            kind: 'sector',
            center: [100, 100],
            innerRadius: 0,
            outerRadius: 1,
            startAngle: 0,
            endAngle: 1,
          }),
        },
        radialTicks: { values: [], labels: [] },
      },
    );
    const title = nodeByText(axisLayer as IRScope, 'radius');

    expect((title.position as [number, number])[0]).toBeGreaterThan(170);
  });

  it('自定义轴标题放置样本数字轴范围', () => {
    const scale = fakeTickScale(value => value * 10, [0, 5, 10]);
    const frame = createCoordinateFrame(
      'custom-line',
      ['u'],
      values => {
        const value = Number(values[0]);
        return Number.isFinite(value) ? [value * 10, 0] : null;
      },
      { roleScales: { u: scale } },
    );
    const { axisLayer } = lowerCustomAxis(
      frame,
      { type: 'axis', dimension: 'u', title: { text: 'u', placement: 'at-end' } },
      11,
      undefined,
      measureLabel,
    );
    const title = nodeByText(axisLayer as IRScope, 'u');

    expect((title.position as [number, number])[0]).toBeCloseTo(100, 6);
  });

  it('下轴 x 网格线', () => {
    const { gridLayer } = lowerGuide({ type: 'axis', dimension: 'x', grid: true }, ctx);
    const layer = gridLayer as IRScope;
    const path = layer.children[0] as IRPath;

    // 3 条竖线 = 3 段 = 6 steps
    expect(path.children).toHaveLength(6);
    expect(path.children[0]).toEqual({ type: 'step', kind: 'move', to: [40, 10] });
    expect(path.children[1]).toEqual({ type: 'step', kind: 'line', to: [40, 260] });
  });

  it('下轴 y 网格线', () => {
    const { gridLayer } = lowerGuide({ type: 'axis', dimension: 'y', grid: true }, ctx);
    const path = (gridLayer as IRScope).children[0] as IRPath;

    // 横线：y=projectY(9)=35，从 left 到 right
    expect(path.children[0]).toEqual({ type: 'step', kind: 'move', to: [40, 35] });
    expect(path.children[1]).toEqual({ type: 'step', kind: 'line', to: [440, 35] });
  });

  it('轴网格可以使用独立的刻度源和线帽', () => {
    const { gridLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        grid: { ticks: { values: [0, 1, 2] }, lineCap: 'round' },
      },
      { ...ctx, xTicks: { values: [0, 2], labels: ['0', '2'] } },
    );
    const gridPath = (gridLayer as IRScope).children[0] as IRPath;

    expect(gridPath.children).toHaveLength(6);
    expect(gridPath.style?.lineCap).toBe('round');
  });

  it('轴网格密度样本网格网格刻度而不改变轴刻度', () => {
    const { axisLayer, gridLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        grid: { density: { kind: 'sample', maxCount: 2 } },
      },
      { ...ctx, xTicks: { values: [0, 1, 2, 3], labels: ['0', '1', '2', '3'] } },
    );
    const gridPath = (gridLayer as IRScope).children[0] as IRPath;

    expect(gridPath.children).toHaveLength(4);
    expect(nodeChildren(axisLayer as IRScope).map(node => node.text)).toEqual(['0', '1', '2', '3']);
  });

  it('选择加入轴网格范围边界', () => {
    const endpointCtx: GuideContext = {
      ...ctx,
      projectX: fakeScale(value => 40 + value * 40, [-1, 3]),
      xTicks: { values: [0, 2], labels: ['0', '2'] },
    };
    const withoutEndpoints = lowerGuide({ type: 'axis', dimension: 'x', grid: true }, endpointCtx);
    const explicitlyDisabled = lowerGuide(
      { type: 'axis', dimension: 'x', grid: { includeDomain: false } },
      endpointCtx,
    );

    expect(((withoutEndpoints.gridLayer as IRScope).children[0] as IRPath).children).toHaveLength(4);
    expect(((explicitlyDisabled.gridLayer as IRScope).children[0] as IRPath).children).toHaveLength(4);
  });

  it('轴网格在显式源之后附加缺少的比例范围边界', () => {
    const { gridLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        grid: { ticks: { values: [0, 2] }, includeDomain: true },
      },
      { ...ctx, projectX: fakeScale(value => 40 + value * 40, [-1, 3], [40, 440]) },
    );
    const steps = ((gridLayer as IRScope).children[0] as IRPath).children;

    expect(steps).toHaveLength(6);
    expect(steps[0]).toEqual({ type: 'step', kind: 'move', to: [40, 10] });
    expect(steps[2]).toEqual({ type: 'step', kind: 'move', to: [120, 10] });
    expect(steps[4]).toEqual({ type: 'step', kind: 'move', to: [440, 10] });
  });

  it('轴网格在密度之后附加比例范围边界，而不更改轴刻度', () => {
    const { axisLayer, gridLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        grid: { density: { kind: 'sample', maxCount: 2 }, includeDomain: true },
      },
      {
        ...ctx,
        projectX: fakeScale(value => 40 + value * 40, [0, 5], [40, 440]),
        xTicks: { values: [1, 2, 3, 4], labels: ['1', '2', '3', '4'] },
      },
    );
    const gridPath = (gridLayer as IRScope).children[0] as IRPath;

    expect(gridPath.children).toHaveLength(8);
    expect(nodeChildren(axisLayer as IRScope).map(node => node.text)).toEqual(['1', '2', '3', '4']);
  });

  it('通过有限投影坐标消除轴网格范围边界的重复', () => {
    const existingEndpoint = lowerGuide(
      { type: 'axis', dimension: 'x', grid: { includeDomain: true } },
      {
        ...ctx,
        projectX: fakeScale(value => 40 + value * 40, [0, 2], [40, 120]),
        xTicks: { values: [0, 1, 2], labels: ['0', '1', '2'] },
      },
    );
    const coincidentEndpoints = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        grid: { ticks: { values: [] }, includeDomain: true },
      },
      { ...ctx, projectX: fakeScale(() => 40, [0, 10], [40, 40]) },
    );
    const nonFiniteEndpoint = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        grid: { ticks: { values: [5] }, includeDomain: true },
      },
      {
        ...ctx,
        projectX: fakeScale(value => (value === 0 ? Number.NaN : 40 + value * 40), [0, 10], [40, 440]),
      },
    );

    expect(((existingEndpoint.gridLayer as IRScope).children[0] as IRPath).children).toHaveLength(6);
    expect(((coincidentEndpoints.gridLayer as IRScope).children[0] as IRPath).children).toHaveLength(2);
    expect(((nonFiniteEndpoint.gridLayer as IRScope).children[0] as IRPath).children).toHaveLength(6);
  });

  it('轴网格包括域使用绘图范围边界作为带标度', () => {
    const { gridLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        grid: { includeDomain: true, bandPosition: 0 },
      },
      {
        ...ctx,
        projectX: fakeBandScale({ A: 100, B: 200 }, 20, [90, 210]),
        xTicks: { values: ['A'], labels: ['A'] },
      },
    );
    const gridPath = (gridLayer as IRScope).children[0] as IRPath;

    expect(gridPath.children).toHaveLength(4);
    expect(gridPath.children[0]).toEqual({ type: 'step', kind: 'move', to: [90, 10] });
    expect(gridPath.children[2]).toEqual({ type: 'step', kind: 'move', to: [210, 10] });
  });

  it('轴网格包括域使用点比例的绘图范围边界', () => {
    const { gridLayer } = lowerGuide(
      { type: 'axis', dimension: 'x', grid: { includeDomain: true } },
      {
        ...ctx,
        projectX: fakeBandScale({ A: 100, B: 200 }, 0, [90, 210]),
        xTicks: { values: ['A'], labels: ['A'] },
      },
    );
    const gridPath = (gridLayer as IRScope).children[0] as IRPath;

    expect(gridPath.children).toHaveLength(6);
    expect(gridPath.children[0]).toEqual({ type: 'step', kind: 'move', to: [100, 10] });
    expect(gridPath.children[2]).toEqual({ type: 'step', kind: 'move', to: [90, 10] });
    expect(gridPath.children[4]).toEqual({ type: 'step', kind: 'move', to: [210, 10] });
  });

  it('轴网格包括域绘制没有刻度的边界', () => {
    const { gridLayer } = lowerGuide(
      { type: 'axis', dimension: 'x', grid: { includeDomain: true } },
      {
        ...ctx,
        projectX: fakeScale(value => 40 + value * 40, [0, 1], [40, 440]),
        xTicks: { values: [], labels: [] },
      },
    );

    expect(gridLayer).not.toBeNull();
    expect(((gridLayer as IRScope).children[0] as IRPath).children).toHaveLength(4);
  });

  it('轴网格范围边界不会更改次要网格候选者', () => {
    const { axisLayer, gridLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        grid: {
          ticks: { values: [1] },
          includeDomain: true,
          minor: { ticks: { values: [0.5, 1.5] } },
        },
      },
      {
        ...ctx,
        projectX: fakeScale(value => 40 + value * 40, [0, 2], [40, 120]),
        xTicks: { values: [1], labels: ['1'] },
      },
    );
    const [majorGrid, minorGrid] = (gridLayer as IRScope).children as Array<IRPath>;

    expect(majorGrid.children).toHaveLength(6);
    expect(minorGrid.children).toHaveLength(4);
    expect(nodeChildren(axisLayer as IRScope).map(node => node.text)).toEqual(['1']);
  });

  it('轴网格次要使用第二条路径并跳过主要重叠', () => {
    const { gridLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        grid: {
          ticks: { values: [0, 2] },
          minor: { ticks: { values: [0, 1, 2] }, stroke: '#e2e8f0', drawOpacity: 0.08 },
        },
      },
      ctx,
    );
    const [majorGrid, minorGrid] = (gridLayer as IRScope).children as Array<IRPath>;

    expect(majorGrid.children).toHaveLength(4);
    expect(minorGrid.children).toHaveLength(2);
    expect(minorGrid.style?.stroke).toBe('#e2e8f0');
    expect(typeof minorGrid.style?.opacity === 'object' ? minorGrid.style.opacity.stroke : undefined).toBe(0.08);
  });

  it('轴网格带位置在带内偏移网格线', () => {
    const { gridLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        grid: { bandPosition: 0 },
      },
      {
        ...ctx,
        projectX: fakeBandScale({ A: 100 }, 20),
        xTicks: { values: ['A'], labels: ['A'] },
      },
    );
    const gridPath = (gridLayer as IRScope).children[0] as IRPath;

    expect(gridPath.children[0]).toEqual({ type: 'step', kind: 'move', to: [90, 10] });
  });

  it('轴网格次带位置与实际主要位置进行比较', () => {
    const { gridLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        grid: { bandPosition: 0, minor: { ticks: { values: ['A'] }, bandPosition: 1, stroke: '#cbd5e1' } },
      },
      {
        ...ctx,
        projectX: fakeBandScale({ A: 100 }, 20),
        xTicks: { values: ['A'], labels: ['A'] },
      },
    );
    const [majorGrid, minorGrid] = (gridLayer as IRScope).children as Array<IRPath>;

    expect(majorGrid.children[0]).toEqual({ type: 'step', kind: 'move', to: [90, 10] });
    expect(minorGrid.children[0]).toEqual({ type: 'step', kind: 'move', to: [110, 10] });
  });

  it('极坐标角度网格的 source 和 minor 保留辐射路径', () => {
    const { gridLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        grid: { ticks: { values: [0, 90] }, minor: { ticks: { values: [0, 45, 90] }, dashPattern: [2, 2] } },
      },
      {
        ...ctx,
        frame: {
          type: 'polar2D',
          roles: ['x', 'y'],
          center: [100, 100],
          innerRadius: 20,
          outerRadius: 80,
          startAngle: 0,
          endAngle: 180,
          interpolation: 'polar',
          angularSkeleton: [0, 90, 180, 270],
          primary: fakeScale(value => value),
          secondary: fakeScale(value => value),
          roleScales: { x: fakeScale(value => value), y: fakeScale(value => value) },
          project: () => null,
          projectRoles: () => null,
          mapRoles: () => null,
          projectMappedRoles: () => null,
          placementBoundary: fakePolarPlacementBoundary,
          projectPolar: () => null,
          projectCell: () => ({
            kind: 'sector',
            center: [100, 100],
            innerRadius: 0,
            outerRadius: 1,
            startAngle: 0,
            endAngle: 1,
          }),
        },
        angularTicks: { values: [], labels: [] },
      },
    );
    const [majorGrid, minorGrid] = (gridLayer as IRScope).children as Array<IRPath>;

    expect(majorGrid.children).toHaveLength(4);
    expect(majorGrid.children.every(step => step.kind !== 'arc')).toBe(true);
    expect(minorGrid.children).toHaveLength(2);
    expect(minorGrid.style?.dashPattern).toEqual([2, 2]);
  });

  it('极坐标角度网格去重周期定义域端点', () => {
    const angularScale = fakeScale(value => value % 360, [0, 360]);
    const { gridLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        grid: { ticks: { values: [90] }, includeDomain: true },
      },
      {
        ...ctx,
        frame: {
          type: 'polar2D',
          roles: ['x', 'y'],
          center: [100, 100],
          innerRadius: 20,
          outerRadius: 80,
          startAngle: 0,
          endAngle: 360,
          interpolation: 'polar',
          angularSkeleton: [0, 90, 180, 270],
          primary: angularScale,
          secondary: fakeScale(value => value),
          roleScales: { x: angularScale, y: fakeScale(value => value) },
          project: () => null,
          projectRoles: () => null,
          mapRoles: () => null,
          projectMappedRoles: () => null,
          placementBoundary: fakePolarPlacementBoundary,
          projectPolar: () => null,
          projectCell: () => ({
            kind: 'sector',
            center: [100, 100],
            innerRadius: 0,
            outerRadius: 1,
            startAngle: 0,
            endAngle: 1,
          }),
        },
        angularTicks: { values: [], labels: [] },
      },
    );
    const gridPath = (gridLayer as IRScope).children[0] as IRPath;

    expect(gridPath.children).toHaveLength(4);
  });

  it('勾选像素匹配投影仪', () => {
    const layer = lowerGuide({ type: 'axis', dimension: 'x' }, ctx).axisLayer as IRScope;
    const labels = nodeChildren(layer);

    // tick value 1 → projectX(1)=80
    expect((labels[1].position as [number, number])[0]).toBe(80);
  });

  // 边界
  it('轴无网格空层', () => {
    expect(lowerGuide({ type: 'axis', dimension: 'x' }, ctx).gridLayer).toBeNull();
  });

  it('轴刻度标签 false 无文本', () => {
    const layer = lowerGuide({ type: 'axis', dimension: 'x', tickLabels: false }, ctx).axisLayer as IRScope;

    // 只剩轴线 + 刻度线 Path，无 label Node
    expect(layer.children).toHaveLength(2);
    expect((layer.children[0] as IRPath).type).toBe('path');
    expect(nodeChildren(layer)).toEqual([]);
  });

  it('跳过网格空刻度', () => {
    const emptyCtx: GuideContext = { ...ctx, xTicks: { values: [], labels: [] } };
    const { gridLayer, axisLayer } = lowerGuide({ type: 'axis', dimension: 'x', grid: true }, emptyCtx);

    expect(gridLayer).toBeNull();

    // 轴线仍在（即便无刻度）
    expect(axisLayer).not.toBeNull();
  });

  // 错误路径 / 退化
  it('吊装导轨样式', () => {
    const { gridLayer, axisLayer } = lowerGuide({ type: 'axis', dimension: 'x', grid: true }, ctx);

    expect((axisLayer as IRScope).defaults?.path?.style?.stroke).toBe('currentColor');
    expect(nodeChildren(axisLayer as IRScope).every(node => node.style?.font?.size === 11)).toBe(true);
    expect((axisLayer as IRScope).defaults?.node?.style?.stroke).toBe('none');
    expect(((gridLayer as IRScope).children[0] as IRPath).style?.opacity).toEqual({ stroke: 0.15 });
  });

  it('轴文本节点不继承描边或填充默认值', () => {
    const { axisLayer } = lowerGuide({ type: 'axis', dimension: 'x', title: 'Month' }, ctx);
    const layer = axisLayer as IRScope;

    expect(layer.defaults?.node).toMatchObject({
      style: { stroke: 'none', fill: 'none' },
      layout: { padding: 0 },
    });
    expect(nodeChildren(layer).map(node => node.text)).toEqual(['0', '1', '2', 'Month']);
  });

  it('引导线样式包括虚线偏移', () => {
    const { gridLayer, axisLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        line: { dashPattern: [4, 2], dashOffset: 1.5 },
        ticks: { line: { dashPattern: [2, 2], dashOffset: -1 } },
        grid: { dashPattern: [1, 3], dashOffset: 3 },
      },
      ctx,
    );
    const axisPath = (axisLayer as IRScope).children[0] as IRPath;
    const tickPath = (axisLayer as IRScope).children[1] as IRPath;
    const gridPath = (gridLayer as IRScope).children[0] as IRPath;

    expect(axisPath.style?.dashPattern).toEqual([4, 2]);
    expect(axisPath.style?.dashOffset).toBe(1.5);
    expect(tickPath.style?.dashPattern).toEqual([2, 2]);
    expect(tickPath.style?.dashOffset).toBe(-1);
    expect(gridPath.style?.dashPattern).toEqual([1, 3]);
    expect(gridPath.style?.dashOffset).toBe(3);
  });

  it('坐标轴正向箭头和端帽下沉至 Path', () => {
    const { axisLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        line: {
          lineCap: 'round',
          arrow: { positive: { shape: 'stealth', length: 8 } },
        },
      },
      ctx,
    );
    const axisPath = (axisLayer as IRScope).children[0] as IRPath;

    expect(axisPath.style?.lineCap).toBe('round');
    expect(axisPath.arrow).toEqual({ end: { shape: 'stealth', length: 8 } });
  });

  it('轴线负箭头和范围下层到路径', () => {
    const { axisLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        line: {
          extent: { from: 1, to: 2 },
          arrow: { negative: true },
        },
      },
      ctx,
    );
    const axisPath = (axisLayer as IRScope).children[0] as IRPath;

    expect(axisPath.children[0]).toEqual({ type: 'step', kind: 'move', to: [80, 260] });
    expect(axisPath.children[1]).toEqual({ type: 'step', kind: 'line', to: [120, 260] });
    expect(axisPath.arrow).toEqual({ start: {} });
  });

  it('形状刻度线下沉到节点而不是刻度路径', () => {
    const { axisLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        tickLabels: false,
        ticks: { values: [0, 1], mark: { kind: 'triangle', size: 6, orientation: 'outward', fill: '#111' } },
      },
      ctx,
    );
    const layer = axisLayer as IRScope;
    const paths = layer.children.filter((child): child is IRPath => child.type === 'path');
    const nodes = layer.children.filter((child): child is IRNode => child.type === 'node');

    expect(paths).toHaveLength(1);
    expect(nodes).toHaveLength(3);
    expect(nodes[0].shape).toEqual({ type: 'polygon', params: { sides: 3 } });
    expect(nodes[0].layout?.padding).toBe(0);
    expect(nodes[0].layout?.minimumSize).toEqual({ width: 6, height: 6 });
    expect(nodes[0].style?.fill).toBe('#111');
  });

  it('三角形刻度标记向内时在底部 x 轴上指向上方', () => {
    const { axisLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        tickLabels: false,
        ticks: { values: [1], mark: { kind: 'triangle', size: 6, orientation: 'inward' } },
      },
      ctx,
    );
    const triangle = nodeChildren(axisLayer as IRScope).find(node => JSON.stringify(node.shape).includes('polygon'));

    expect(triangle?.rotate).toBe(270);
  });

  it('自定义形状刻度线保留形状参考', () => {
    const { axisLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        tickLabels: false,
        ticks: {
          values: [0],
          mark: { kind: 'custom', shape: { type: 'polygon', params: { sides: 5 } }, width: 8, height: 6 },
        },
      },
      ctx,
    );
    const node = ((axisLayer as IRScope).children as Array<IRPath | IRNode>).find(
      (child): child is IRNode => child.type === 'node',
    );

    expect(node?.shape).toEqual({ type: 'polygon', params: { sides: 5 } });
    expect(node?.style?.fill).toBe('currentColor');
    expect(node?.layout?.minimumSize).toEqual({ width: 8, height: 6 });
  });

  it('刻度标签自动旋转选择第一个不重叠的角度', () => {
    const { axisLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        ticks: { values: [0, 1, 2] },
        tickLabels: { layout: { rotate: { angles: [0, -90] }, hide: false } },
      },
      { ...ctx, xTicks: { values: [0, 1, 2], labels: ['January', 'February', 'September'] } },
    );
    const labels = nodeChildren(axisLayer as IRScope).filter(node => typeof node.text === 'string');

    expect(labels).toHaveLength(3);
    expect(labels.every(label => label.rotate === -90)).toBe(true);
  });

  it('固定刻度标签旋转优先于自动旋转', () => {
    const { axisLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        ticks: { values: [0, 1, 2] },
        tickLabels: { rotate: 0, layout: { rotate: { angles: [-90] }, hide: false } },
      },
      { ...ctx, xTicks: { values: [0, 1, 2], labels: ['January', 'February', 'September'] } },
    );
    const labels = nodeChildren(axisLayer as IRScope).filter(node => typeof node.text === 'string');

    expect(labels).toHaveLength(3);
    expect(labels.every(label => label.rotate === 0)).toBe(true);
  });

  it('贪心隐藏刻度标签以消除重叠且不改变网格刻度', () => {
    const labels = ['January', 'February', 'March', 'April', 'September'];
    const { axisLayer, gridLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        ticks: { values: [0, 1, 2, 3, 4] },
        tickLabels: { layout: { rotate: false, hide: { strategy: 'greedy', preserveEnds: true } } },
        grid: true,
      },
      { ...ctx, xTicks: { values: [0, 1, 2, 3, 4], labels } },
    );
    const tickLabels = nodeChildren(axisLayer as IRScope).filter(node => labels.includes(String(node.text)));

    expect(tickLabels.length).toBeLessThan(labels.length);
    expect(tickLabels[0].text).toBe('January');
    expect(tickLabels[tickLabels.length - 1].text).toBe('September');
    expect(((gridLayer as IRScope).children[0] as IRPath).children).toHaveLength(10);
  });

  it('布局 false 保留所有刻度标签', () => {
    const labels = ['January', 'February', 'March', 'April', 'September'];
    const { axisLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        ticks: { values: [0, 1, 2, 3, 4] },
        tickLabels: { rotate: 0, layout: false },
      },
      { ...ctx, xTicks: { values: [0, 1, 2, 3, 4], labels } },
    );
    const tickLabels = nodeChildren(axisLayer as IRScope).filter(node => labels.includes(String(node.text)));

    expect(tickLabels.map(label => label.text)).toEqual(labels);
  });

  it('旋转的底部 x 刻度标签保持在端点外轴附近', () => {
    const labels = ['January revenue', 'February revenue'];
    const { axisLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        tickLabels: { rotate: -90, layout: false },
      },
      { ...ctx, xTicks: { values: [0, 1], labels } },
    );
    const tickLabels = nodeChildren(axisLayer as IRScope).filter(node => labels.includes(String(node.text)));

    expect(tickLabels.every(label => label.rotate === -90)).toBe(true);
    expect(tickLabels.every(label => (label.position as [number, number])[1] > 310)).toBe(true);
  });

  it('单个旋转刻度标签仍然应用端点对齐', () => {
    const { axisLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        tickLabels: { rotate: -90, layout: false },
      },
      { ...ctx, xTicks: { values: [0], labels: ['January revenue'] } },
    );
    const label = nodeByText(axisLayer as IRScope, 'January revenue');

    expect(label.rotate).toBe(-90);
    expect((label.position as [number, number])[1]).toBeGreaterThan(310);
  });

  it('自动旋转刻度标签在重叠隐藏之前使用端点对齐', () => {
    const labels = ['January revenue', 'February revenue', 'March revenue'];
    const { axisLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        tickLabels: { layout: { rotate: { angles: [-90] }, hide: false } },
      },
      { ...ctx, xTicks: { values: [0, 1, 2], labels } },
    );
    const tickLabels = nodeChildren(axisLayer as IRScope).filter(node => labels.includes(String(node.text)));

    expect(tickLabels.every(label => label.rotate === -90)).toBe(true);
    expect(tickLabels.every(label => (label.position as [number, number])[1] > 310)).toBe(true);
  });

  it('边界齐平在轴范围内移动边缘刻度标签', () => {
    const { axisLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        ticks: { values: [0, 10] },
        tickLabels: { layout: { rotate: false, hide: false, bounds: { overflow: 'flush' } } },
      },
      { ...ctx, xTicks: { values: [0, 10], labels: ['VeryLongStartLabel', 'VeryLongEndLabel'] } },
    );
    const start = nodeByText(axisLayer as IRScope, 'VeryLongStartLabel');
    const end = nodeByText(axisLayer as IRScope, 'VeryLongEndLabel');

    expect((start.position as [number, number])[0]).toBeGreaterThan(40);
    expect((end.position as [number, number])[0]).toBeLessThan(440);
  });

  it('标记 false 隐藏刻度线但保留网格源', () => {
    const { axisLayer, gridLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        tickLabels: false,
        ticks: { values: [0, 1], mark: false },
        grid: true,
      },
      ctx,
    );

    expect((axisLayer as IRScope).children.filter(child => child.type === 'path')).toHaveLength(1);
    expect(((gridLayer as IRScope).children[0] as IRPath).children).toHaveLength(6);
  });

  it('y 轴正向箭头及延伸范围遵循坐标轴方向', () => {
    const { axisLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'y',
        line: {
          extent: { from: 9, to: 11 },
          arrow: { positive: { shape: 'stealth', length: 8 } },
        },
      },
      ctx,
    );
    const axisPath = (axisLayer as IRScope).children[0] as IRPath;

    expect(axisPath.children[0]).toEqual({ type: 'step', kind: 'move', to: [40, 35] });
    expect(axisPath.children[1]).toEqual({ type: 'step', kind: 'line', to: [40, -15] });
    expect(axisPath.arrow).toEqual({ end: { shape: 'stealth', length: 8 } });
  });

  it('配置后，原点交叉隐藏刻度并呈现单角标签', () => {
    const originCtx: GuideContext = {
      ...ctx,
      xTicks: { values: [-1, 0, 1], labels: ['-1', '0', '1'] },
      yTicks: { values: [0, 4, 8], labels: ['0', '4', '8'] },
    };
    const { axisLayer: xAxisLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        placement: { kind: 'origin', origin: 0, tickSide: 'bottom' },
        crossing: { value: 0, tick: 'hide', label: 'corner', corner: 'bottom-left' },
      },
      originCtx,
    );
    const { axisLayer: yAxisLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'y',
        placement: { kind: 'origin', origin: 0, tickSide: 'left' },
        crossing: { value: 0, tick: 'hide', label: 'hide' },
      },
      originCtx,
    );
    const xTickPath = (xAxisLayer as IRScope).children[1] as IRPath;
    const yTickPath = (yAxisLayer as IRScope).children[1] as IRPath;
    const xOriginLabel = nodeByText(xAxisLayer as IRScope, '0');
    const yOriginLabels = nodeChildren(yAxisLayer as IRScope).filter(node => node.text === '0');

    expect(xTickPath.children).toHaveLength(4);
    expect(xTickPath.children).not.toContainEqual({ type: 'step', kind: 'move', to: [40, 260] });
    expect(yTickPath.children).toHaveLength(4);
    expect(yOriginLabels).toHaveLength(0);
    expect((xOriginLabel.position as [number, number])[0]).toBeLessThan(40);
    expect((xOriginLabel.position as [number, number])[1]).toBeGreaterThan(260);
  });

  it('轴端点策略隐藏箭头附近的刻度线，但默认保留标签和网格', () => {
    const endpointCtx: GuideContext = {
      ...ctx,
      xTicks: { values: [0, 5, 10], labels: ['0', '5', '10'] },
    };
    const { axisLayer, gridLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        line: { arrow: { positive: { length: 8 } } },
        ticks: { endpoint: { distance: 12 } },
        grid: true,
      },
      endpointCtx,
    );
    const tickPath = (axisLayer as IRScope).children[1] as IRPath;
    const labels = nodeChildren(axisLayer as IRScope);

    expect(tickPath.children).toHaveLength(4);
    expect(tickPath.children).not.toContainEqual({ type: 'step', kind: 'move', to: [440, 260] });
    expect(labels.map(label => label.text)).toContain('10');
    expect(((gridLayer as IRScope).children[0] as IRPath).children).toHaveLength(6);
  });

  it('轴端点默认隐藏箭头附近的刻度线，无需端点配置', () => {
    const endpointCtx: GuideContext = {
      ...ctx,
      xTicks: { values: [0, 5, 10], labels: ['0', '5', '10'] },
    };
    const { axisLayer, gridLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        line: { arrow: { positive: { length: 8 } } },
        grid: true,
      },
      endpointCtx,
    );
    const tickPath = (axisLayer as IRScope).children[1] as IRPath;
    const labels = nodeChildren(axisLayer as IRScope);

    expect(tickPath.children).toHaveLength(4);
    expect(tickPath.children).not.toContainEqual({ type: 'step', kind: 'move', to: [440, 260] });
    expect(labels.map(label => label.text)).toContain('10');
    expect(((gridLayer as IRScope).children[0] as IRPath).children).toHaveLength(6);
  });

  it('极轴拒绝结构线几何', () => {
    expect(() =>
      lowerGuide(
        { type: 'axis', dimension: 'x', line: { arrow: { positive: true } } },
        {
          ...ctx,
          frame: {
            type: 'polar2D',
            roles: ['x', 'y'],
            center: [100, 100],
            innerRadius: 20,
            outerRadius: 80,
            startAngle: 0,
            endAngle: 360,
            interpolation: 'polar',
            angularSkeleton: [0, 90, 180, 270],
            primary: fakeScale(value => value),
            secondary: fakeScale(value => value),
            roleScales: { x: fakeScale(value => value), y: fakeScale(value => value) },
            project: () => null,
            projectRoles: () => null,
            mapRoles: () => null,
            projectMappedRoles: () => null,
            placementBoundary: fakePolarPlacementBoundary,
            projectPolar: () => null,
            projectCell: () => ({
              kind: 'sector',
              center: [100, 100],
              innerRadius: 0,
              outerRadius: 1,
              startAngle: 0,
              endAngle: 1,
            }),
          },
        },
      ),
    ).toThrow(/axis line/);
  });

  it('原点位置穿过投影值并尊重刻度线', () => {
    const { axisLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        placement: { kind: 'origin', origin: 9, tickSide: 'top', offset: 2 },
      },
      ctx,
    );
    const axisPath = (axisLayer as IRScope).children[0] as IRPath;
    const tickPath = (axisLayer as IRScope).children[1] as IRPath;

    expect(axisPath.children[0]).toEqual({ type: 'step', kind: 'move', to: [40, 33] });
    expect(axisPath.children[1]).toEqual({ type: 'step', kind: 'line', to: [440, 33] });
    expect(tickPath.children[1]).toEqual({ type: 'step', kind: 'line', to: [40, 27] });
  });

  it('轴 id 到范围 id', () => {
    const layer = lowerGuide({ type: 'axis', dimension: 'x', id: 'xAxis' }, ctx).axisLayer as IRScope;

    expect(layer.id).toBe('xAxis');
  });

  it('原点放置拒绝尺寸的无效刻度线', () => {
    expect(() =>
      lowerGuide({ type: 'axis', dimension: 'x', placement: { kind: 'origin', tickSide: 'left' } }, ctx),
    ).toThrow(/tickSide/);
  });

  it('原点轴间隙偏移按尺寸和默认刻度线分组', () => {
    const spec = guidedSpec([
      { type: 'axis', dimension: 'x', placement: { kind: 'origin', origin: 0 } },
      { type: 'axis', dimension: 'y', placement: { kind: 'origin', origin: 0 } },
    ]);

    expect(() =>
      expandOf({
        ...spec,
        composition: {
          defaultView: 'root',
          views: [{ id: 'root', coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' } }],
          spacing: { axisGap: 12 },
        },
      }),
    ).not.toThrow();
  });

  it('原点轴重复检测标准化默认刻度侧', () => {
    expect(() =>
      expandOf(
        guidedSpec([
          { type: 'axis', dimension: 'x', placement: { kind: 'origin', origin: 0 } },
          { type: 'axis', dimension: 'x', placement: { kind: 'origin', origin: 0, tickSide: 'bottom' } },
        ]),
      ),
    ).toThrow(/duplicate axis/);
  });
});

// 端到端（经 lowerPlots）
const SALES = [
  { month: 0, revenue: 10 },
  { month: 1, revenue: 14 },
  { month: 2, revenue: 9 },
];

const guidedSpec = (guides: Array<unknown>): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'sales' },
    scales: [
      { type: 'linear', name: 'xMonth' },
      { type: 'linear', name: 'yRevenue' },
    ],
    coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
    marks: [
      { type: 'path', encodings: { order: 'month', position: { x: { field: 'month' }, y: { field: 'revenue' } } } },
    ],
    guides,
  });

const expandOf = (spec: IRPlot): IRScope => {
  return lowerPlotWithDataArtifact(
    spec,
    { sales: SALES },
    { layout: { width: 480, height: 300 }, textMeasurer: measureLabel },
  ).child as IRScope;
};

describe('lowerPlots 指导编排（契约）', () => {
  it('zorder 网格标记轴', () => {
    const outer = expandOf(
      guidedSpec([
        { type: 'axis', dimension: 'x' },
        { type: 'axis', dimension: 'y', grid: true },
      ]),
    );

    // children = [x 网格层, y 网格层, mark 层, x 轴层, y 轴层]
    expect(outer.children).toHaveLength(5);

    // 前两个是网格层（带 strokeOpacity）
    expect(((outer.children[0] as IRScope).children[0] as IRPath).style?.opacity).toEqual({ stroke: 0.15 });
    expect(((outer.children[1] as IRScope).children[0] as IRPath).style?.opacity).toEqual({ stroke: 0.15 });

    // 最后一个是轴层（纯文字 nodeDefault）
    expect((outer.children[4] as IRScope).defaults?.node?.style?.stroke).toBe('none');
  });

  it('使用引导场景进行编译', () => {
    const spec = guidedSpec([
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y', grid: true },
    ]);
    const scene = compileToScene(
      { version: 1, type: 'scene', children: [spec] },
      { composites: lowerPlots({ sales: SALES }, { layout: { width: 480, height: 300 } }) },
    ).scene;

    expect(scene.primitives.length).toBeGreaterThan(0);
  });

  it('重复轴放置被拒绝', () => {
    expect(() =>
      expandOf(
        guidedSpec([
          { type: 'axis', dimension: 'y' },
          { type: 'axis', dimension: 'y' },
        ]),
      ),
    ).toThrow(/placement/);
  });

  it('显式值域下坐标轴线与刻度对齐', () => {
    // 显式 range 时轴线须随实际 range 走（而非 margin 的 plotArea），与刻度/mark 对齐
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'xMonth', range: [100, 200] },
        { type: 'linear', name: 'yRevenue', range: [200, 0] },
      ],
      coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
      marks: [
        { type: 'path', encodings: { order: 'month', position: { x: { field: 'month' }, y: { field: 'revenue' } } } },
      ],
      guides: [{ type: 'axis', dimension: 'x' }],
    });
    const outer = expandOf(spec);

    // children = [mark 层, x 轴层]；轴线起止 x 须落在显式 range [100,200] 上（domain [0,2] → x [100,200]）
    const axisLayer = outer.children[outer.children.length - 1] as IRScope;
    const axisLine = (axisLayer.children[0] as IRPath).children;

    expect((axisLine[0] as { to: [number, number] }).to[0]).toBe(100);
    expect((axisLine[1] as { to: [number, number] }).to[0]).toBe(200);
  });

  it('网格使用按密度采样后的可见刻度集合并追加主题端点', () => {
    const outer = expandOf(
      guidedSpec([
        {
          type: 'axis',
          dimension: 'x',
          grid: true,
          ticks: { values: [0, 0.5, 1, 1.5, 2], density: { kind: 'sample', maxCount: 3 } },
        },
      ]),
    );
    const gridLayer = outer.children[0] as IRScope;
    const gridPath = gridLayer.children[0] as IRPath;

    // 默认无 domain padding，主题端点与可见 tick 端点重合并去重：3 条 grid × move/line
    expect(gridPath.children).toHaveLength(6);
  });
});
