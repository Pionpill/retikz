import type { IRNode, IRPath, IRScope } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { PositionScale } from '../../../src/contract';
import type { GuideContext } from '../../../src/contract';
import type { PlotSpec } from '../../../src/schemas';

import { createCoordinateFrame } from '../../../src/contract';
import { lowerCustomAxis, lowerGuide } from '../../../src/pipeline';
import { lowerPlots } from '../../../src/pipeline/expand';
import { PlotSpecSchema } from '../../../src/schemas';

/** 测试用最小 PositionScale：guide 只调 coordinate，其余成员给占位 */
const fakeScale = (coordinate: (value: number) => number): PositionScale => ({
  coordinate: value => coordinate(value as number),
  domain: () => [0, 1],
  bandwidth: 0,
  ticks: () => ({ values: [], labels: [] }),
  range: () => [0, 0],
  setRange: () => {},
});

/** 测试曲线轴用 scale：lowerCustomAxis 依赖 ticks 推导轴采样范围 */
const fakeTickScale = (coordinate: (value: number) => number, values: Array<number>): PositionScale => ({
  coordinate: value => coordinate(value as number),
  domain: () => [values[0], values[values.length - 1]],
  bandwidth: 0,
  ticks: () => ({ values, labels: values.map(value => String(value)) }),
  range: () => [coordinate(values[0]), coordinate(values[values.length - 1])],
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

const nodeChildren = (layer: IRScope): Array<IRNode> => layer.children.filter(child => child.type === 'node') as Array<IRNode>;

const nodeByText = (layer: IRScope, text: string): IRNode => {
  const node = nodeChildren(layer).find(child => child.text === text);
  expect(node).toBeDefined();
  return node as IRNode;
};

describe('lowerGuide (ADR-04)', () => {
  // Happy path
  it('lower_axis_x_structure', () => {
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

  it('lower_axis_y_structure', () => {
    const { axisLayer } = lowerGuide({ type: 'axis', dimension: 'y' }, ctx);
    const layer = axisLayer as IRScope;
    const labels = nodeChildren(layer);
    expect(labels.map(n => n.text)).toEqual(['9', '10', '11']);
    // y label 垂直居中于 tick y（projectY(9)=35），水平在左侧轴外
    expect((labels[0].position as [number, number])[1]).toBe(35);
    expect((labels[0].position as [number, number])[0]).toBeLessThan(40);
  });

  it('y_axis_title_defaults_to_rotated_top_edge_near_left_axis', () => {
    const { axisLayer } = lowerGuide({ type: 'axis', dimension: 'y', title: 'Revenue' }, ctx);
    const title = nodeByText(axisLayer as IRScope, 'Revenue');

    expect(title.rotate).toBe(90);
    expect((title.position as [number, number])[0]).toBeCloseTo(7.3, 6);
    expect((title.position as [number, number])[1]).toBe(135);
  });

  it('right_y_axis_title_defaults_to_rotated_top_edge_near_left_side', () => {
    const { axisLayer } = lowerGuide(
      { type: 'axis', dimension: 'y', placement: { kind: 'side', side: 'right' }, title: 'Revenue' },
      ctx,
    );
    const title = nodeByText(axisLayer as IRScope, 'Revenue');

    expect(title.rotate).toBe(-90);
    expect((title.position as [number, number])[0]).toBeCloseTo(472.7, 6);
    expect((title.position as [number, number])[1]).toBe(135);
  });

  it('explicit_y_axis_title_rotation_is_preserved', () => {
    const { axisLayer } = lowerGuide(
      { type: 'axis', dimension: 'y', title: { text: 'Revenue', rotate: 0 } },
      ctx,
    );
    const title = nodeByText(axisLayer as IRScope, 'Revenue');

    expect(title.rotate).toBe(0);
  });

  it('axis_title_at_end_places_x_title_near_positive_axis_end', () => {
    const { axisLayer } = lowerGuide(
      { type: 'axis', dimension: 'x', title: { text: 'x', placement: 'at-end' } },
      ctx,
    );
    const title = nodeByText(axisLayer as IRScope, 'x');

    expect((title.position as [number, number])[0]).toBe(440);
  });

  it('axis_title_ratio_placement_samples_baseline_from_negative_to_positive', () => {
    const { axisLayer } = lowerGuide(
      { type: 'axis', dimension: 'x', title: { text: 'x', placement: 0.4 } },
      ctx,
    );
    const title = nodeByText(axisLayer as IRScope, 'x');

    expect((title.position as [number, number])[0]).toBe(200);
  });

  it('axis_title_at_end_places_y_title_near_visual_top', () => {
    const { axisLayer } = lowerGuide(
      { type: 'axis', dimension: 'y', title: { text: 'y', placement: 'at-end' } },
      ctx,
    );
    const title = nodeByText(axisLayer as IRScope, 'y');

    expect((title.position as [number, number])[1]).toBe(10);
  });

  it('polar_angular_axis_title_placement_samples_angle_range', () => {
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
          continuousAngle: true,
          primary: fakeScale(value => value),
          secondary: fakeScale(value => value),
          roleScales: { x: fakeScale(value => value), y: fakeScale(value => value) },
          project: () => null,
          projectRoles: () => null,
          projectPolar: () => null,
          projectCell: () => ({ kind: 'sector', center: [100, 100], innerRadius: 0, outerRadius: 1, startAngle: 0, endAngle: 1 }),
        },
        angularTicks: { values: [], labels: [] },
      },
    );
    const title = nodeByText(axisLayer as IRScope, 'theta');

    expect((title.position as [number, number])[0]).toBeLessThan(40);
  });

  it('polar_radial_axis_title_placement_samples_radius_range', () => {
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
          continuousAngle: true,
          primary: fakeScale(value => value),
          secondary: fakeScale(value => value),
          roleScales: { x: fakeScale(value => value), y: fakeScale(value => value) },
          project: () => null,
          projectRoles: () => null,
          projectPolar: () => null,
          projectCell: () => ({ kind: 'sector', center: [100, 100], innerRadius: 0, outerRadius: 1, startAngle: 0, endAngle: 1 }),
        },
        radialTicks: { values: [], labels: [] },
      },
    );
    const title = nodeByText(axisLayer as IRScope, 'radius');

    expect((title.position as [number, number])[0]).toBeGreaterThan(170);
  });

  it('ternary_axis_title_placement_samples_axis_edge', () => {
    const { axisLayer } = lowerGuide(
      { type: 'axis', dimension: 'x', title: { text: 'x', placement: 'at-end' } },
      {
        ...ctx,
        ternaryVertices: [[50, 0], [0, 100], [100, 100]],
        ternaryTicks: { values: [0, 1], labels: ['0', '1'] },
      },
    );
    const title = nodeByText(axisLayer as IRScope, 'x');

    expect((title.position as [number, number])[1]).toBeLessThan(20);
  });

  it('custom_axis_title_placement_samples_numeric_axis_range', () => {
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
    const { axisLayer } = lowerCustomAxis(frame, { type: 'axis', dimension: 'u', title: { text: 'u', placement: 'at-end' } }, 11, undefined);
    const title = nodeByText(axisLayer as IRScope, 'u');

    expect((title.position as [number, number])[0]).toBeCloseTo(100, 6);
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
    const labels = nodeChildren(layer);
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
    expect(layer.children).toHaveLength(2);
    expect((layer.children[0] as IRPath).type).toBe('path');
    expect(nodeChildren(layer)).toEqual([]);
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
    expect(((gridLayer as IRScope).children[0] as IRPath).drawOpacity).toBe(0.15);
  });

  it('guide_line_style_includes_dash_offset', () => {
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

    expect(axisPath.dashPattern).toEqual([4, 2]);
    expect(axisPath.dashOffset).toBe(1.5);
    expect(tickPath.dashPattern).toEqual([2, 2]);
    expect(tickPath.dashOffset).toBe(-1);
    expect(gridPath.dashPattern).toEqual([1, 3]);
    expect(gridPath.dashOffset).toBe(3);
  });

  it('axis_line_positive_arrow_and_line_cap_lower_to_path', () => {
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

    expect(axisPath.lineCap).toBe('round');
    expect(axisPath.marks).toEqual([{ pos: 1, mark: { kind: 'arrow', shape: 'stealth', length: 8 } }]);
  });

  it('axis_line_negative_arrow_and_extent_lower_to_path', () => {
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
    expect(axisPath.marks).toEqual([{ pos: 0, mark: { kind: 'arrow' } }]);
  });

  it('shape_tick_mark_lowers_to_nodes_instead_of_tick_path', () => {
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
    expect(nodes[0].padding).toBe(0);
    expect(nodes[0].minimumSize).toEqual({ width: 6, height: 6 });
    expect(nodes[0].fill).toBe('#111');
  });

  it('triangle_tick_marker_points_up_on_bottom_x_axis_when_inward', () => {
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

  it('custom_shape_tick_mark_preserves_shape_ref', () => {
    const { axisLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        tickLabels: false,
        ticks: { values: [0], mark: { kind: 'custom', shape: { type: 'polygon', params: { sides: 5 } }, width: 8, height: 6 } },
      },
      ctx,
    );
    const node = ((axisLayer as IRScope).children as Array<IRPath | IRNode>).find((child): child is IRNode => child.type === 'node');

    expect(node?.shape).toEqual({ type: 'polygon', params: { sides: 5 } });
    expect(node?.fill).toBe('currentColor');
    expect(node?.minimumSize).toEqual({ width: 8, height: 6 });
  });

  it('tick_label_auto_rotate_chooses_first_non_overlapping_angle', () => {
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

  it('fixed_tick_label_rotate_overrides_auto_rotate', () => {
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

  it('greedy_tick_label_hide_removes_overlaps_without_changing_grid_ticks', () => {
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

  it('layout_false_preserves_all_tick_labels', () => {
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

  it('rotated_bottom_x_tick_labels_keep_near_endpoint_outside_axis', () => {
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

  it('single_rotated_tick_label_still_applies_endpoint_alignment', () => {
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

  it('single_generic_tick_label_still_applies_fixed_rotate_without_endpoint_alignment', () => {
    const { axisLayer } = lowerGuide(
      {
        type: 'axis',
        dimension: 'x',
        tickLabels: { rotate: -45, layout: false },
      },
      {
        ...ctx,
        ternaryVertices: [[0, 100], [100, 100], [50, 0]],
        ternaryTicks: { values: [0.5], labels: ['50%'] },
      },
    );
    const label = nodeByText(axisLayer as IRScope, '50%');

    expect(label.rotate).toBe(-45);
  });

  it('auto_rotated_tick_labels_use_endpoint_alignment_before_overlap_hiding', () => {
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

  it('bounds_flush_moves_edge_tick_labels_inside_axis_range', () => {
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

  it('mark_false_hides_tick_marks_but_keeps_grid_source', () => {
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

  it('y_axis_line_positive_arrow_and_extent_follow_axis_direction', () => {
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
    expect(axisPath.marks).toEqual([{ pos: 1, mark: { kind: 'arrow', shape: 'stealth', length: 8 } }]);
  });

  it('origin_crossing_hides_tick_and_renders_single_corner_label_when_configured', () => {
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

  it('axis_endpoint_policy_hides_tick_mark_near_arrow_but_keeps_label_and_grid_by_default', () => {
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

  it('axis_endpoint_default_hides_tick_mark_near_arrow_without_endpoint_config', () => {
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

  it('non_cartesian_axis_rejects_structural_line_geometry', () => {
    expect(() =>
      lowerGuide({ type: 'axis', dimension: 'x', line: { arrow: { positive: true } } }, { ...ctx, ternaryVertices: [[0, 0], [1, 0], [0, 1]] }),
    ).toThrow(/axis line/);
  });

  it('origin_placement_crosses_projected_value_and_respects_tick_side', () => {
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

  it('axis_id_to_scope_id', () => {
    const layer = lowerGuide({ type: 'axis', dimension: 'x', id: 'xAxis' }, ctx).axisLayer as IRScope;
    expect(layer.id).toBe('xAxis');
  });

  it('origin_placement_rejects_invalid_tick_side_for_dimension', () => {
    expect(() =>
      lowerGuide({ type: 'axis', dimension: 'x', placement: { kind: 'origin', tickSide: 'left' } }, ctx),
    ).toThrow(/tickSide/);
  });

  it('origin_axis_gap_offsets_are_grouped_by_dimension_and_default_tick_side', () => {
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

  it('origin_axis_duplicate_detection_normalizes_default_tick_side', () => {
    expect(() =>
      expandOf(
        guidedSpec([
          { type: 'axis', dimension: 'x', placement: { kind: 'origin', origin: 0 } },
          { type: 'axis', dimension: 'x', placement: { kind: 'origin', origin: 0, tickSide: 'bottom' } },
        ]),
      ),
    ).toThrow(/duplicate axis/);
  });

  it('ternary_axis_rejects_custom_tick_source_or_density', () => {
    const specOf = (ticks: { count?: number; density?: { kind: 'sample'; maxCount: number } }) => PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'linear', name: 'z' },
      ],
      coordinate: { type: 'ternary2D' },
      marks: [{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' }, z: { field: 'revenue' } } }],
      guides: [{ type: 'axis', dimension: 'x', ticks }],
    });

    expect(() => expandOf(specOf({ density: { kind: 'sample', maxCount: 3 } }))).toThrow(/ternary2D axis/);
    expect(() => expandOf(specOf({ count: 3 }))).toThrow(/ternary2D axis/);
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
    data: { reference: 'sales' },
    scales: [
      { type: 'linear', name: 'xMonth' },
      { type: 'linear', name: 'yRevenue' },
    ],
    coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
    marks: [{ type: 'path', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
    guides,
  });

const expandOf = (spec: PlotSpec): IRScope => {
  const [def] = lowerPlots({ sales: SALES }, { width: 480, height: 300 });
  return def.expand(spec) as IRScope;
};

describe('lowerPlots guide orchestration (ADR-04)', () => {
  it('zorder_grid_mark_axis', () => {
    const outer = expandOf(
      guidedSpec([
        { type: 'axis', dimension: 'x' },
        { type: 'axis', dimension: 'y', grid: true },
      ]),
    );
    // children = [y 网格层, mark 层, x 轴层, y 轴层]
    expect(outer.children).toHaveLength(4);
    // 第一个是网格层（带 drawOpacity）
    expect(((outer.children[0] as IRScope).children[0] as IRPath).drawOpacity).toBe(0.15);
    // 最后一个是轴层（纯文字 nodeDefault）
    expect((outer.children[3] as IRScope).nodeDefault?.stroke).toBe('none');
  });

  it('compile_with_guides_scene', () => {
    const spec = guidedSpec([
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y', grid: true },
    ]);
    const scene = compileToScene(
      { version: 1, type: 'scene', children: [spec] },
      { composites: lowerPlots({ sales: SALES }, { width: 480, height: 300 }) },
    );
    expect(scene.primitives.length).toBeGreaterThan(0);
  });

  it('duplicate_axis_placement_rejected', () => {
    expect(() =>
      expandOf(
        guidedSpec([
          { type: 'axis', dimension: 'y' },
          { type: 'axis', dimension: 'y' },
        ]),
      ),
    ).toThrow(/placement/);
  });

  it('explicit_range_axis_line_aligns_with_ticks', () => {
    // 显式 range 时轴线须随实际 range 走（而非 margin 的 plotArea），与刻度/mark 对齐
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'xMonth', range: [100, 200] },
        { type: 'linear', name: 'yRevenue', range: [200, 0] },
      ],
      coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
      marks: [{ type: 'path', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
      guides: [{ type: 'axis', dimension: 'x' }],
    });
    const outer = expandOf(spec);
    // children = [mark 层, x 轴层]；轴线起止 x 须落在显式 range [100,200] 上（domain [0,2] → x [100,200]）
    const axisLayer = outer.children[outer.children.length - 1] as IRScope;
    const axisLine = (axisLayer.children[0] as IRPath).children;
    expect((axisLine[0] as { to: [number, number] }).to[0]).toBe(100);
    expect((axisLine[1] as { to: [number, number] }).to[0]).toBe(200);
  });

  it('grid_uses_density_sampled_visible_tick_set', () => {
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

    expect(gridPath.children).toHaveLength(6);
  });
});
