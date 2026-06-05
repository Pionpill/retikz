import { compileToScene } from '@retikz/core';
import type { IRNode, IRPath, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { lowerPlots } from '../../src/lower/expand';
import { type GuideContext, lowerGuide } from '../../src/lower/guide';
import type { PositionScale } from '../../src/lower/scale';

/** 测试用最小 PositionScale：guide 只调 coordinate，其余成员给占位 */
const fakeScale = (coordinate: (value: number) => number): PositionScale => ({
  coordinate: value => coordinate(value as number),
  bandwidth: 0,
  ticks: () => ({ values: [], labels: [] }),
  range: () => [0, 0],
  setRange: () => {},
});

const ctx: GuideContext = {
  plotArea: { x: 40, y: 10, width: 400, height: 250 },
  projectX: fakeScale(value => 40 + value * 40),
  projectY: fakeScale(value => 260 - value * 25),
  xTicks: { values: [0, 1, 2], labels: ['0', '1', '2'] },
  yTicks: { values: [9, 10, 11], labels: ['9', '10', '11'] },
  fontSize: 11,
};

describe('lowerGuide (ADR-04)', () => {
  // Happy path
  it('lower_axis_x_structure', () => {
    const { gridLayer, axisLayer } = lowerGuide({ type: 'axis', dimension: 'x' }, ctx);
    expect(gridLayer).toBeNull();
    expect(axisLayer).not.toBeNull();
    const layer = axisLayer as IRScope;
    // 1 条 Path（轴线 + 刻度线）+ 3 个 label Node
    expect(layer.children).toHaveLength(4);
    expect((layer.children[0] as IRPath).type).toBe('path');
    const labels = layer.children.slice(1) as Array<IRNode>;
    expect(labels.map(n => n.text)).toEqual(['0', '1', '2']);
    // 轴线起点 = plot area 底边左端
    expect((layer.children[0] as IRPath).children[0]).toEqual({ type: 'step', kind: 'move', to: [40, 260] });
  });

  it('lower_axis_y_structure', () => {
    const { axisLayer } = lowerGuide({ type: 'axis', dimension: 'y' }, ctx);
    const layer = axisLayer as IRScope;
    const labels = layer.children.slice(1) as Array<IRNode>;
    expect(labels.map(n => n.text)).toEqual(['9', '10', '11']);
    // y label 垂直居中于 tick y（projectY(9)=35），水平在左侧轴外
    expect((labels[0].position as [number, number])[1]).toBe(35);
    expect((labels[0].position as [number, number])[0]).toBeLessThan(40);
  });

  it('lower_axis_x_grid_lines', () => {
    const { gridLayer } = lowerGuide({ type: 'axis', dimension: 'x', grid: true }, ctx);
    const layer = gridLayer as IRScope;
    const path = layer.children[0] as IRPath;
    // 3 条竖线 = 3 段 = 6 steps
    expect(path.children).toHaveLength(6);
    expect(path.children[0]).toEqual({ type: 'step', kind: 'move', to: [40, 10] });
    expect(path.children[1]).toEqual({ type: 'step', kind: 'line', to: [40, 260] });
  });

  it('lower_axis_y_grid_lines', () => {
    const { gridLayer } = lowerGuide({ type: 'axis', dimension: 'y', grid: true }, ctx);
    const path = (gridLayer as IRScope).children[0] as IRPath;
    // 横线：y=projectY(9)=35，从 left 到 right
    expect(path.children[0]).toEqual({ type: 'step', kind: 'move', to: [40, 35] });
    expect(path.children[1]).toEqual({ type: 'step', kind: 'line', to: [440, 35] });
  });

  it('tick_pixels_match_projector', () => {
    const layer = lowerGuide({ type: 'axis', dimension: 'x' }, ctx).axisLayer as IRScope;
    const labels = layer.children.slice(1) as Array<IRNode>;
    // tick value 1 → projectX(1)=80
    expect((labels[1].position as [number, number])[0]).toBe(80);
  });

  // 边界
  it('axis_no_grid_null_layer', () => {
    expect(lowerGuide({ type: 'axis', dimension: 'x' }, ctx).gridLayer).toBeNull();
  });

  it('axis_ticklabels_false_no_text', () => {
    const layer = lowerGuide({ type: 'axis', dimension: 'x', tickLabels: false }, ctx).axisLayer as IRScope;
    // 只剩轴线 + 刻度线 Path，无 label Node
    expect(layer.children).toHaveLength(1);
    expect((layer.children[0] as IRPath).type).toBe('path');
  });

  it('grid_empty_ticks_skipped', () => {
    const emptyCtx: GuideContext = { ...ctx, xTicks: { values: [], labels: [] } };
    const { gridLayer, axisLayer } = lowerGuide({ type: 'axis', dimension: 'x', grid: true }, emptyCtx);
    expect(gridLayer).toBeNull();
    // 轴线仍在（即便无刻度）
    expect(axisLayer).not.toBeNull();
  });

  // 错误路径 / 退化
  it('guide_styles_hoisted', () => {
    const { gridLayer, axisLayer } = lowerGuide({ type: 'axis', dimension: 'x', grid: true }, ctx);
    expect((axisLayer as IRScope).pathDefault?.stroke).toBe('currentColor');
    expect((axisLayer as IRScope).nodeDefault?.font?.size).toBe(11);
    expect((axisLayer as IRScope).nodeDefault?.stroke).toBe('none');
    expect((gridLayer as IRScope).pathDefault?.drawOpacity).toBe(0.15);
  });

  it('axis_id_to_scope_id', () => {
    const layer = lowerGuide({ type: 'axis', dimension: 'x', id: 'xAxis' }, ctx).axisLayer as IRScope;
    expect(layer.id).toBe('xAxis');
  });
});

// 端到端（经 lowerPlots）
const SALES = [
  { month: 0, revenue: 10 },
  { month: 1, revenue: 14 },
  { month: 2, revenue: 9 },
];

const guidedSpec = (guides: Array<unknown>): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { ref: 'sales' },
    scales: [
      { type: 'linear', name: 'xMonth' },
      { type: 'linear', name: 'yRevenue' },
    ],
    coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
    marks: [{ type: 'line', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
    guides,
  });

const expandOf = (spec: PlotSpec): IRScope => {
  const [def] = lowerPlots({ sales: SALES }, { width: 480, height: 300 });
  return def.expand(spec) as IRScope;
};

describe('lowerPlots guide orchestration (ADR-04)', () => {
  it('zorder_grid_mark_axis', () => {
    const outer = expandOf(guidedSpec([{ type: 'axis', dimension: 'x' }, { type: 'axis', dimension: 'y', grid: true }]));
    // children = [y 网格层, mark 层, x 轴层, y 轴层]
    expect(outer.children).toHaveLength(4);
    // 第一个是网格层（带 drawOpacity）
    expect((outer.children[0] as IRScope).pathDefault?.drawOpacity).toBe(0.15);
    // 最后一个是轴层（纯文字 nodeDefault）
    expect((outer.children[3] as IRScope).nodeDefault?.stroke).toBe('none');
  });

  it('compile_with_guides_scene', () => {
    const spec = guidedSpec([{ type: 'axis', dimension: 'x' }, { type: 'axis', dimension: 'y', grid: true }]);
    const scene = compileToScene(
      { version: 1, type: 'scene', children: [spec] },
      { composites: lowerPlots({ sales: SALES }, { width: 480, height: 300 }) },
    );
    expect(scene.primitives.length).toBeGreaterThan(0);
  });

  it('duplicate_axis_dimension_rejected', () => {
    expect(() => expandOf(guidedSpec([{ type: 'axis', dimension: 'y' }, { type: 'axis', dimension: 'y' }]))).toThrow(/dimension/);
  });

  it('explicit_range_axis_line_aligns_with_ticks', () => {
    // 显式 range 时轴线须随实际 range 走（而非 margin 的 plotArea），与刻度/mark 对齐
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { ref: 'sales' },
      scales: [
        { type: 'linear', name: 'xMonth', range: [100, 200] },
        { type: 'linear', name: 'yRevenue', range: [200, 0] },
      ],
      coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
      marks: [{ type: 'line', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
      guides: [{ type: 'axis', dimension: 'x' }],
    });
    const outer = expandOf(spec);
    // children = [mark 层, x 轴层]；轴线起止 x 须落在显式 range [100,200] 上（domain [0,2] → x [100,200]）
    const axisLayer = outer.children[outer.children.length - 1] as IRScope;
    const axisLine = (axisLayer.children[0] as IRPath).children;
    expect((axisLine[0] as { to: [number, number] }).to[0]).toBe(100);
    expect((axisLine[1] as { to: [number, number] }).to[0]).toBe(200);
  });
});
