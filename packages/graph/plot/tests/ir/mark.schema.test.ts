import { describe, expect, it } from 'vitest';
import { MarkSchema } from '../../src/schemas/mark';

const gradientPaint = {
  kind: 'linearGradient',
  angle: 90,
  stops: [
    { offset: 0, color: '#38bdf8' },
    { offset: 1, color: '#0f172a' },
  ],
};

describe('MarkSchema (ADR-05)', () => {
  // Happy path
  it('mark_point_valid', () => {
    const m = { type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_path_with_order_valid', () => {
    const m = { type: 'path', id: 'trend', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } };
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

  // 错误路径
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

  // ADR-02：interval(bar)
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

  // ADR-05：relation（series / bounds）
  it('mark_interval_series_dodge_valid', () => {
    const m = { type: 'interval', series: 'product', bounds: { x: { kind: 'band', group: 'product' } }, encoding: { x: { field: 'm' }, y: { field: 'r' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_stack_valid', () => {
    const m = { type: 'interval', series: 'product', bounds: { y: { kind: 'extent', from: 'lo', to: 'hi' } }, encoding: { x: { field: 'm' }, y: { field: 'r' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_bounds_bad_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'interval', bounds: { x: { kind: 'pile' } }, encoding: { x: { field: 'm' }, y: { field: 'r' } } })).toThrow();
  });

  // alpha.12 ADR-01：histogram 连续 x 区间柱（extent bound）
  it('mark_interval_extent_histogram_valid', () => {
    const m = { type: 'interval', bounds: { x: { kind: 'extent', from: 'binStart', to: 'binEnd' } }, encoding: { x: { field: 'binStart' }, y: { field: 'binValue' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_extent_empty_from_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'interval', bounds: { x: { kind: 'extent', from: '', to: 'binEnd' } }, encoding: { x: { field: 'm' }, y: { field: 'r' } } })).toThrow();
  });

  it('mark_path_series_valid', () => {
    const m = { type: 'path', series: 'city', order: 't', encoding: { x: { field: 't' }, y: { field: 'v' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  // ADR-02：sector(pie / donut) → interval (extent×full)
  it('mark_sector_valid', () => {
    const m = { type: 'interval', bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } }, encoding: { color: { field: 'label' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_sector_custom_bound_fields_valid', () => {
    const m = { type: 'interval', bounds: { x: { kind: 'extent', from: 'lo', to: 'hi' }, y: { kind: 'full' } }, encoding: { color: { field: 'label' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_sector_with_id_valid', () => {
    const m = { type: 'interval', id: 'pie', bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } }, encoding: { color: { field: 'label' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_sector_union_discriminates', () => {
    const parsed = MarkSchema.parse({ type: 'interval', bounds: { x: { kind: 'extent', from: 'lo', to: 'hi' }, y: { kind: 'full' } }, encoding: { color: { value: '#333' } } });
    expect(parsed.type).toBe('interval');
    expect((parsed as { bounds?: { x?: { from?: string } } }).bounds?.x?.from).toBe('lo');
  });

  it('mark_sector_json_round_trip', () => {
    const m = { type: 'interval', bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } }, encoding: { color: { field: 'label' } } };
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });

  it('mark_sector_missing_encoding_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'interval', bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } } })).toThrow();
  });

  it('mark_sector_typo_type_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'sektor', encoding: { color: { field: 'label' } } })).toThrow();
  });

  it('mark_sector_empty_start_field_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'interval', bounds: { x: { kind: 'extent', from: '', to: 'y1' }, y: { kind: 'full' } }, encoding: { color: { field: 'label' } } })).toThrow();
  });





  // 错误路径：baseline 必须有限（.finite 防 Infinity 破坏 JSON round-trip）




  // ADR-03：path 加 closed（雷达多边形）
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
    expect(() => MarkSchema.parse({ type: 'path', closed: 'yes', encoding: { x: { field: 'x' }, y: { field: 'y' } } })).toThrow();
  });

  it('mark_path_closed_json_round_trip', () => {
    const m = { type: 'path', order: 'dim', closed: true, encoding: { x: { field: 'dim' }, y: { field: 'value' } } };
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });

  it('mark_path_closure_cycle_valid', () => {
    const m = { type: 'path', closure: { kind: 'cycle' }, encoding: { x: { field: 'dim' }, y: { field: 'value' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_path_closure_baseline_valid', () => {
    const m = { type: 'path', closure: { kind: 'baseline', baseline: 5 }, encoding: { x: { field: 'month' }, y: { field: 'revenue' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_path_closure_stack_valid', () => {
    const m = { type: 'path', closure: { kind: 'stack', baselineField: 'y0' }, encoding: { x: { field: 'month' }, y: { field: 'y1' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_path_closure_stack_empty_baseline_field_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'path', closure: { kind: 'stack', baselineField: '' }, encoding: { x: { field: 'month' }, y: { field: 'y1' } } })).toThrow();
  });

  it('mark_path_closure_baseline_nan_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'path', closure: { kind: 'baseline', baseline: Number.NaN }, encoding: { x: { field: 'month' }, y: { field: 'revenue' } } })).toThrow();
  });

  // alpha.7 ADR-02：size 通道仅 PointMark
  it('mark_point_with_size_field_valid', () => {
    const m = { type: 'point', size: { kind: 'field', value: 'pop' }, encoding: { x: { field: 'lng' }, y: { field: 'lat' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_point_with_size_value_valid', () => {
    const m = { type: 'point', size: { kind: 'constant', value: 6 }, encoding: { x: { field: 'x' }, y: { field: 'y' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_preserves_unknown_role_key_size', () => {
    // 未知 encoding key 在 schema 层保留；是否是合法位置角色交给 active CoordinateDefinition.roles 在 lowering 校验。
    const parsed = MarkSchema.parse({ type: 'interval', encoding: { x: { field: 'c' }, y: { field: 'v' }, size: { field: 'p' } } });
    expect((parsed.encoding as { size?: unknown }).size).toEqual({ field: 'p' });
  });

  // alpha.7 ADR-04：opacity 通道仅 PointMark
  it('mark_point_with_opacity_valid', () => {
    const m = { type: 'point', opacity: { kind: 'field', value: 'd' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_preserves_unknown_role_key_opacity', () => {
    const parsed = MarkSchema.parse({ type: 'interval', encoding: { x: { field: 'c' }, y: { field: 'v' }, opacity: { field: 'd' } } });
    expect((parsed.encoding as { opacity?: unknown }).opacity).toEqual({ field: 'd' });
  });

  // alpha.7 ADR-05：shape 通道仅 PointMark
  it('mark_point_with_shape_valid', () => {
    const m = { type: 'point', shape: { kind: 'field', value: 'cat' }, encoding: { x: { field: 'x' }, y: { field: 'y' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_point_with_constant_node_style_valid', () => {
    const m = {
      type: 'point',
      fill: { kind: 'constant', value: '#f8fafc' },
      stroke: { kind: 'constant', value: '#0f172a' },
      strokeWidth: { kind: 'constant', value: 1.5 },
      fillOpacity: { kind: 'constant', value: 0.7 },
      drawOpacity: { kind: 'constant', value: 0.9 },
      opacity: { kind: 'constant', value: 0.8 },
      rotate: { kind: 'constant', value: 45 },
      padding: { kind: 'constant', value: 2 },
      minimumSize: { kind: 'constant', value: 14 },
      minimumWidth: { kind: 'constant', value: 16 },
      minimumHeight: { kind: 'constant', value: 12 },
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
    const parsed = MarkSchema.parse({ type: 'interval', encoding: { x: { field: 'c' }, y: { field: 'v' }, shape: { field: 'cat' } } });
    expect((parsed.encoding as { shape?: unknown }).shape).toEqual({ field: 'cat' });
  });

  // alpha.11 ADR-02：rect(heatmap) → interval (band×band)
  it('mark_rect_with_color_valid', () => {
    const m = { type: 'interval', bounds: { x: { kind: 'band' }, y: { kind: 'band' } }, encoding: { x: { field: 'rowKey' }, y: { field: 'colKey' }, color: { field: 'value', scale: 'heat' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_rect_without_color_valid', () => {
    // 缺 color → 纯网格（值映射可选）；x / y 必填性 + band 约束下放 lowering，schema 仅解析通过
    const m = { type: 'interval', bounds: { x: { kind: 'band' }, y: { kind: 'band' } }, encoding: { x: { field: 'day' }, y: { field: 'hour' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_rect_with_id_valid', () => {
    const m = { type: 'interval', id: 'heat', bounds: { x: { kind: 'band' }, y: { kind: 'band' } }, encoding: { x: { field: 'r' }, y: { field: 'c' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_rect_missing_encoding_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'interval', bounds: { x: { kind: 'band' }, y: { kind: 'band' } } })).toThrow();
  });

  it('mark_rect_typo_type_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'rekt', encoding: { x: { field: 'r' }, y: { field: 'c' } } })).toThrow();
  });

  it('mark_rect_union_discriminates', () => {
    const parsed = MarkSchema.parse({ type: 'interval', bounds: { x: { kind: 'band' }, y: { kind: 'band' } }, encoding: { x: { field: 'r' }, y: { field: 'c' } } });
    expect(parsed.type).toBe('interval');
  });

  it('mark_rect_preserves_unknown_role_key_size', () => {
    // 未知 encoding key 在 schema 层保留；lowering 按坐标系 roles fail-loud。
    const parsed = MarkSchema.parse({ type: 'interval', bounds: { x: { kind: 'band' }, y: { kind: 'band' } }, encoding: { x: { field: 'r' }, y: { field: 'c' }, size: { field: 'p' } } });
    expect((parsed.encoding as { size?: unknown }).size).toEqual({ field: 'p' });
  });

  it('mark_rect_json_round_trip', () => {
    const m = { type: 'interval', id: 'heat', bounds: { x: { kind: 'band' }, y: { kind: 'band' } }, encoding: { x: { field: 'r' }, y: { field: 'c' }, color: { field: 'v', scale: 'heat' } } };
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });

  // alpha.11 ADR-03：reference(参考线 / 阈值带) mark
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

  it('mark_reference_minimal_omits_optionals', () => {
    // xTo / yTo / extent 省略：schema 不写入默认值，仅解析通过（line 形态由 lowering 判别）
    const m = { type: 'reference', encoding: { y: { value: 50 } } };
    const parsed = MarkSchema.parse(m);
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

  it('mark_reference_empty_string_yTo_rejected', () => {
    // yTo string 须 min(1)：空串非法
    expect(() => MarkSchema.parse({ type: 'reference', yTo: '', encoding: { y: { value: 70 } } })).toThrow();
  });

  it('mark_reference_typo_type_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'rul', encoding: { y: { value: 80 } } })).toThrow();
  });

  it('mark_reference_preserves_unknown_role_key_size', () => {
    // 未知 encoding key 在 schema 层保留；lowering 按坐标系 roles fail-loud。
    const parsed = MarkSchema.parse({ type: 'reference', encoding: { y: { value: 80 }, size: { field: 'p' } } });
    expect((parsed.encoding as { size?: unknown }).size).toEqual({ field: 'p' });
  });

  it('mark_reference_json_round_trip', () => {
    const m = { type: 'reference', id: 'tol', yTo: 'hi', extentField: 'a', extentToField: 'b', encoding: { y: { field: 'lo' }, color: { field: 'cat', scale: 'c' } } };
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });

  // alpha.11 ADR-04：text → point (encoding.text) + 位置 mark label
  it('mark_text_union_discriminates', () => {
    const parsed = MarkSchema.parse({ type: 'point', encoding: { x: { field: 'px' }, y: { field: 'py' }, text: { field: 'label' } } });
    expect(parsed.type).toBe('point');
  });

  it('mark_text_dx_dy_valid', () => {
    const m = { type: 'point', dx: 4, dy: -8, encoding: { x: { field: 'px' }, y: { field: 'py' }, text: { value: 'lbl' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_text_channel_both_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'point', encoding: { x: { field: 'px' }, y: { field: 'py' }, text: { field: 'a', value: 'b' } } })).toThrow();
  });

  it('mark_text_typo_type_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'txt', encoding: { x: { field: 'px' }, y: { field: 'py' }, text: { field: 'a' } } })).toThrow();
  });

  it('mark_text_json_round_trip', () => {
    const m = { type: 'point', id: 't', dx: 2, dy: 3, color: { kind: 'constant', value: '#333' }, encoding: { x: { field: 'px' }, y: { field: 'py' }, text: { field: 'label', displayFormat: ',.0f' } } };
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });

  it('mark_text_legacy_format_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'point', encoding: { x: { field: 'px' }, y: { field: 'py' }, text: { field: 'label', format: ',.0f' } } })).toThrow();
  });

  it('mark_interval_label_valid', () => {
    const m = { type: 'interval', label: { content: { field: 'revenue', displayFormat: ',.0f' }, position: 'above', distance: 6, pin: true }, encoding: { x: { field: 'month' }, y: { field: 'revenue' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
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

  it('mark_link_accepts_paint_fill_and_stroke', () => {
    const m = {
      type: 'link',
      source: { x: { field: 'sx' }, y: { field: 'sy' } },
      target: { x: { field: 'tx' }, y: { field: 'ty' } },
      value: 'amount',
      fill: { kind: 'constant', value: gradientPaint },
      stroke: { kind: 'constant', value: gradientPaint },
      encoding: {},
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_label_legacy_format_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'interval', label: { content: { field: 'revenue', format: ',.0f' } }, encoding: { x: { field: 'month' }, y: { field: 'revenue' } } })).toThrow();
  });

  it('mark_point_label_numeric_position_valid', () => {
    const m = { type: 'point', label: { content: { value: 'x' }, position: 30 }, encoding: { x: { field: 'px' }, y: { field: 'py' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_label_content_neither_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'interval', label: { content: {} }, encoding: { x: { field: 'm' }, y: { field: 'r' } } })).toThrow();
  });

  it('mark_reference_strips_label', () => {
    const parsed = MarkSchema.parse({ type: 'reference', label: { content: { value: 'x' } }, encoding: { y: { value: 80 } } });
    expect((parsed as { label?: unknown }).label).toBeUndefined();
  });

  // alpha.11 ADR-05：link(sankey / alluvial 流带) mark
  it('mark_link_minimal_valid', () => {
    const m = { type: 'link', source: { x: { field: 'sx' }, y: { field: 'sy' } }, target: { x: { field: 'tx' }, y: { field: 'ty' } }, value: 'amount', encoding: {} };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_link_full_options_valid', () => {
    const m = {
      type: 'link',
      id: 'flow',
      source: { x: { field: 'sx' }, y: { field: 'sy' } },
      target: { x: { field: 'tx' }, y: { field: 'ty' } },
      value: 'amount',
      width: 'w',
      endWidth: 'end',
      curvature: 0.3,
      orientation: 'vertical',
      encoding: { color: { field: 'cat', scale: 'c' } },
    };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_link_orientation_default_undefined', () => {
    // orientation 可选；缺省解析为 undefined（lowering 兜底 horizontal）
    const parsed = MarkSchema.parse({ type: 'link', source: { x: { field: 'sx' }, y: { field: 'sy' } }, target: { x: { field: 'tx' }, y: { field: 'ty' } }, value: 'amount', encoding: {} });
    expect((parsed as { orientation?: string }).orientation).toBeUndefined();
  });

  it('mark_link_orientation_invalid_rejected', () => {
    expect(() =>
      MarkSchema.parse({ type: 'link', source: { x: { field: 'sx' }, y: { field: 'sy' } }, target: { x: { field: 'tx' }, y: { field: 'ty' } }, value: 'amount', orientation: 'diagonal', encoding: {} }),
    ).toThrow();
  });

  it('mark_link_union_discriminates', () => {
    const parsed = MarkSchema.parse({ type: 'link', source: { x: { field: 'sx' }, y: { field: 'sy' } }, target: { x: { field: 'tx' }, y: { field: 'ty' } }, value: 'amount', endWidth: 'e', encoding: {} });
    expect(parsed.type).toBe('link');
    expect((parsed as { endWidth?: string }).endWidth).toBe('e');
  });

  it('mark_link_endpoint_missing_y_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'link', source: { x: { field: 'sx' } }, target: { x: { field: 'tx' }, y: { field: 'ty' } }, value: 'amount', encoding: {} })).toThrow();
  });

  it('mark_link_missing_value_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'link', source: { x: { field: 'sx' }, y: { field: 'sy' } }, target: { x: { field: 'tx' }, y: { field: 'ty' } }, encoding: {} })).toThrow();
  });

  it('mark_link_empty_value_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'link', source: { x: { field: 'sx' }, y: { field: 'sy' } }, target: { x: { field: 'tx' }, y: { field: 'ty' } }, value: '', encoding: {} })).toThrow();
  });

  it('mark_link_curvature_out_of_range_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'link', source: { x: { field: 'sx' }, y: { field: 'sy' } }, target: { x: { field: 'tx' }, y: { field: 'ty' } }, value: 'amount', curvature: 1.5, encoding: {} })).toThrow();
  });

  it('mark_link_typo_type_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'rbbon', source: { x: { field: 'sx' }, y: { field: 'sy' } }, target: { x: { field: 'tx' }, y: { field: 'ty' } }, value: 'amount', encoding: {} })).toThrow();
  });

  it('mark_link_strips_label', () => {
    // label 仅位置 mark；link 非 strict zod 剥离
    const parsed = MarkSchema.parse({ type: 'link', label: { content: { value: 'x' } }, source: { x: { field: 'sx' }, y: { field: 'sy' } }, target: { x: { field: 'tx' }, y: { field: 'ty' } }, value: 'amount', encoding: {} });
    expect((parsed as { label?: unknown }).label).toBeUndefined();
  });

  it('mark_link_json_round_trip', () => {
    const m = { type: 'link', id: 'f', source: { x: { field: 'sx' }, y: { field: 'sy' } }, target: { x: { field: 'tx' }, y: { field: 'ty' } }, value: 'amount', endWidth: 'end', curvature: 0.5, encoding: { color: { field: 'cat', scale: 'c' } } };
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });
});
