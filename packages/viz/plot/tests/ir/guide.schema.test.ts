import { describe, expect, it } from 'vitest';

import { PlotSpecSchema } from '../../src/schemas';
import { AxisGuideSchema, GuideSchema, LegendGuideSchema } from '../../src/schemas/guide';

describe('GuideSchema (ADR-01 alpha.2)', () => {
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

  // alpha.9 ADR-03：ternary 三角轴维度 x / y / z
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

  // 交互
  it('guide_roundtrip', () => {
    const guide = { type: 'axis', dimension: 'y', ticks: { count: 4 }, grid: true, tickLabels: { format: '.1f' }, id: 'yA' };
    expect(GuideSchema.parse(JSON.parse(JSON.stringify(guide)))).toEqual(guide);
  });

  it('axis_title_accepts_text_block_and_style', () => {
    const guide = {
      type: 'axis',
      dimension: 'x',
      title: { text: ['Revenue', { text: 'USD', fill: '#666' }], font: { size: 12 }, textColor: '#111' },
      tickLabels: { format: '$.2f', rotate: -30, align: 'right' },
      line: { stroke: '#333', dashPattern: [4, 2], dashOffset: 1.5 },
      ticks: { values: [0, 10], length: 6 },
    };
    expect(AxisGuideSchema.parse(guide)).toEqual(guide);
  });

  it('axis_line_dash_offset_rejects_non_finite_values', () => {
    expect(() => AxisGuideSchema.parse({ type: 'axis', dimension: 'x', line: { dashOffset: Number.NaN } })).toThrow();
    expect(() => AxisGuideSchema.parse({ type: 'axis', dimension: 'x', line: { dashOffset: Number.POSITIVE_INFINITY } })).toThrow();
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
    expect(() => AxisGuideSchema.parse({ type: 'axis', dimension: 'x', ticks: { density: { kind: 'sample' } } })).toThrow();
    expect(() => AxisGuideSchema.parse({ type: 'axis', dimension: 'x', ticks: { interval: { kind: 'number', step: 0 } } })).toThrow();
    expect(() =>
      AxisGuideSchema.parse({ type: 'axis', dimension: 'x', ticks: { mark: { kind: 'line' }, length: 4 } }),
    ).toThrow();
    expect(() =>
      AxisGuideSchema.parse({ type: 'axis', dimension: 'x', ticks: { mark: { kind: 'custom' } } }),
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

describe('LegendGuideSchema (ADR-03 alpha.8)', () => {
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

describe('GuideSchema discriminated union (ADR-03 alpha.8)', () => {
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
