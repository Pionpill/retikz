import { describe, expect, it } from 'vitest';

import { IntervalBoundsSchema, MarkOperationSchema, MarkSchema } from '../../src/schemas/mark';

const gradientPaint = {
  kind: 'linearGradient',
  angle: 90,
  stops: [
    { offset: 0, color: '#38bdf8' },
    { offset: 1, color: '#0f172a' },
  ],
};

describe('MarkSchema (contract)', () => {
  // Happy path
  it('mark_point_valid', () => {
    const m = { type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_path_with_order_valid', () => {
    const m = {
      type: 'path',
      id: 'trend',
      order: 'month',
      encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  // 边界
  it('mark_path_omits_order_valid', () => {
    const m = { type: 'path', encoding: { x: { field: 'x' }, y: { field: 'y' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_id_optional_valid', () => {
    const withId = { type: 'point', id: 'p', encoding: { x: { field: 'x' }, y: { field: 'y' } } };
    const noId = { type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } };
    expect(MarkSchema.parse(withId)).toEqual(withId);
    expect(MarkSchema.parse(noId)).toEqual(noId);
  });

  it('mark_default_color_group_is_json_safe_and_non_blank', () => {
    const mark = {
      type: 'point',
      defaultColorGroup: 'observations',
      encoding: { x: { field: 'x' }, y: { field: 'y' } },
    };

    expect(MarkOperationSchema.parse(JSON.parse(JSON.stringify(mark)))).toEqual(mark);
    expect(() =>
      MarkOperationSchema.parse({
        ...mark,
        defaultColorGroup: '   ',
      }),
    ).toThrow();
  });

  it('custom_mark_accepts_default_color_group', () => {
    const mark = { type: 'custom-symbol', defaultColorGroup: 'observations', value: 1 };

    expect(MarkOperationSchema.parse(mark)).toEqual(mark);
  });

  // 错误路径
  it('mark_accepts_layer_zindex', () => {
    const mark = {
      type: 'point',
      layer: { zIndex: 120 },
      encoding: { x: { field: 'x' }, y: { field: 'y' } },
    };

    expect(MarkOperationSchema.parse(mark)).toEqual(mark);
  });

  it('mark_layer_rejects_fractional_zindex_and_unknown_fields', () => {
    expect(() =>
      MarkOperationSchema.parse({
        type: 'point',
        layer: { zIndex: 1.5 },
        encoding: { x: { field: 'x' }, y: { field: 'y' } },
      }),
    ).toThrow();
    expect(() =>
      MarkOperationSchema.parse({
        type: 'point',
        layer: { zIndex: 1, order: 2 },
        encoding: { x: { field: 'x' }, y: { field: 'y' } },
      }),
    ).toThrow();
  });

  it('mark_unknown_type_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'bar', encoding: {} })).toThrow();
  });

  it('mark_missing_type_rejected', () => {
    expect(() => MarkSchema.parse({ encoding: {} })).toThrow();
  });

  // 交互：两 mark 各自 encoding 互不依赖
  it('marks_distinct_encoding_valid', () => {
    const path = { type: 'path', encoding: { x: { field: 'a' }, y: { field: 'b' } } };
    const point = { type: 'point', encoding: { x: { field: 'c' }, y: { value: 0 } } };
    expect(MarkSchema.parse(path)).toEqual(path);
    expect(MarkSchema.parse(point)).toEqual(point);
  });

  // contract：interval(bar)
  it('mark_interval_valid', () => {
    const m = { type: 'interval', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_with_id_valid', () => {
    const m = { type: 'interval', id: 'bars', encoding: { x: { field: 'm' }, y: { field: 'r' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_missing_encoding_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'interval' })).toThrow();
  });

  // contract：relation（series / bounds）
  it('mark_interval_series_dodge_valid', () => {
    const m = {
      type: 'interval',
      series: 'product',
      bounds: { x: { kind: 'band', group: 'product' } },
      encoding: { x: { field: 'm' }, y: { field: 'r' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_stack_valid', () => {
    const m = {
      type: 'interval',
      series: 'product',
      bounds: { y: { kind: 'extent', from: 'lo', to: 'hi' } },
      encoding: { x: { field: 'm' }, y: { field: 'r' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_bounds_bad_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        bounds: { x: { kind: 'pile' } },
        encoding: { x: { field: 'm' }, y: { field: 'r' } },
      }),
    ).toThrow();
  });

  it('mark_interval_bounds_whitespace_role_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        bounds: { '   ': { kind: 'full' } },
        encoding: { color: { field: 'group' } },
      }),
    ).toThrow();
  });

  it('mark_interval_bounds_strip_unknown_nested_fields_after_role_key_validation', () => {
    const parsed = IntervalBoundsSchema.parse({ custom: { kind: 'full', extra: true } });

    expect(parsed).toEqual({ custom: { kind: 'full' } });
  });

  // contract：histogram 连续 x 区间柱（extent bound）
  it('mark_interval_extent_histogram_valid', () => {
    const m = {
      type: 'interval',
      bounds: { x: { kind: 'extent', from: 'binStart', to: 'binEnd' } },
      encoding: { x: { field: 'binStart' }, y: { field: 'binCount' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_extent_empty_from_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        bounds: { x: { kind: 'extent', from: '', to: 'binEnd' } },
        encoding: { x: { field: 'm' }, y: { field: 'r' } },
      }),
    ).toThrow();
  });

  it('mark_path_series_valid', () => {
    const m = { type: 'path', series: 'city', order: 't', encoding: { x: { field: 't' }, y: { field: 'v' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  // contract：sector(pie / donut) → interval (extent×full)
  it('mark_sector_valid', () => {
    const m = {
      type: 'interval',
      bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } },
      encoding: { color: { field: 'label' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_sector_custom_bound_fields_valid', () => {
    const m = {
      type: 'interval',
      bounds: { x: { kind: 'extent', from: 'lo', to: 'hi' }, y: { kind: 'full' } },
      encoding: { color: { field: 'label' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_sector_with_id_valid', () => {
    const m = {
      type: 'interval',
      id: 'pie',
      bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } },
      encoding: { color: { field: 'label' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_sector_union_discriminates', () => {
    const parsed = MarkSchema.parse({
      type: 'interval',
      bounds: { x: { kind: 'extent', from: 'lo', to: 'hi' }, y: { kind: 'full' } },
      encoding: { color: { value: '#333' } },
    });
    expect(parsed.type).toBe('interval');
    expect((parsed as { bounds?: { x?: { from?: string } } }).bounds?.x?.from).toBe('lo');
  });

  it('mark_sector_json_round_trip', () => {
    const m = {
      type: 'interval',
      bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } },
      encoding: { color: { field: 'label' } },
    };
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });

  it('mark_sector_pull_constant_valid', () => {
    const m = {
      type: 'interval',
      bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } },
      pull: { kind: 'constant', value: 12 },
      encoding: { color: { field: 'label' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_sector_pull_field_json_round_trip', () => {
    const m = {
      type: 'interval',
      bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } },
      pull: { kind: 'field', value: 'offset' },
      encoding: { color: { field: 'label' } },
    };
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });

  it('mark_sector_pull_negative_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } },
        pull: { kind: 'constant', value: -1 },
        encoding: { color: { field: 'label' } },
      }),
    ).toThrow();
  });

  it('mark_sector_missing_encoding_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } },
      }),
    ).toThrow();
  });

  it('mark_sector_typo_type_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'sektor', encoding: { color: { field: 'label' } } })).toThrow();
  });

  it('mark_sector_empty_start_field_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        bounds: { x: { kind: 'extent', from: '', to: 'y1' }, y: { kind: 'full' } },
        encoding: { color: { field: 'label' } },
      }),
    ).toThrow();
  });

  // 错误路径：baseline 必须有限（.finite 防 Infinity 破坏 JSON round-trip）

  // contract：path 加 closed（雷达多边形）
  it('mark_path_closed_valid', () => {
    const m = { type: 'path', closed: true, encoding: { x: { field: 'dim' }, y: { field: 'value' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_path_closed_omitted_valid', () => {
    const m = { type: 'path', encoding: { x: { field: 'x' }, y: { field: 'y' } } };
    const parsed = MarkSchema.parse(m);
    expect(parsed).not.toHaveProperty('closed');
  });

  it('mark_path_closed_bad_type_rejected', () => {
    expect(() =>
      MarkSchema.parse({ type: 'path', closed: 'yes', encoding: { x: { field: 'x' }, y: { field: 'y' } } }),
    ).toThrow();
  });

  it('mark_path_closed_json_round_trip', () => {
    const m = { type: 'path', order: 'dim', closed: true, encoding: { x: { field: 'dim' }, y: { field: 'value' } } };
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });

  it('mark_path_connect_nulls_valid', () => {
    const m = { type: 'path', connectNulls: true, encoding: { x: { field: 'x' }, y: { field: 'y' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_path_closure_cycle_valid', () => {
    const m = { type: 'path', closure: { kind: 'cycle' }, encoding: { x: { field: 'dim' }, y: { field: 'value' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_path_closure_baseline_valid', () => {
    const m = {
      type: 'path',
      closure: { kind: 'baseline', baseline: 5 },
      encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_path_closure_stack_valid', () => {
    const m = {
      type: 'path',
      closure: { kind: 'stack', baselineField: 'y0' },
      encoding: { x: { field: 'month' }, y: { field: 'y1' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_path_closure_stack_empty_baseline_field_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'path',
        closure: { kind: 'stack', baselineField: '' },
        encoding: { x: { field: 'month' }, y: { field: 'y1' } },
      }),
    ).toThrow();
  });

  it('mark_path_closure_baseline_nan_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'path',
        closure: { kind: 'baseline', baseline: Number.NaN },
        encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
      }),
    ).toThrow();
  });

  // contract：size 通道仅 PointMark
  it('mark_point_with_size_field_valid', () => {
    const m = {
      type: 'point',
      size: { kind: 'field', value: 'pop' },
      encoding: { x: { field: 'lng' }, y: { field: 'lat' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_point_with_size_value_valid', () => {
    const m = {
      type: 'point',
      size: { kind: 'constant', value: 6 },
      encoding: { x: { field: 'x' }, y: { field: 'y' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_preserves_unknown_role_key_size', () => {
    // 未知 encoding key 在 schema 层保留；是否是合法位置角色交给 active CoordinateDefinition.roles 在 lowering 校验
    const parsed = MarkSchema.parse({
      type: 'interval',
      encoding: { x: { field: 'c' }, y: { field: 'v' }, size: { field: 'p' } },
    });
    expect((parsed.encoding as { size?: unknown }).size).toEqual({ field: 'p' });
  });

  // contract：opacity 通道仅 PointMark
  it('mark_point_with_opacity_valid', () => {
    const m = {
      type: 'point',
      opacity: { kind: 'field', value: 'd' },
      encoding: { x: { field: 'x' }, y: { field: 'y' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_preserves_unknown_role_key_opacity', () => {
    const parsed = MarkSchema.parse({
      type: 'interval',
      encoding: { x: { field: 'c' }, y: { field: 'v' }, opacity: { field: 'd' } },
    });
    expect((parsed.encoding as { opacity?: unknown }).opacity).toEqual({ field: 'd' });
  });

  // contract：shape 通道仅 PointMark
  it('mark_point_with_shape_valid', () => {
    const m = {
      type: 'point',
      shape: { kind: 'field', value: 'cat' },
      encoding: { x: { field: 'x' }, y: { field: 'y' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_point_with_constant_node_style_valid', () => {
    const m = {
      type: 'point',
      fill: { kind: 'constant', value: '#f8fafc' },
      stroke: { kind: 'constant', value: '#0f172a' },
      strokeWidth: { kind: 'constant', value: 1.5 },
      fillOpacity: { kind: 'constant', value: 0.7 },
      strokeOpacity: { kind: 'constant', value: 0.9 },
      opacity: { kind: 'constant', value: 0.8 },
      rotate: { kind: 'constant', value: 45 },
      padding: { kind: 'constant', value: 2 },
      minimumSize: { kind: 'constant', value: { default: 14, width: 16, height: 12 } },
      scale: { kind: 'constant', value: { default: 1, x: 1.2 } },
      zIndex: { kind: 'constant', value: 3 },
      encoding: { x: { field: 'x' }, y: { field: 'y' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_point_with_stroke_channels_valid', () => {
    const m = {
      type: 'point',
      encoding: {
        x: { field: 'x' },
        y: { field: 'y' },
      },
      stroke: { kind: 'field', value: 'region' },
      strokeWidth: { kind: 'field', value: 'density' },
      opacity: { kind: 'field', value: 'density' },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_point_accepts_paint_fill_and_stroke', () => {
    const m = {
      type: 'point',
      fill: { kind: 'constant', value: gradientPaint },
      stroke: { kind: 'constant', value: gradientPaint },
      encoding: { x: { field: 'x' }, y: { field: 'y' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_with_node_style_channels_valid', () => {
    const m = {
      type: 'interval',
      strokeWidth: { kind: 'field', value: 'density' },
      opacity: { kind: 'constant', value: 0.8 },
      fillOpacity: { kind: 'field', value: 'fillAlpha' },
      encoding: { x: { field: 'c' }, y: { field: 'v' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_preserves_unknown_role_key_shape', () => {
    const parsed = MarkSchema.parse({
      type: 'interval',
      encoding: { x: { field: 'c' }, y: { field: 'v' }, shape: { field: 'cat' } },
    });
    expect((parsed.encoding as { shape?: unknown }).shape).toEqual({ field: 'cat' });
  });

  // contract：rect(heatmap) → interval (band×band)
  it('mark_rect_with_color_valid', () => {
    const m = {
      type: 'interval',
      bounds: { x: { kind: 'band' }, y: { kind: 'band' } },
      encoding: { x: { field: 'rowKey' }, y: { field: 'colKey' }, color: { field: 'value', scale: 'heat' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_rect_without_color_valid', () => {
    // 缺 color → 纯网格（值映射可选）；x / y 必填性 + band 约束下放 lowering，schema 仅解析通过
    const m = {
      type: 'interval',
      bounds: { x: { kind: 'band' }, y: { kind: 'band' } },
      encoding: { x: { field: 'day' }, y: { field: 'hour' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_rect_with_id_valid', () => {
    const m = {
      type: 'interval',
      id: 'heat',
      bounds: { x: { kind: 'band' }, y: { kind: 'band' } },
      encoding: { x: { field: 'r' }, y: { field: 'c' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_rect_missing_encoding_rejected', () => {
    expect(() =>
      MarkSchema.parse({ type: 'interval', bounds: { x: { kind: 'band' }, y: { kind: 'band' } } }),
    ).toThrow();
  });

  it('mark_rect_typo_type_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'rekt', encoding: { x: { field: 'r' }, y: { field: 'c' } } })).toThrow();
  });

  it('mark_rect_union_discriminates', () => {
    const parsed = MarkSchema.parse({
      type: 'interval',
      bounds: { x: { kind: 'band' }, y: { kind: 'band' } },
      encoding: { x: { field: 'r' }, y: { field: 'c' } },
    });
    expect(parsed.type).toBe('interval');
  });

  it('mark_rect_preserves_unknown_role_key_size', () => {
    // 未知 encoding key 在 schema 层保留；lowering 按坐标系 roles fail-loud
    const parsed = MarkSchema.parse({
      type: 'interval',
      bounds: { x: { kind: 'band' }, y: { kind: 'band' } },
      encoding: { x: { field: 'r' }, y: { field: 'c' }, size: { field: 'p' } },
    });
    expect((parsed.encoding as { size?: unknown }).size).toEqual({ field: 'p' });
  });

  it('mark_rect_json_round_trip', () => {
    const m = {
      type: 'interval',
      id: 'heat',
      bounds: { x: { kind: 'band' }, y: { kind: 'band' } },
      encoding: { x: { field: 'r' }, y: { field: 'c' }, color: { field: 'v', scale: 'heat' } },
    };
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });

  // contract：reference(参考线 / 阈值带) mark
  it('mark_reference_horizontal_constant_valid', () => {
    const m = { type: 'reference', encoding: { y: { value: 80 }, color: { value: 'crimson' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_reference_vertical_field_valid', () => {
    const m = { type: 'reference', encoding: { x: { field: 'date' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_reference_per_datum_field_color_valid', () => {
    const m = { type: 'reference', encoding: { y: { field: 'threshold' }, color: { field: 'category', scale: 'c' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_reference_extent_pair_valid', () => {
    const m = { type: 'reference', extentField: 'rowLo', extentToField: 'rowHi', encoding: { x: { field: 'date' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_reference_band_constant_yTo_valid', () => {
    const m = { type: 'reference', yTo: 90, encoding: { y: { value: 70 }, color: { value: 'amber' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_reference_band_field_yTo_valid', () => {
    const m = { type: 'reference', yTo: 'hi', encoding: { y: { field: 'lo' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_reference_band_xTo_valid', () => {
    const m = { type: 'reference', xTo: 5, encoding: { x: { value: 2 } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_reference_region_valid', () => {
    const m = { type: 'reference', kind: 'region', xTo: 5, yTo: 90, encoding: { x: { value: 2 }, y: { value: 70 } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_reference_minimal_omits_optionals', () => {
    // xTo / yTo / extent 省略：schema 不写入默认值，仅解析通过（line 形态由 lowering 判别）
    const m = { type: 'reference', encoding: { y: { value: 50 } } };
    const parsed = MarkSchema.parse(m);
    expect(parsed).not.toHaveProperty('kind');
    expect(parsed).not.toHaveProperty('yTo');
    expect(parsed).not.toHaveProperty('xTo');
    expect(parsed).not.toHaveProperty('extentField');
  });

  it('mark_reference_with_id_valid', () => {
    const m = { type: 'reference', id: 'avg', encoding: { y: { value: 80 } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_reference_union_discriminates', () => {
    const parsed = MarkSchema.parse({ type: 'reference', yTo: 90, encoding: { y: { value: 70 } } });
    expect(parsed.type).toBe('reference');
    expect((parsed as { yTo?: number }).yTo).toBe(90);
  });

  it('mark_reference_empty_extent_field_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'reference', extentField: '', encoding: { x: { value: 5 } } })).toThrow();
  });

  it.each(['', '   '])('mark_reference_blank_string_yTo_%j_rejected', yTo => {
    expect(() => MarkSchema.parse({ type: 'reference', yTo, encoding: { y: { value: 70 } } })).toThrow();
  });

  it('mark_reference_unknown_kind_rejected', () => {
    expect(() =>
      MarkSchema.parse({ type: 'reference', kind: 'band', yTo: 90, encoding: { y: { value: 70 } } }),
    ).toThrow();
  });

  it('mark_reference_typo_type_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'rul', encoding: { y: { value: 80 } } })).toThrow();
  });

  it('mark_reference_preserves_unknown_role_key_size', () => {
    // 未知 encoding key 在 schema 层保留；lowering 按坐标系 roles fail-loud
    const parsed = MarkSchema.parse({ type: 'reference', encoding: { y: { value: 80 }, size: { field: 'p' } } });
    expect((parsed.encoding as { size?: unknown }).size).toEqual({ field: 'p' });
  });

  it('mark_reference_json_round_trip', () => {
    const m = {
      type: 'reference',
      id: 'tol',
      kind: 'region',
      xTo: 'x1',
      yTo: 'hi',
      encoding: { x: { field: 'x0' }, y: { field: 'lo' }, color: { field: 'cat', scale: 'c' } },
    };
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });

  // contract：text → point (encoding.text) + 位置 mark label
  it('mark_text_union_discriminates', () => {
    const parsed = MarkSchema.parse({
      type: 'point',
      encoding: { x: { field: 'px' }, y: { field: 'py' }, text: { field: 'label' } },
    });
    expect(parsed.type).toBe('point');
  });

  it('mark_text_dx_dy_valid', () => {
    const m = {
      type: 'point',
      dx: 4,
      dy: -8,
      encoding: { x: { field: 'px' }, y: { field: 'py' }, text: { value: 'lbl' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_text_channel_both_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'point',
        encoding: { x: { field: 'px' }, y: { field: 'py' }, text: { field: 'a', value: 'b' } },
      }),
    ).toThrow();
  });

  it('mark_text_typo_type_rejected', () => {
    expect(() =>
      MarkSchema.parse({ type: 'txt', encoding: { x: { field: 'px' }, y: { field: 'py' }, text: { field: 'a' } } }),
    ).toThrow();
  });

  it('mark_text_json_round_trip', () => {
    const m = {
      type: 'point',
      id: 't',
      dx: 2,
      dy: 3,
      color: { kind: 'constant', value: '#333' },
      encoding: { x: { field: 'px' }, y: { field: 'py' }, text: { field: 'label', displayFormat: ',.0f' } },
    };
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });

  it('mark_interval_label_valid', () => {
    const m = {
      type: 'interval',
      label: { content: { field: 'revenue', displayFormat: ',.0f' }, position: 'top', distance: 6, pin: true },
      encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_path_host_geometry_label_valid', () => {
    const m = {
      type: 'path',
      label: { content: { value: 'trend' }, position: 'midway', side: 'top', sloped: true },
      encoding: { x: { field: 'x' }, y: { field: 'y' } },
    };
    expect(MarkSchema.parse(m)).toEqual({
      ...m,
      label: { ...m.label, side: 'top' },
    });
  });

  it('mark_label_core_style_fields_valid', () => {
    const m = {
      type: 'interval',
      label: {
        content: { field: 'revenue' },
        textColor: '#334155',
        opacity: 0.75,
        font: { family: 'serif', size: 12, weight: 'bold', style: 'italic' },
        rotate: 'tangent',
        keepUpright: true,
        pin: { stroke: '#64748b', strokeWidth: 1.5, dashPattern: [2, 2] },
      },
      encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_path_with_core_path_style_channels_valid', () => {
    const m = {
      type: 'path',
      strokeWidth: { kind: 'field', value: 'weight' },
      opacity: { kind: 'constant', value: 0.9 },
      lineCap: { kind: 'constant', value: 'round' },
      lineJoin: { kind: 'constant', value: 'bevel' },
      roundedCorners: { kind: 'field', value: 'corner' },
      encoding: { x: { field: 'x' }, y: { field: 'y' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_path_accepts_paint_fill_and_stroke', () => {
    const m = {
      type: 'path',
      fill: { kind: 'constant', value: gradientPaint },
      stroke: { kind: 'constant', value: gradientPaint },
      encoding: { x: { field: 'x' }, y: { field: 'y' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_accepts_paint_fill_and_stroke', () => {
    const m = {
      type: 'interval',
      fill: { kind: 'constant', value: gradientPaint },
      stroke: { kind: 'constant', value: gradientPaint },
      encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_reference_accepts_paint_fill_and_stroke', () => {
    const m = {
      type: 'reference',
      fill: { kind: 'constant', value: gradientPaint },
      stroke: { kind: 'constant', value: gradientPaint },
      encoding: { y: { value: 80 } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_style_colors_reject_whitespace_only_strings', () => {
    expect(
      MarkSchema.safeParse({
        type: 'point',
        color: { kind: 'constant', value: '   ' },
        encoding: { x: { field: 'x' }, y: { field: 'y' } },
      }).success,
    ).toBe(false);
    expect(
      MarkSchema.safeParse({
        type: 'path',
        fill: { kind: 'constant', value: '   ' },
        encoding: { x: { field: 'x' }, y: { field: 'y' } },
      }).success,
    ).toBe(false);
    expect(
      MarkSchema.safeParse({
        type: 'interval',
        label: { content: { value: 'label' }, pin: { stroke: '   ' } },
        encoding: { x: { field: 'x' }, y: { field: 'y' } },
      }).success,
    ).toBe(false);
  });

  it('mark_point_label_numeric_position_valid', () => {
    const m = {
      type: 'point',
      label: { content: { value: 'x' }, position: 30 },
      encoding: { x: { field: 'px' }, y: { field: 'py' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_label_content_neither_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        label: { content: {} },
        encoding: { x: { field: 'm' }, y: { field: 'r' } },
      }),
    ).toThrow();
  });

  it('mark_path_rejects_node_only_label_pin', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'path',
        label: { content: { value: 'trend' }, pin: true },
        encoding: { x: { field: 'x' }, y: { field: 'y' } },
      }),
    ).toThrow();
  });

  it('mark_reference_line_label_valid', () => {
    const m = {
      type: 'reference',
      label: { content: { value: 'target' }, position: 'near-end', side: 'top' },
      encoding: { y: { value: 80 } },
    };
    expect(MarkSchema.parse(m)).toEqual({
      ...m,
      label: { ...m.label, side: 'top' },
    });
  });

  it('mark_reference_band_rejects_geometry_only_side', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'reference',
        label: { content: { value: 'band' }, side: 'top' },
        yTo: 90,
        encoding: { y: { value: 80 } },
      }),
    ).toThrow();
  });

  it('mark_relation_label_valid_and_json_round_trip', () => {
    const m = {
      type: 'relation',
      source: { id: 'A' },
      target: { id: 'B' },
      label: { content: { field: 'label' }, position: 0.5, placement: 'inside' },
    };
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });

  it('mark_relation_accepts_projected_endpoint_glyphs', () => {
    const mark = {
      type: 'relation',
      source: { project: { x: 'start', y: 'category' } },
      target: { project: { x: 'end', y: 'category' } },
      endpoints: {
        source: { shape: { kind: 'constant', value: 'circle' }, size: { kind: 'constant', value: 5 } },
        target: { shape: { kind: 'constant', value: 'diamond' }, size: { kind: 'constant', value: 6 } },
      },
    };

    expect(MarkSchema.parse(JSON.parse(JSON.stringify(mark)))).toEqual(mark);
  });

  it('mark_relation_rejects_endpoint_glyphs_outside_plain_projected_paths', () => {
    const endpoints = { source: {}, target: {} };
    expect(() => MarkSchema.parse({ type: 'relation', source: { id: 'A' }, target: { id: 'B' }, endpoints })).toThrow(
      /projected/,
    );
    expect(() =>
      MarkSchema.parse({
        type: 'relation',
        kind: 'ribbon',
        source: { project: { x: 'start', y: 'category' } },
        target: { project: { x: 'end', y: 'category' } },
        endpoints,
        ribbon: { width: { kind: 'constant', value: 8 } },
      }),
    ).toThrow(/path relation/);
    expect(() =>
      MarkSchema.parse({
        type: 'relation',
        source: { project: { x: 'start', y: 'category' } },
        target: { project: { x: 'end', y: 'category' } },
        endpoints,
        path: { via: [{ project: { x: 'middle', y: 'category' } }] },
      }),
    ).toThrow(/via or route/);
    expect(() =>
      MarkSchema.parse({
        type: 'relation',
        source: { project: { x: 'start', y: 'category' } },
        target: { project: { x: 'end', y: 'category' } },
        endpoints: { source: { zIndex: { kind: 'constant', value: 2 } } },
      }),
    ).toThrow();
  });

  it('mark_relation_explicit_route_accepts_three_leg_core_fold', () => {
    const mark = {
      type: 'relation',
      source: { id: 'A' },
      target: { id: 'B' },
      path: { route: [{ kind: 'fold', via: '-|-' }] },
    };

    expect(MarkSchema.parse(mark)).toEqual(mark);
  });

  it('mark_relation_algorithmic_orthogonal_routing_rejects_three_leg_fold', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'relation',
        source: { id: 'A' },
        target: { id: 'B' },
        path: { routing: { kind: 'orthogonal', via: '-|-' } },
      }),
    ).toThrow();
  });

  it('mark_point_accepts_local_transform', () => {
    const m = {
      type: 'point',
      transform: [{ kind: 'sort', field: 'score', order: 'descending' }],
      encoding: { x: { field: 'x' }, y: { field: 'score' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_path_accepts_local_transform', () => {
    const m = {
      type: 'path',
      transform: [{ kind: 'summarize', groupBy: ['series'], metrics: [{ kind: 'sum', field: 'value', as: 'total' }] }],
      order: 'series',
      encoding: { x: { field: 'series' }, y: { field: 'total' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_reference_accepts_local_transform', () => {
    const m = {
      type: 'reference',
      transform: [{ kind: 'derive-interval', startFrom: 'low', endFrom: 'high' }],
      encoding: { y: { field: 'intervalEnd' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('custom_mark_accepts_local_transform', () => {
    const m = {
      type: 'dot',
      transform: [{ kind: 'top-n', field: 'score', n: 3 }],
      encoding: { x: { field: 'x' }, y: { field: 'score' } },
    };
    expect(MarkOperationSchema.parse(m)).toEqual(m);
  });
});

describe('Polar interpolation mark contract', () => {
  it.each(['polar', 'chord'] as const)('round-trips interpolation=%s for supported marks', interpolation => {
    const marks = [
      {
        type: 'path',
        interpolation,
        encoding: { x: { field: 'angle' }, y: { field: 'radius' } },
      },
      {
        type: 'interval',
        interpolation,
        encoding: { x: { field: 'angle' }, y: { field: 'radius' } },
      },
      {
        type: 'reference',
        interpolation,
        yTo: 2,
        encoding: { y: { value: 1 } },
      },
      {
        type: 'relation',
        source: { project: { x: 'sourceAngle', y: 'sourceRadius' } },
        target: { project: { x: 'targetAngle', y: 'targetRadius' } },
        path: { interpolation },
      },
    ];

    for (const mark of marks) {
      expect(MarkSchema.parse(JSON.parse(JSON.stringify(mark)))).toEqual(mark);
    }
  });

  it.each(['path', 'interval', 'reference'] as const)('rejects unknown %s interpolation', type => {
    const encoding = type === 'reference' ? { y: { value: 1 } } : { x: { field: 'x' }, y: { field: 'y' } };

    expect(() => MarkSchema.parse({ type, interpolation: 'spline', encoding })).toThrow();
  });

  it('rejects unknown relation path interpolation', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'relation',
        source: { id: 'A' },
        target: { id: 'B' },
        path: { interpolation: 'spline' },
      }),
    ).toThrow();
  });
});
