import { describe, expect, it } from 'vitest';

import { PlotSpecSchema } from '../../src/schemas';
import { AxisGuideSchema, GuideSchema, LegendGuideSchema } from '../../src/schemas/guide';

describe('GuideSchema contract', () => {
  // Happy path
  it('axis_x_valid', () => {
    const guide = { type: 'axis', dimension: 'x' };
    expect(GuideSchema.parse(guide)).toEqual(guide);
  });

  it('axis_y_full_valid', () => {
    const guide = { type: 'axis', dimension: 'y', ticks: { count: 5 }, grid: true, tickLabels: false, id: 'yAxis' };
    expect(GuideSchema.parse(guide)).toEqual(guide);
  });

  it('axis_with_grid_valid', () => {
    const guide = { type: 'axis', dimension: 'x', grid: true };
    expect(GuideSchema.parse(guide)).toEqual(guide);
  });

  it('axis_and_legend_accept_layer_zindex', () => {
    const axis = { type: 'axis', dimension: 'x', layer: { zIndex: 240 } };
    const legend = { type: 'legend', channel: 'color', layer: { zIndex: 520 } };

    expect(AxisGuideSchema.parse(axis)).toEqual(axis);
    expect(LegendGuideSchema.parse(legend)).toEqual(legend);
  });

  it('guide_layer_rejects_fractional_zindex_and_unknown_fields', () => {
    expect(() => AxisGuideSchema.parse({ type: 'axis', dimension: 'x', layer: { zIndex: 1.5 } })).toThrow();
    expect(() =>
      LegendGuideSchema.parse({ type: 'legend', channel: 'color', layer: { zIndex: 1, order: 2 } }),
    ).toThrow();
  });

  it('legend_style_accepts_size_symbol_layout_tokens', () => {
    const guide = {
      type: 'legend',
      channel: 'size',
      style: {
        symbolSize: 12,
        symbolScale: 0.75,
        symbolFit: 'preserve',
      },
    };

    expect(LegendGuideSchema.parse(guide)).toEqual(guide);
  });

  it('axis_grid_accepts_independent_tick_source_density_minor_and_line_cap', () => {
    const guide = {
      type: 'axis',
      dimension: 'x',
      grid: {
        ticks: { interval: { kind: 'number', step: 10 } },
        density: { kind: 'sample', maxCount: 4 },
        bandPosition: 0,
        lineCap: 'round',
        minor: {
          ticks: { values: [5, 15, 25] },
          density: { kind: 'sample', minGap: 12 },
          bandPosition: 1,
          stroke: '#e2e8f0',
          lineCap: 'butt',
        },
      },
    };

    expect(AxisGuideSchema.parse(guide)).toEqual(guide);
  });

  // 边界
  it('axis_omits_optional_valid', () => {
    const guide = { type: 'axis', dimension: 'y' };
    expect(AxisGuideSchema.parse(guide)).toEqual(guide);
  });

  // 错误路径
  it('guide_unknown_type_rejected', () => {
    // grid 不是独立 type；legend 已纳入 union，但缺 channel 的 legend（仅给 dimension）仍非法
    expect(() => GuideSchema.parse({ type: 'grid', dimension: 'y' })).toThrow();
    expect(() => GuideSchema.parse({ type: 'legend', dimension: 'y' })).toThrow();
  });

  it('guide_missing_dimension_rejected', () => {
    expect(() => GuideSchema.parse({ type: 'axis' })).toThrow();
  });

  it('axis_custom_dimension_name_valid', () => {
    const guide = { type: 'axis', dimension: 'angle' };
    expect(GuideSchema.parse(guide)).toEqual(guide);
  });

  // contract：ternary 三角轴维度 x / y / z
  it('axis_ternary_xyz_dimensions_valid', () => {
    for (const dimension of ['x', 'y', 'z']) {
      expect(AxisGuideSchema.parse({ type: 'axis', dimension })).toEqual({ type: 'axis', dimension });
    }
  });

  it('axis_tick_count_non_positive_rejected', () => {
    expect(() => GuideSchema.parse({ type: 'axis', dimension: 'x', ticks: { count: 0 } })).toThrow();
    expect(() => GuideSchema.parse({ type: 'axis', dimension: 'x', ticks: { count: -1 } })).toThrow();
    expect(() => GuideSchema.parse({ type: 'axis', dimension: 'x', ticks: { count: 2.5 } })).toThrow();
  });

  it('axis_grid_non_boolean_rejected', () => {
    expect(() => GuideSchema.parse({ type: 'axis', dimension: 'x', grid: 'yes' })).toThrow();
  });

  it('axis_grid_rejects_invalid_minor_and_band_position', () => {
    expect(() => AxisGuideSchema.parse({ type: 'axis', dimension: 'x', grid: { bandPosition: -0.1 } })).toThrow();
    expect(() => AxisGuideSchema.parse({ type: 'axis', dimension: 'x', grid: { bandPosition: 1.1 } })).toThrow();
    expect(() => AxisGuideSchema.parse({ type: 'axis', dimension: 'x', grid: { minor: true } })).toThrow();
    expect(() => AxisGuideSchema.parse({ type: 'axis', dimension: 'x', grid: { minor: {} } })).toThrow();
  });

  it('legend_symbol_layout_rejects_invalid_values', () => {
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: 'size', style: { symbolSize: 0 } })).toThrow();
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: 'size', style: { symbolScale: 0 } })).toThrow();
    expect(() =>
      LegendGuideSchema.parse({ type: 'legend', channel: 'size', style: { symbolFit: 'stretch' } }),
    ).toThrow();
  });

  // 交互
  it('guide_roundtrip', () => {
    const guide = {
      type: 'axis',
      dimension: 'y',
      ticks: { count: 4 },
      grid: true,
      tickLabels: { format: '.1f' },
      id: 'yA',
    };
    expect(GuideSchema.parse(JSON.parse(JSON.stringify(guide)))).toEqual(guide);
  });

  it('axis_title_accepts_text_block_and_style', () => {
    const guide = {
      type: 'axis',
      dimension: 'x',
      title: { text: ['Revenue', { text: 'USD', fill: '#666' }], font: { size: 12 }, textColor: '#111' },
      tickLabels: { format: '$.2f', rotate: -30, align: 'end' },
      line: { stroke: '#333', dashPattern: [4, 2], dashOffset: 1.5 },
      ticks: { values: [0, 10], length: 6 },
    };
    expect(AxisGuideSchema.parse(guide)).toEqual(guide);
  });

  it('axis_line_dash_offset_rejects_non_finite_values', () => {
    expect(() => AxisGuideSchema.parse({ type: 'axis', dimension: 'x', line: { dashOffset: Number.NaN } })).toThrow();
    expect(() =>
      AxisGuideSchema.parse({ type: 'axis', dimension: 'x', line: { dashOffset: Number.POSITIVE_INFINITY } }),
    ).toThrow();
  });

  it('axis_line_accepts_advanced_geometry', () => {
    const guide = {
      type: 'axis',
      dimension: 'x',
      placement: { kind: 'origin', origin: 0, tickSide: 'bottom', offset: 2 },
      line: {
        lineCap: 'round',
        extent: { from: -5, to: 5 },
        arrow: {
          negative: true,
          positive: { shape: 'stealth', length: 8, width: 6 },
        },
      },
    };
    expect(AxisGuideSchema.parse(guide)).toEqual(guide);
  });

  it('axis_line_empty_arrow_object_rejected', () => {
    expect(() => AxisGuideSchema.parse({ type: 'axis', dimension: 'x', line: { arrow: {} } })).toThrow();
    expect(() =>
      AxisGuideSchema.parse({ type: 'axis', dimension: 'x', line: { arrow: { negative: false, positive: false } } }),
    ).toThrow();
  });

  it('axis_ticks_accept_interval_density_and_shape_mark', () => {
    const guide = {
      type: 'axis',
      dimension: 'x',
      ticks: {
        interval: { kind: 'number', step: 10, anchor: 0 },
        density: { kind: 'sample', maxCount: 6, minGap: 24 },
        mark: { kind: 'triangle', size: 6, orientation: 'outward', fill: 'currentColor' },
      },
    };
    expect(AxisGuideSchema.parse(guide)).toEqual(guide);
  });

  it('axis_title_placement_accepts_core_label_keywords_and_ratio', () => {
    const keywordGuide = {
      type: 'axis',
      dimension: 'x',
      title: { text: 'x', placement: 'at-end' },
    };
    const ratioGuide = {
      type: 'axis',
      dimension: 'x',
      title: { text: 'x', placement: 0.4 },
    };

    expect(AxisGuideSchema.parse(keywordGuide)).toEqual(keywordGuide);
    expect(AxisGuideSchema.parse(ratioGuide)).toEqual(ratioGuide);
  });

  it('axis_title_accepts_padding_anchor_shift_and_layout', () => {
    const guide = {
      type: 'axis',
      dimension: 'x',
      title: {
        text: 'x',
        padding: 8,
        placement: 'very-near-end',
        anchor: { align: 'end', baseline: 'top' },
        shift: { along: -6, normal: 2 },
        layout: { reserveSpace: false, avoidTickLabels: true, avoidLineMarks: true, overflow: 'flush' },
      },
    };

    expect(AxisGuideSchema.parse(guide)).toEqual(guide);
  });

  it('axis_title_placement_rejects_out_of_range_ratio', () => {
    expect(() =>
      AxisGuideSchema.parse({
        type: 'axis',
        dimension: 'x',
        title: { text: 'x', placement: 1.2 },
      }),
    ).toThrow();
  });

  it('axis_title_rejects_gap_and_empty_layout_objects', () => {
    expect(() => AxisGuideSchema.parse({ type: 'axis', dimension: 'x', title: { text: 'x', gap: 4 } })).toThrow();
    expect(() => AxisGuideSchema.parse({ type: 'axis', dimension: 'x', title: { text: 'x', shift: {} } })).toThrow();
    expect(() => AxisGuideSchema.parse({ type: 'axis', dimension: 'x', title: { text: 'x', anchor: {} } })).toThrow();
    expect(() =>
      AxisGuideSchema.parse({ type: 'axis', dimension: 'x', title: { text: 'x', layout: { overflow: 'clip' } } }),
    ).toThrow();
  });

  it('axis_title_orientation_accepts_semantic_rotation_modes', () => {
    for (const orientation of ['auto', 'horizontal', 'axis']) {
      const guide = {
        type: 'axis',
        dimension: 'y',
        title: { text: 'y', orientation },
      };
      expect(AxisGuideSchema.parse(guide)).toEqual(guide);
    }
  });

  it('axis_title_orientation_rejects_unknown_mode', () => {
    expect(() =>
      AxisGuideSchema.parse({
        type: 'axis',
        dimension: 'y',
        title: { text: 'y', orientation: 'upright' },
      }),
    ).toThrow();
  });

  it('axis_crossing_policy_accepts_corner_label_and_hidden_tick', () => {
    const guide = {
      type: 'axis',
      dimension: 'x',
      crossing: { value: 0, tick: 'hide', label: 'corner', corner: 'bottom-left' },
    };

    expect(AxisGuideSchema.parse(guide)).toEqual(guide);
  });

  it('axis_crossing_policy_rejects_non_finite_value_and_unused_corner', () => {
    expect(() =>
      AxisGuideSchema.parse({
        type: 'axis',
        dimension: 'x',
        crossing: { value: Number.POSITIVE_INFINITY },
      }),
    ).toThrow();
    expect(() =>
      AxisGuideSchema.parse({
        type: 'axis',
        dimension: 'x',
        crossing: { label: 'hide', corner: 'bottom-left' },
      }),
    ).toThrow();
    expect(() =>
      AxisGuideSchema.parse({
        type: 'axis',
        dimension: 'x',
        crossing: { tick: 'hide', corner: 'bottom-left' },
      }),
    ).toThrow();
  });

  it('axis_tick_endpoint_policy_rejects_negative_distance', () => {
    expect(() =>
      AxisGuideSchema.parse({
        type: 'axis',
        dimension: 'x',
        ticks: { endpoint: { distance: -1 } },
      }),
    ).toThrow();
  });

  it('axis_ticks_accept_custom_shape_mark', () => {
    const guide = {
      type: 'axis',
      dimension: 'x',
      ticks: {
        values: [0, 1],
        mark: { kind: 'custom', shape: { type: 'polygon', params: { sides: 5 } }, width: 8, height: 6 },
      },
    };
    expect(AxisGuideSchema.parse(guide)).toEqual(guide);
  });

  it('axis_ticks_reject_invalid_density_interval_and_mark_conflicts', () => {
    expect(() =>
      AxisGuideSchema.parse({ type: 'axis', dimension: 'x', ticks: { density: { kind: 'sample' } } }),
    ).toThrow();
    expect(() =>
      AxisGuideSchema.parse({ type: 'axis', dimension: 'x', ticks: { interval: { kind: 'number', step: 0 } } }),
    ).toThrow();
    expect(() =>
      AxisGuideSchema.parse({ type: 'axis', dimension: 'x', ticks: { mark: { kind: 'line' }, length: 4 } }),
    ).toThrow();
    expect(() =>
      AxisGuideSchema.parse({ type: 'axis', dimension: 'x', ticks: { mark: { kind: 'custom' } } }),
    ).toThrow();
  });

  it('axis_tick_labels_accept_adaptive_layout', () => {
    const guide = {
      type: 'axis',
      dimension: 'x',
      tickLabels: {
        layout: {
          rotate: { angles: [0, -45, -90], recoverWhenFailed: false },
          hide: { strategy: 'parity', preserveEnds: true, separation: 4 },
          bounds: { overflow: 'hide', tolerance: 2 },
          sampleSize: 8,
        },
      },
    };
    expect(AxisGuideSchema.parse(guide)).toEqual(guide);
  });

  it('axis_tick_labels_reject_invalid_layout_values', () => {
    expect(() =>
      AxisGuideSchema.parse({ type: 'axis', dimension: 'x', tickLabels: { layout: { rotate: { angles: [] } } } }),
    ).toThrow();
    expect(() =>
      AxisGuideSchema.parse({ type: 'axis', dimension: 'x', tickLabels: { layout: { hide: { separation: -1 } } } }),
    ).toThrow();
    expect(() =>
      AxisGuideSchema.parse({ type: 'axis', dimension: 'x', tickLabels: { layout: { bounds: { tolerance: -1 } } } }),
    ).toThrow();
    expect(() =>
      AxisGuideSchema.parse({ type: 'axis', dimension: 'x', tickLabels: { layout: { sampleSize: 0 } } }),
    ).toThrow();
  });

  it('theme_axis_line_rejects_structural_geometry', () => {
    const spec = {
      namespace: 'plot',
      type: 'plot',
      data: { values: [{ x: 1, y: 2 }] },
      marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
      theme: {
        axis: {
          line: {
            arrow: { positive: true },
          },
        },
      },
    };
    expect(() => PlotSpecSchema.parse(spec)).toThrow();
  });

  it('theme_axis_ticks_accepts_mark_but_rejects_tick_source_and_density', () => {
    expect(() =>
      PlotSpecSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        scales: [
          { type: 'linear', name: 'x' },
          { type: 'linear', name: 'y' },
        ],
        coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
        marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
        theme: { axis: { ticks: { mark: { kind: 'circle', size: 4 } } } },
      }),
    ).not.toThrow();
    expect(() =>
      PlotSpecSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        scales: [
          { type: 'linear', name: 'x' },
          { type: 'linear', name: 'y' },
        ],
        coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
        marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
        theme: { axis: { ticks: { count: 5 } } },
      }),
    ).toThrow();
    expect(() =>
      PlotSpecSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        scales: [
          { type: 'linear', name: 'x' },
          { type: 'linear', name: 'y' },
        ],
        coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
        marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
        theme: { axis: { ticks: { density: { kind: 'sample', maxCount: 4 } } } },
      }),
    ).toThrow();
  });

  it('theme_axis_tick_labels_accept_layout_but_reject_format', () => {
    expect(() =>
      PlotSpecSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        scales: [
          { type: 'linear', name: 'x' },
          { type: 'linear', name: 'y' },
        ],
        coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
        marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
        theme: { axis: { tickLabels: { layout: { hide: { strategy: 'greedy' } } } } },
      }),
    ).not.toThrow();
    expect(() =>
      PlotSpecSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        scales: [
          { type: 'linear', name: 'x' },
          { type: 'linear', name: 'y' },
        ],
        coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
        marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
        theme: { axis: { tickLabels: { format: '.2f' } } },
      }),
    ).toThrow();
  });

  it('theme_axis_grid_accepts_line_cap_but_rejects_semantic_grid_fields', () => {
    expect(() =>
      PlotSpecSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        scales: [
          { type: 'linear', name: 'x' },
          { type: 'linear', name: 'y' },
        ],
        coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
        marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
        theme: { axis: { grid: { stroke: '#ddd', lineCap: 'round' } } },
      }),
    ).not.toThrow();

    for (const grid of [
      { ticks: { count: 4 } },
      { density: { kind: 'sample', maxCount: 4 } },
      { minor: { ticks: { values: [1] } } },
      { bandPosition: 0.5 },
      { applyTo: 'all' },
      { select: { view: 'main' } },
    ]) {
      expect(() =>
        PlotSpecSchema.parse({
          namespace: 'plot',
          type: 'plot',
          data: { reference: 'd' },
          scales: [
            { type: 'linear', name: 'x' },
            { type: 'linear', name: 'y' },
          ],
          coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
          marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
          theme: { axis: { grid } },
        }),
      ).toThrow();
    }
  });
});

