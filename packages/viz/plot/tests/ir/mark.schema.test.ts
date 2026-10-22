import { describe, expect, it } from 'vitest';

import { CustomMarkSchema, IntervalBoundsSchema, MarkOperationSchema, MarkSchema } from '../../src/schemas/mark';

const gradientPaint = {
  kind: 'linearGradient',
  angle: 90,
  stops: [
    { offset: 0, color: '#38bdf8' },
    { offset: 1, color: '#0f172a' },
  ],
};

describe('MarkSchema (contract)', () => {
  it('点方向契约可 JSON round-trip，非法方向声明被拒绝', () => {
    const mark = {
      type: 'point',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: { orientation: { kind: 'coordinate', role: 'x', align: 'normal' } },
    };
    const parsed = MarkSchema.parse(mark);
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
    for (const orientation of [
      { kind: 'coordinate', role: '', align: 'normal' },
      { kind: 'coordinate', role: 'x' },
      { kind: 'screen', role: 'x' },
    ]) {
      expect(MarkSchema.safeParse({ ...mark, orientation }).success).toBe(false);
    }
  });
  // Happy path
  it('mark_point_valid', () => {
    const m = {
      type: 'point',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_path_with_order_valid', () => {
    const m = {
      type: 'path',
      id: 'trend',
      encodings: { order: 'month', position: { x: { field: 'month' }, y: { field: 'revenue' } } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  // 边界
  it('mark_path_omits_order_valid', () => {
    const m = { type: 'path', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_id_optional_valid', () => {
    const withId = {
      type: 'point',
      id: 'p',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: { autoPadding: 'max-radius' },
    };
    const noId = {
      type: 'point',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkSchema.parse(withId)).toEqual({ ...withId, contributeToDomain: true });
    expect(MarkSchema.parse(noId)).toEqual({ ...noId, contributeToDomain: true });
  });

  it('mark_default_color_group_is_json_safe_and_non_blank', () => {
    const mark = {
      type: 'point',
      defaultColorGroup: 'observations',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkOperationSchema.parse(JSON.parse(JSON.stringify(mark)))).toEqual({ ...mark, contributeToDomain: true });
    expect(() =>
      MarkOperationSchema.parse({
        ...mark,
        defaultColorGroup: '   ',
      }),
    ).toThrow();
  });

  it('custom_mark_accepts_default_color_group', () => {
    const mark = { type: 'custom-symbol', defaultColorGroup: 'observations', properties: { value: 1 } };

    expect(MarkOperationSchema.parse(mark)).toEqual({ ...mark, contributeToDomain: true });
  });

  it('custom_mark_reports_deep_non_json_leaf_path', () => {
    const result = CustomMarkSchema.safeParse({
      type: 'custom-symbol',
      properties: { nested: [0, { bad: Symbol('invalid') }] },
    });

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues.at(0)?.path).toEqual(['properties', 'nested']);
  });

  // 错误路径
  it('mark_accepts_layer_zindex', () => {
    const mark = {
      type: 'point',
      layer: { zIndex: 120 },
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkOperationSchema.parse(mark)).toEqual({ ...mark, contributeToDomain: true });
  });

  it('mark_layer_rejects_fractional_zindex_and_unknown_fields', () => {
    expect(() =>
      MarkOperationSchema.parse({
        type: 'point',
        layer: { zIndex: 1.5 },
        encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
        properties: { autoPadding: 'max-radius' },
      }),
    ).toThrow();
    expect(() =>
      MarkOperationSchema.parse({
        type: 'point',
        layer: { zIndex: 1, order: 2 },
        encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
        properties: { autoPadding: 'max-radius' },
      }),
    ).toThrow();
  });

  it('mark_unknown_type_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'bar', kind: 'data' })).toThrow();
  });

  it('mark_missing_type_rejected', () => {
    expect(() => MarkSchema.parse({ kind: 'data' })).toThrow();
  });

  // 交互：两 mark 各自 encoding 互不依赖
  it('marks_distinct_encoding_valid', () => {
    const path = { type: 'path', encodings: { position: { x: { field: 'a' }, y: { field: 'b' } } } };
    const point = {
      type: 'point',
      encodings: { position: { y: { value: 0 }, x: { field: 'c' } } },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkSchema.parse(path)).toEqual({ ...path, contributeToDomain: true });
    expect(MarkSchema.parse(point)).toEqual({ ...point, contributeToDomain: true });
  });

  // contract：interval(bar)
  it('mark_interval_valid', () => {
    const m = { type: 'interval', encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } } };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_interval_with_id_valid', () => {
    const m = { type: 'interval', id: 'bars', encodings: { position: { x: { field: 'm' }, y: { field: 'r' } } } };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_interval_omitted_encoding_is_left_to_geometry_resolution', () => {
    expect(() => MarkSchema.parse({ type: 'interval' })).not.toThrow();
  });

  // contract：relation（series / bounds）
  it('mark_interval_series_dodge_valid', () => {
    const m = {
      type: 'interval',
      encodings: {
        series: 'product',
        bounds: { x: { group: 'product' } },
        position: { x: { field: 'm' }, y: { field: 'r' } },
      },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'band' } } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_interval_stack_valid', () => {
    const m = {
      type: 'interval',
      encodings: {
        series: 'product',
        bounds: { y: { from: { field: 'lo' }, to: { field: 'hi' } } },
        position: { x: { field: 'm' }, y: { field: 'r' } },
      },
      properties: { connection: 'coordinate', bounds: { y: { kind: 'extent' } } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_interval_bounds_bad_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        encodings: { position: { x: { field: 'm' }, y: { field: 'r' } } },
        properties: { connection: 'coordinate', bounds: { x: { kind: 'pile' } } },
      }),
    ).toThrow();
  });

  it('mark_interval_bounds_whitespace_role_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        encodings: { color: 'group' },
        properties: { connection: 'coordinate', bounds: { '   ': { kind: 'full' } } },
      }),
    ).toThrow();
  });

  it('mark_interval_bounds_reject_unknown_nested_fields_after_role_key_validation', () => {
    expect(IntervalBoundsSchema.safeParse({ custom: { kind: 'full', extra: true } }).success).toBe(false);
  });

  // contract：histogram 连续 x 区间柱（extent bound）
  it('mark_interval_extent_histogram_valid', () => {
    const m = {
      type: 'interval',
      encodings: {
        bounds: { x: { from: { field: 'binStart' }, to: { field: 'binEnd' } } },
        position: { x: { field: 'binStart' }, y: { field: 'binCount' } },
      },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'extent' } } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_interval_extent_empty_from_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        encodings: {
          bounds: { x: { from: { field: '' }, to: { field: 'binEnd' } } },
          position: { x: { field: 'm' }, y: { field: 'r' } },
        },
        properties: { connection: 'coordinate', bounds: { x: { kind: 'extent' } } },
      }),
    ).toThrow();
  });

  it('mark_path_series_valid', () => {
    const m = {
      type: 'path',
      encodings: { series: 'city', order: 't', position: { x: { field: 't' }, y: { field: 'v' } } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  // contract：sector(pie / donut) → interval (extent×full)
  it('mark_sector_valid', () => {
    const m = {
      type: 'interval',
      encodings: { bounds: { x: { from: { field: 'y0' }, to: { field: 'y1' } } }, color: 'label' },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_sector_custom_bound_fields_valid', () => {
    const m = {
      type: 'interval',
      encodings: { bounds: { x: { from: { field: 'lo' }, to: { field: 'hi' } } }, color: 'label' },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_sector_with_id_valid', () => {
    const m = {
      type: 'interval',
      id: 'pie',
      encodings: { bounds: { x: { from: { field: 'y0' }, to: { field: 'y1' } } }, color: 'label' },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_sector_union_discriminates', () => {
    const parsed = MarkSchema.parse({
      type: 'interval',
      encodings: { bounds: { x: { from: { field: 'lo' }, to: { field: 'hi' } } }, color: '#333' },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
    });

    expect(parsed.type).toBe('interval');
    expect(parsed.encodings?.bounds).toMatchObject({ x: { from: { field: 'lo' } } });
  });

  it('mark_sector_json_round_trip', () => {
    const m = {
      type: 'interval',
      encodings: { bounds: { x: { from: { field: 'y0' }, to: { field: 'y1' } } }, color: 'label' },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
    };

    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual({
      ...m,
      contributeToDomain: true,
    });
  });

  it('mark_sector_pull_constant_valid', () => {
    const m = {
      type: 'interval',
      encodings: { bounds: { x: { from: { field: 'y0' }, to: { field: 'y1' } } }, color: 'label' },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'extent' }, y: { kind: 'full' } }, pull: 12 },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_sector_pull_field_json_round_trip', () => {
    const m = {
      type: 'interval',
      encodings: { bounds: { x: { from: { field: 'y0' }, to: { field: 'y1' } } }, pull: 'offset', color: 'label' },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
    };

    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual({
      ...m,
      contributeToDomain: true,
    });
  });

  it('mark_sector_pull_negative_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        encodings: { bounds: { x: { from: { field: 'y0' }, to: { field: 'y1' } } }, color: 'label' },
        properties: { connection: 'coordinate', bounds: { x: { kind: 'extent' }, y: { kind: 'full' } }, pull: -1 },
      }),
    ).toThrow();
  });

  it('mark_sector_omitted_encoding_is_left_to_geometry_resolution', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        encodings: { bounds: { x: { from: { field: 'y0' }, to: { field: 'y1' } } } },
        properties: { connection: 'coordinate', bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
      }),
    ).not.toThrow();
  });

  it('mark_sector_typo_type_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'sektor', encodings: { color: 'label' } })).toThrow();
  });

  it('mark_sector_empty_start_field_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        encodings: { bounds: { x: { from: { field: '' }, to: { field: 'y1' } } }, color: 'label' },
        properties: { connection: 'coordinate', bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
      }),
    ).toThrow();
  });

  // 错误路径：baseline 必须有限（.finite 防 Infinity 破坏 JSON round-trip）

  // contract：path 加 closed（雷达多边形）
  it('mark_path_closed_valid', () => {
    const m = {
      type: 'path',
      encodings: { position: { x: { field: 'dim' }, y: { field: 'value' } } },
      properties: { connection: 'coordinate', closed: true },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_path_closed_omitted_valid', () => {
    const m = { type: 'path', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } };
    const parsed = MarkSchema.parse(m);

    expect(parsed).not.toHaveProperty('closed');
  });

  it('mark_path_closed_bad_type_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'path',
        encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
        properties: { connection: 'coordinate', closed: 'yes' },
      }),
    ).toThrow();
  });

  it('mark_path_closed_json_round_trip', () => {
    const m = {
      type: 'path',
      encodings: { order: 'dim', position: { x: { field: 'dim' }, y: { field: 'value' } } },
      properties: { connection: 'coordinate', closed: true },
    };

    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual({
      ...m,
      contributeToDomain: true,
    });
  });

  it('mark_path_connect_nulls_valid', () => {
    const m = {
      type: 'path',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: { connection: 'coordinate', connectNulls: true },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('缺值连接对象补齐默认虚线，拒绝非描边属性和非法值', () => {
    const mark = { type: 'path', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } };
    const parsed = MarkSchema.parse({ ...mark, properties: { connectNulls: {} } });

    expect(parsed).toMatchObject({ properties: { connectNulls: { dashPattern: [6, 4] } } });
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);

    for (const connectNulls of [{ fill: 'red' }, { strokeOpacity: 2 }, { strokeWidth: -1 }, { dashPattern: [] }]) {
      expect(() => MarkSchema.parse({ ...mark, properties: { connectNulls } })).toThrow();
    }
  });

  it('mark_path_closure_cycle_valid', () => {
    const m = {
      type: 'path',
      encodings: { position: { x: { field: 'dim' }, y: { field: 'value' } } },
      properties: { connection: 'coordinate', closure: { kind: 'cycle' } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_path_closure_baseline_valid', () => {
    const m = {
      type: 'path',
      encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } },
      properties: { connection: 'coordinate', closure: { kind: 'baseline', baseline: 5 } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_path_closure_stack_valid', () => {
    const m = {
      type: 'path',
      encodings: { closure: { baseline: 'y0' }, position: { x: { field: 'month' }, y: { field: 'y1' } } },
      properties: { connection: 'coordinate', closure: { kind: 'stack' } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_path_closure_stack_empty_baseline_field_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'path',
        encodings: { closure: { baseline: '' }, position: { x: { field: 'month' }, y: { field: 'y1' } } },
        properties: { connection: 'coordinate', closure: { kind: 'stack' } },
      }),
    ).toThrow();
  });

  it('mark_path_closure_baseline_nan_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'path',
        encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } },
        properties: { connection: 'coordinate', closure: { kind: 'baseline', baseline: Number.NaN } },
      }),
    ).toThrow();
  });

  // contract：size 通道仅 PointMark
  it('mark_point_with_size_field_valid', () => {
    const m = {
      type: 'point',
      encodings: { size: 'pop', position: { x: { field: 'lng' }, y: { field: 'lat' } } },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_point_with_size_value_valid', () => {
    const m = {
      type: 'point',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: { autoPadding: 'max-radius', size: 6 },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_interval_rejects_unknown_position_role_size', () => {
    const parsed = MarkSchema.safeParse({
      type: 'interval',
      encodings: { position: { x: { field: 'c' }, y: { field: 'v' }, size: { field: 'p' } } },
    });

    expect(parsed.success).toBe(false);
  });

  // contract：opacity 通道仅 PointMark
  it('mark_point_with_opacity_valid', () => {
    const m = {
      type: 'point',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } }, opacity: { overall: 'd' } },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_interval_rejects_unknown_position_role_opacity', () => {
    const parsed = MarkSchema.safeParse({
      type: 'interval',
      encodings: { position: { x: { field: 'c' }, y: { field: 'v' }, opacity: { field: 'd' } } },
    });

    expect(parsed.success).toBe(false);
  });

  // contract：shape 通道仅 PointMark
  it('mark_point_with_shape_valid', () => {
    const m = {
      type: 'point',
      encodings: { shape: 'cat', position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_point_with_constant_node_style_valid', () => {
    const m = {
      type: 'point',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: {
        autoPadding: 'max-radius',
        fill: '#f8fafc',
        stroke: '#0f172a',
        strokeWidth: 1.5,
        rotate: 45,
        padding: 2,
        minimumSize: { default: 14, width: 16, height: 12 },
        scale: { default: 1, x: 1.2 },
        zIndex: 3,
        opacity: { fill: 0.7, stroke: 0.9, overall: 0.8 },
      },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_point_with_stroke_channels_valid', () => {
    const m = {
      type: 'point',
      encodings: {
        position: { x: { field: 'x' }, y: { field: 'y' } },
        stroke: 'region',
        strokeWidth: 'density',
        opacity: { overall: 'density' },
      },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_point_accepts_paint_fill_and_stroke', () => {
    const m = {
      type: 'point',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: { autoPadding: 'max-radius', fill: gradientPaint, stroke: gradientPaint },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_interval_with_node_style_channels_valid', () => {
    const m = {
      type: 'interval',
      encodings: {
        strokeWidth: 'density',
        position: { x: { field: 'c' }, y: { field: 'v' } },
        opacity: { fill: 'fillAlpha' },
      },
      properties: { connection: 'coordinate', opacity: { overall: 0.8 } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_interval_rejects_unknown_position_role_shape', () => {
    const parsed = MarkSchema.safeParse({
      type: 'interval',
      encodings: { position: { x: { field: 'c' }, y: { field: 'v' }, shape: { field: 'cat' } } },
    });

    expect(parsed.success).toBe(false);
  });

  // contract：rect(heatmap) → interval (band×band)
  it('mark_rect_with_color_valid', () => {
    const m = {
      type: 'interval',
      encodings: {
        color: { field: 'value', scale: 'heat' },
        position: { x: { field: 'rowKey' }, y: { field: 'colKey' } },
      },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'band' }, y: { kind: 'band' } } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_rect_without_color_valid', () => {
    // 缺 color → 纯网格（值映射可选）；x / y 必填性 + band 约束下放 lowering，schema 仅解析通过
    const m = {
      type: 'interval',
      encodings: { position: { x: { field: 'day' }, y: { field: 'hour' } } },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'band' }, y: { kind: 'band' } } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_rect_with_id_valid', () => {
    const m = {
      type: 'interval',
      id: 'heat',
      encodings: { position: { x: { field: 'r' }, y: { field: 'c' } } },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'band' }, y: { kind: 'band' } } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_rect_omitted_encoding_is_left_to_geometry_resolution', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        properties: { connection: 'coordinate', bounds: { x: { kind: 'band' }, y: { kind: 'band' } } },
      }),
    ).not.toThrow();
  });

  it('mark_rect_typo_type_rejected', () => {
    expect(() =>
      MarkSchema.parse({ type: 'rekt', encodings: { position: { x: { field: 'r' }, y: { field: 'c' } } } }),
    ).toThrow();
  });

  it('mark_rect_union_discriminates', () => {
    const parsed = MarkSchema.parse({
      type: 'interval',
      encodings: { position: { x: { field: 'r' }, y: { field: 'c' } } },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'band' }, y: { kind: 'band' } } },
    });

    expect(parsed.type).toBe('interval');
  });

  it('mark_rect_rejects_unknown_position_role_size', () => {
    const parsed = MarkSchema.safeParse({
      type: 'interval',
      encodings: { position: { x: { field: 'r' }, y: { field: 'c' }, size: { field: 'p' } } },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'band' }, y: { kind: 'band' } } },
    });

    expect(parsed.success).toBe(false);
  });

  it('mark_rect_json_round_trip', () => {
    const m = {
      type: 'interval',
      id: 'heat',
      encodings: { color: { field: 'v', scale: 'heat' }, position: { x: { field: 'r' }, y: { field: 'c' } } },
      properties: { connection: 'coordinate', bounds: { x: { kind: 'band' }, y: { kind: 'band' } } },
    };

    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual({
      ...m,
      contributeToDomain: true,
    });
  });

  it('rejects unsupported built-in mark discriminators', () => {
    expect(MarkSchema.safeParse({ type: 'reference', properties: { position: { y: { value: 70 } } } }).success).toBe(
      false,
    );
  });

  // contract：text → point (encoding.text) + 位置 mark label
  it('mark_text_union_discriminates', () => {
    const parsed = MarkSchema.parse({
      type: 'point',
      encodings: { text: 'label', position: { x: { field: 'px' }, y: { field: 'py' } } },
      properties: { autoPadding: 'max-radius' },
    });

    expect(parsed.type).toBe('point');
  });

  it('mark_text_dx_dy_valid', () => {
    const m = {
      type: 'point',
      encodings: { text: 'lbl', position: { x: { field: 'px' }, y: { field: 'py' } } },
      properties: { autoPadding: 'max-radius', dx: 4, dy: -8 },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_text_channel_both_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'point',
        encodings: { text: { field: 'a', value: 'x' }, position: { x: { field: 'px' }, y: { field: 'py' } } },
        properties: { autoPadding: 'max-radius' },
      }),
    ).toThrow();
  });

  it('mark_text_typo_type_rejected', () => {
    expect(() =>
      MarkSchema.parse({ type: 'txt', encodings: { text: 'a', position: { x: { field: 'px' }, y: { field: 'py' } } } }),
    ).toThrow();
  });

  it('mark_text_json_round_trip', () => {
    const m = {
      type: 'point',
      id: 't',
      encodings: { text: 'label', position: { x: { field: 'px' }, y: { field: 'py' } } },
      properties: { autoPadding: 'max-radius', dx: 2, dy: 3, color: '#333', displayFormat: ',.0f' },
    };

    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual({
      ...m,
      contributeToDomain: true,
    });
  });

  it('mark_interval_label_valid', () => {
    const m = {
      type: 'interval',
      encodings: { label: { text: 'revenue' }, position: { x: { field: 'month' }, y: { field: 'revenue' } } },
      properties: {
        connection: 'coordinate',
        label: { displayFormat: ',.0f', position: 'top', distance: 6, pin: true },
      },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_path_host_geometry_label_valid', () => {
    const m = {
      type: 'path',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: {
        connection: 'coordinate',
        label: { text: 'trend', position: 'midway', side: 'top', sloped: true },
      },
    };

    expect(MarkSchema.parse(m)).toEqual({
      ...m,
      contributeToDomain: true,
      properties: { ...m.properties, label: { ...m.properties.label, side: 'top' } },
    });
  });

  it('mark_label_core_style_fields_valid', () => {
    const m = {
      type: 'interval',
      encodings: { label: { text: 'revenue' }, position: { x: { field: 'month' }, y: { field: 'revenue' } } },
      properties: {
        connection: 'coordinate',
        label: {
          textColor: '#334155',
          opacity: 0.75,
          font: { family: 'serif', size: 12, weight: 'bold', style: 'italic' },
          rotate: 'tangent',
          keepUpright: true,
          pin: { stroke: '#64748b', strokeWidth: 1.5, dashPattern: [2, 2] },
        },
      },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_path_with_core_path_style_channels_valid', () => {
    const m = {
      type: 'path',
      encodings: {
        roundedCorners: 'corner',
        position: { x: { field: 'x' }, y: { field: 'y' } },
        strokeWidth: 'weight',
      },
      properties: { connection: 'coordinate', lineCap: 'round', lineJoin: 'bevel', opacity: { overall: 0.9 } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_path_accepts_paint_fill_and_stroke', () => {
    const m = {
      type: 'path',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: { connection: 'coordinate', fill: gradientPaint, stroke: gradientPaint },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_interval_accepts_paint_fill_and_stroke', () => {
    const m = {
      type: 'interval',
      encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } },
      properties: { connection: 'coordinate', fill: gradientPaint, stroke: gradientPaint },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_style_colors_reject_whitespace_only_strings', () => {
    expect(
      MarkSchema.safeParse({
        type: 'point',
        encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
        properties: { autoPadding: 'max-radius', color: '   ' },
      }).success,
    ).toBe(false);
    expect(
      MarkSchema.safeParse({
        type: 'path',
        encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
        properties: { connection: 'coordinate', fill: '   ' },
      }).success,
    ).toBe(false);
    expect(
      MarkSchema.safeParse({
        type: 'interval',
        encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
        properties: { connection: 'coordinate', label: { text: 'label', pin: { stroke: '   ' } } },
      }).success,
    ).toBe(false);
  });

  it('mark_point_label_numeric_position_valid', () => {
    const m = {
      type: 'point',
      encodings: { position: { x: { field: 'px' }, y: { field: 'py' } } },
      properties: { autoPadding: 'max-radius', label: { text: 'x', position: 30 } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_label_content_neither_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        encodings: { position: { x: { field: 'm' }, y: { field: 'r' } } },
        properties: { connection: 'coordinate', label: { text: {} } },
      }),
    ).toThrow();
  });

  it('mark_path_rejects_node_only_label_pin', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'path',
        encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
        properties: { connection: 'coordinate', label: { text: 'trend', pin: true } },
      }),
    ).toThrow();
  });

  it('mark_relation_label_valid_and_json_round_trip', () => {
    const m = {
      type: 'relation',
      encodings: { label: { text: 'label' } },
      properties: {
        autoPadding: false,
        label: { position: 0.5, placement: 'inside' },
        source: { id: 'A' },
        target: { id: 'B' },
        geometry: { kind: 'path' },
      },
    };

    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual({
      ...m,
      contributeToDomain: true,
    });
  });

  it('mark_relation_accepts_projected_endpoint_glyphs', () => {
    const mark = {
      type: 'relation',
      encodings: {
        source: { position: { x: { field: 'start' }, y: { field: 'category' } } },
        target: { position: { x: { field: 'end' }, y: { field: 'category' } } },
      },
      properties: {
        autoPadding: false,
        endpoints: {
          source: { shape: 'circle', size: 5 },
          target: { shape: 'diamond', size: 6 },
        },
        geometry: { kind: 'path' },
      },
    };

    expect(MarkSchema.parse(JSON.parse(JSON.stringify(mark)))).toEqual({ ...mark, contributeToDomain: true });
  });

  it('mark_relation_rejects_endpoint_glyphs_outside_plain_projected_paths', () => {
    const endpoints = { source: {}, target: {} };

    expect(() =>
      MarkSchema.parse({
        type: 'relation',
        properties: {
          endpoints,
          autoPadding: false,
          source: { id: 'A' },
          target: { id: 'B' },
          geometry: { kind: 'path' },
        },
      }),
    ).toThrow(/projected/);
    expect(() =>
      MarkSchema.parse({
        type: 'relation',
        encodings: {
          source: { position: { x: { field: 'start' }, y: { field: 'category' } } },
          target: { position: { x: { field: 'end' }, y: { field: 'category' } } },
        },
        properties: { endpoints, autoPadding: false, geometry: { kind: 'ribbon', width: 8 } },
      }),
    ).toThrow(/path geometry/);
    expect(() =>
      MarkSchema.parse({
        type: 'relation',
        encodings: {
          source: { position: { x: { field: 'start' }, y: { field: 'category' } } },
          target: { position: { x: { field: 'end' }, y: { field: 'category' } } },
          geometry: { via: [{ position: { x: { value: 1 }, y: { value: 2 } } }] },
        },
        properties: {
          autoPadding: false,
          endpoints,
          geometry: { kind: 'path', via: [{}] },
        },
      }),
    ).toThrow(/via or route/);
    expect(() =>
      MarkSchema.parse({
        type: 'relation',
        encodings: {
          source: { position: { x: { field: 'start' }, y: { field: 'category' } } },
          target: { position: { x: { field: 'end' }, y: { field: 'category' } } },
        },
        properties: {
          autoPadding: false,
          endpoints: { source: { zIndex: { kind: 'constant', value: 2 } } },
          geometry: { kind: 'path' },
        },
      }),
    ).toThrow();
  });

  it('mark_relation_explicit_route_accepts_three_leg_core_fold', () => {
    const mark = {
      type: 'relation',
      properties: {
        autoPadding: false,
        source: { id: 'A' },
        target: { id: 'B' },
        geometry: { kind: 'path', route: [{ kind: 'fold', via: '-|-' }] },
      },
    };

    expect(MarkSchema.parse(mark)).toEqual({ ...mark, contributeToDomain: true });
  });

  it('mark_relation_algorithmic_orthogonal_routing_rejects_three_leg_fold', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'relation',
        properties: {
          autoPadding: false,
          source: { id: 'A' },
          target: { id: 'B' },
          geometry: { kind: 'path', routing: { kind: 'orthogonal', via: '-|-' } },
        },
      }),
    ).toThrow();
  });

  it('mark_point_accepts_local_transform', () => {
    const m = {
      type: 'point',
      transforms: [{ operation: { kind: 'sort', params: { field: 'score', order: 'descending' } } }],
      encodings: { position: { x: { field: 'x' }, y: { field: 'score' } } },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('mark_path_accepts_local_transform', () => {
    const m = {
      type: 'path',
      transforms: [
        {
          operation: {
            kind: 'summarize',
            params: {
              groupBy: ['series'],
              metrics: [{ kind: 'sum', field: 'value', as: 'total' }],
            },
          },
        },
      ],
      encodings: { order: 'series', position: { x: { field: 'series' }, y: { field: 'total' } } },
    };

    expect(MarkSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });

  it('custom_mark_accepts_local_transform', () => {
    const m = {
      type: 'dot',
      transforms: [{ operation: { kind: 'top-n', params: { field: 'score', n: 3 } } }],
      encodings: { position: { x: { field: 'x' }, y: { field: 'score' } } },
    };

    expect(MarkOperationSchema.parse(m)).toEqual({ ...m, contributeToDomain: true });
  });
});

describe('Polar interpolation mark contract', () => {
  it.each(['polar', 'chord'] as const)('round-trips interpolation=%s for supported marks', interpolation => {
    const marks = [
      {
        type: 'path',
        properties: { connection: 'coordinate', interpolation },
        encodings: { position: { x: { field: 'angle' }, y: { field: 'radius' } } },
      },
      {
        type: 'interval',
        properties: { connection: 'coordinate', interpolation },
        encodings: { position: { x: { field: 'angle' }, y: { field: 'radius' } } },
      },
      {
        type: 'relation',
        encodings: {
          source: { position: { x: { field: 'sourceAngle' }, y: { field: 'sourceRadius' } } },
          target: { position: { x: { field: 'targetAngle' }, y: { field: 'targetRadius' } } },
        },
        properties: { autoPadding: false, geometry: { kind: 'path' } },
      },
    ];

    for (const mark of marks) {
      expect(MarkSchema.parse(JSON.parse(JSON.stringify(mark)))).toEqual({ ...mark, contributeToDomain: true });
    }
  });

  it.each(['path', 'interval'] as const)('rejects unknown %s interpolation', type => {
    const encoding = { x: { field: 'x' }, y: { field: 'y' } };

    expect(() => MarkSchema.parse({ type, interpolation: 'spline', encoding })).toThrow();
  });

  it('rejects unknown relation path interpolation', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'relation',
        properties: {
          autoPadding: false,
          source: { id: 'A' },
          target: { id: 'B' },
          geometry: { kind: 'path', interpolation: 'spline' },
        },
      }),
    ).toThrow();
  });
});