describe('GuideSchema plot dimensions', () => {
  it('axis_angle_dimension_valid_at_schema_layer', () => {
    expect(GuideSchema.parse({ type: 'axis', dimension: 'angle' })).toEqual({ type: 'axis', dimension: 'angle' });
  });

  it('axis_radius_dimension_valid_at_schema_layer', () => {
    expect(GuideSchema.parse({ type: 'axis', dimension: 'radius' })).toEqual({ type: 'axis', dimension: 'radius' });
  });

  it('axis_theta_dimension_valid_at_schema_layer', () => {
    expect(GuideSchema.parse({ type: 'axis', dimension: 'theta' })).toEqual({ type: 'axis', dimension: 'theta' });
  });

  it('axis_xyz_roundtrip', () => {
    const guide = { type: 'axis', dimension: 'x', grid: true, tickLabels: false, id: 'xAxis' };
    expect(GuideSchema.parse(JSON.parse(JSON.stringify(guide)))).toEqual(guide);
  });
});

describe('LegendGuideSchema contract', () => {
  // Happy path
  it('legend_minimal_valid', () => {
    // 最小合法 legend：仅 type + channel
    const guide = { type: 'legend', channel: 'color' };
    expect(LegendGuideSchema.parse(guide)).toEqual(guide);
  });

  it('legend_all_fields_valid', () => {
    const guide = {
      type: 'legend',
      channel: 'size',
      scale: '__size_population',
      title: 'Population',
      position: 'bottom',
      orient: 'horizontal',
      ticks: { count: 4 },
      tickLabels: { format: '.1f' },
      style: { swatchSize: 12, label: { textColor: '#334155' } },
    };
    expect(LegendGuideSchema.parse(guide)).toEqual(guide);
  });

  it('legend_each_channel_valid', () => {
    for (const channel of ['color', 'size', 'opacity', 'shape'] as const) {
      expect(LegendGuideSchema.parse({ type: 'legend', channel })).toEqual({ type: 'legend', channel });
    }
  });

  it('legend_each_position_valid', () => {
    for (const position of ['right', 'left', 'top', 'bottom'] as const) {
      const guide = { type: 'legend', channel: 'color', position };
      expect(LegendGuideSchema.parse(guide)).toEqual(guide);
    }
  });

  // 边界：可选字段省略
  it('legend_omits_optional_valid', () => {
    const guide = { type: 'legend', channel: 'opacity' };
    expect(LegendGuideSchema.parse(guide)).toEqual(guide);
  });

  // 错误路径
  it('legend_missing_channel_rejected', () => {
    expect(() => LegendGuideSchema.parse({ type: 'legend' })).toThrow();
  });

  it('legend_custom_channel_name_valid', () => {
    const guide = { type: 'legend', channel: 'intensity' };
    expect(LegendGuideSchema.parse(guide)).toEqual(guide);
  });

  it('legend_empty_channel_rejected', () => {
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: '' })).toThrow();
  });

  it('legend_bad_position_rejected', () => {
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: 'color', position: 'center' })).toThrow();
  });

  it('legend_bad_orient_rejected', () => {
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: 'color', orient: 'diagonal' })).toThrow();
  });

  it('legend_empty_scale_rejected', () => {
    // scale 给了但为空串 → min(1) 拒
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: 'color', scale: '' })).toThrow();
  });

  it('legend_empty_title_reports_legend_message', () => {
    const result = LegendGuideSchema.safeParse({ type: 'legend', channel: 'color', title: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.message.includes('legend title'))).toBe(true);
    }
  });

  it('legend_tickcount_non_positive_rejected', () => {
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: 'color', ticks: { count: 0 } })).toThrow();
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: 'color', ticks: { count: -2 } })).toThrow();
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: 'color', ticks: { count: 3.5 } })).toThrow();
  });

  it('legend_ticklabels_non_boolean_rejected', () => {
    expect(() => LegendGuideSchema.parse({ type: 'legend', channel: 'color', tickLabels: 'yes' })).toThrow();
  });
});

describe('GuideSchema discriminated union contract', () => {
  // union 判别：axis 仍合法（回归）
  it('union_accepts_axis', () => {
    const guide = { type: 'axis', dimension: 'x', grid: true };
    expect(GuideSchema.parse(guide)).toEqual(guide);
  });

  // union 判别：legend 合法
  it('union_accepts_legend', () => {
    const guide = { type: 'legend', channel: 'color', position: 'right' };
    expect(GuideSchema.parse(guide)).toEqual(guide);
  });

  // type 缺失 → union 无法判别 → 报错可定位到 type
  it('union_missing_type_rejected_at_type_path', () => {
    const result = GuideSchema.safeParse({ channel: 'color' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.path.includes('type'))).toBe(true);
    }
  });

  // type 拼错 → union 无合法成员 → 报错可定位
  it('union_bad_type_rejected', () => {
    const result = GuideSchema.safeParse({ type: 'lgend', channel: 'color' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.path.includes('type'))).toBe(true);
    }
  });

  // zod parse 错误路径：legend 缺 channel → issue.path 定位到 channel
  it('union_legend_missing_channel_path', () => {
    const result = GuideSchema.safeParse({ type: 'legend' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.path.includes('channel'))).toBe(true);
    }
  });

  // JSON round-trip：legend 全字段保形
  it('legend_roundtrip_full', () => {
    const guide = {
      type: 'legend',
      channel: 'color',
      scale: '__color',
      title: 'Density',
      position: 'left',
      orient: 'vertical',
      ticks: { count: 5 },
      tickLabels: false,
    };
    expect(GuideSchema.parse(JSON.parse(JSON.stringify(guide)))).toEqual(guide);
  });

  // JSON round-trip：axis（回归 union 后仍保形）
  it('axis_roundtrip_through_union', () => {
    const guide = { type: 'axis', dimension: 'y', ticks: { count: 4 }, grid: true };
    expect(GuideSchema.parse(JSON.parse(JSON.stringify(guide)))).toEqual(guide);
  });
});
