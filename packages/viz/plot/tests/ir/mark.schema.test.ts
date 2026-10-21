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
      kind: 'data',
      encodings: { position: { x: 'x', y: 'y' } },
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
      kind: 'data',
      encodings: { position: { x: 'x', y: 'y' } },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_path_with_order_valid', () => {
    const m = {
      type: 'path',
      id: 'trend',
      kind: 'data',
      encodings: { order: 'month', position: { x: 'month', y: 'revenue' } },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  // 边界
  it('mark_path_omits_order_valid', () => {
    const m = { type: 'path', kind: 'data', encodings: { position: { x: 'x', y: 'y' } } };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_id_optional_valid', () => {
    const withId = {
      type: 'point',
      id: 'p',
      kind: 'data',
      encodings: { position: { x: 'x', y: 'y' } },
      properties: { autoPadding: 'max-radius' },
    };
    const noId = {
      type: 'point',
      kind: 'data',
      encodings: { position: { x: 'x', y: 'y' } },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkSchema.parse(withId)).toEqual(withId);
    expect(MarkSchema.parse(noId)).toEqual(noId);
  });

  it('mark_default_color_group_is_json_safe_and_non_blank', () => {
    const mark = {
      type: 'point',
      defaultColorGroup: 'observations',
      kind: 'data',
      encodings: { position: { x: 'x', y: 'y' } },
      properties: { autoPadding: 'max-radius' },
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
    const mark = { type: 'custom-symbol', kind: 'data', defaultColorGroup: 'observations', properties: { value: 1 } };

    expect(MarkOperationSchema.parse(mark)).toEqual(mark);
  });

  it('custom_mark_reports_deep_non_json_leaf_path', () => {
    const result = CustomMarkSchema.safeParse({
      type: 'custom-symbol',
      kind: 'data',
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
      kind: 'data',
      encodings: { position: { x: 'x', y: 'y' } },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkOperationSchema.parse(mark)).toEqual(mark);
  });

  it('mark_layer_rejects_fractional_zindex_and_unknown_fields', () => {
    expect(() =>
      MarkOperationSchema.parse({
        type: 'point',
        layer: { zIndex: 1.5 },
        kind: 'data',
        encodings: { position: { x: 'x', y: 'y' } },
        properties: { autoPadding: 'max-radius' },
      }),
    ).toThrow();
    expect(() =>
      MarkOperationSchema.parse({
        type: 'point',
        layer: { zIndex: 1, order: 2 },
        kind: 'data',
        encodings: { position: { x: 'x', y: 'y' } },
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
    const path = { type: 'path', kind: 'data', encodings: { position: { x: 'a', y: 'b' } } };
    const point = {
      type: 'point',
      kind: 'data',
      encodings: { position: { x: 'c' } },
      properties: { autoPadding: 'max-radius', position: { y: 0 } },
    };

    expect(MarkSchema.parse(path)).toEqual(path);
    expect(MarkSchema.parse(point)).toEqual(point);
  });

  // contract：interval(bar)
  it('mark_interval_valid', () => {
    const m = { type: 'interval', kind: 'data', encodings: { position: { x: 'month', y: 'revenue' } } };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_with_id_valid', () => {
    const m = { type: 'interval', id: 'bars', kind: 'data', encodings: { position: { x: 'm', y: 'r' } } };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_omitted_encoding_is_left_to_geometry_resolution', () => {
    expect(() => MarkSchema.parse({ type: 'interval', kind: 'data' })).not.toThrow();
  });

  // contract：relation（series / bounds）
  it('mark_interval_series_dodge_valid', () => {
    const m = {
      type: 'interval',
      kind: 'data',
      encodings: { series: 'product', bounds: { x: { group: 'product' } }, position: { x: 'm', y: 'r' } },
      properties: { bounds: { x: { kind: 'band' } } },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_stack_valid', () => {
    const m = {
      type: 'interval',
      kind: 'data',
      encodings: { series: 'product', bounds: { y: { from: 'lo', to: 'hi' } }, position: { x: 'm', y: 'r' } },
      properties: { bounds: { y: { kind: 'extent' } } },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_bounds_bad_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        kind: 'data',
        encodings: { position: { x: 'm', y: 'r' } },
        properties: { bounds: { x: { kind: 'pile' } } },
      }),
    ).toThrow();
  });

  it('mark_interval_bounds_whitespace_role_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        kind: 'data',
        encodings: { color: 'group' },
        properties: { bounds: { '   ': { kind: 'full' } } },
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
      kind: 'data',
      encodings: { bounds: { x: { from: 'binStart', to: 'binEnd' } }, position: { x: 'binStart', y: 'binCount' } },
      properties: { bounds: { x: { kind: 'extent' } } },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_extent_empty_from_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        kind: 'data',
        encodings: { bounds: { x: { from: '', to: 'binEnd' } }, position: { x: 'm', y: 'r' } },
        properties: { bounds: { x: { kind: 'extent' } } },
      }),
    ).toThrow();
  });

  it('mark_path_series_valid', () => {
    const m = { type: 'path', kind: 'data', encodings: { series: 'city', order: 't', position: { x: 't', y: 'v' } } };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  // contract：sector(pie / donut) → interval (extent×full)
  it('mark_sector_valid', () => {
    const m = {
      type: 'interval',
      kind: 'data',
      encodings: { bounds: { x: { from: 'y0', to: 'y1' } }, color: 'label' },
      properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_sector_custom_bound_fields_valid', () => {
    const m = {
      type: 'interval',
      kind: 'data',
      encodings: { bounds: { x: { from: 'lo', to: 'hi' } }, color: 'label' },
      properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_sector_with_id_valid', () => {
    const m = {
      type: 'interval',
      id: 'pie',
      kind: 'data',
      encodings: { bounds: { x: { from: 'y0', to: 'y1' } }, color: 'label' },
      properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_sector_union_discriminates', () => {
    const parsed = MarkSchema.parse({
      type: 'interval',
      kind: 'data',
      encodings: { bounds: { x: { from: 'lo', to: 'hi' } }, color: '#333' },
      properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
    });

    expect(parsed.type).toBe('interval');
    expect(parsed.encodings?.bounds).toMatchObject({ x: { from: 'lo' } });
  });

  it('mark_sector_json_round_trip', () => {
    const m = {
      type: 'interval',
      kind: 'data',
      encodings: { bounds: { x: { from: 'y0', to: 'y1' } }, color: 'label' },
      properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
    };

    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });

  it('mark_sector_pull_constant_valid', () => {
    const m = {
      type: 'interval',
      kind: 'data',
      encodings: { bounds: { x: { from: 'y0', to: 'y1' } }, color: 'label' },
      properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'full' } }, pull: 12 },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_sector_pull_field_json_round_trip', () => {
    const m = {
      type: 'interval',
      kind: 'data',
      encodings: { bounds: { x: { from: 'y0', to: 'y1' } }, pull: 'offset', color: 'label' },
      properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
    };

    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });

  it('mark_sector_pull_negative_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        kind: 'data',
        encodings: { bounds: { x: { from: 'y0', to: 'y1' } }, color: 'label' },
        properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'full' } }, pull: -1 },
      }),
    ).toThrow();
  });

  it('mark_sector_omitted_encoding_is_left_to_geometry_resolution', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        kind: 'data',
        encodings: { bounds: { x: { from: 'y0', to: 'y1' } } },
        properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
      }),
    ).not.toThrow();
  });

  it('mark_sector_typo_type_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'sektor', kind: 'data', encodings: { color: 'label' } })).toThrow();
  });

  it('mark_sector_empty_start_field_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        kind: 'data',
        encodings: { bounds: { x: { from: '', to: 'y1' } }, color: 'label' },
        properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'full' } } },
      }),
    ).toThrow();
  });

  // 错误路径：baseline 必须有限（.finite 防 Infinity 破坏 JSON round-trip）

  // contract：path 加 closed（雷达多边形）
  it('mark_path_closed_valid', () => {
    const m = {
      type: 'path',
      kind: 'data',
      encodings: { position: { x: 'dim', y: 'value' } },
      properties: { closed: true },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_path_closed_omitted_valid', () => {
    const m = { type: 'path', kind: 'data', encodings: { position: { x: 'x', y: 'y' } } };
    const parsed = MarkSchema.parse(m);

    expect(parsed).not.toHaveProperty('closed');
  });

  it('mark_path_closed_bad_type_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'path',
        kind: 'data',
        encodings: { position: { x: 'x', y: 'y' } },
        properties: { closed: 'yes' },
      }),
    ).toThrow();
  });

  it('mark_path_closed_json_round_trip', () => {
    const m = {
      type: 'path',
      kind: 'data',
      encodings: { order: 'dim', position: { x: 'dim', y: 'value' } },
      properties: { closed: true },
    };

    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });

  it('mark_path_connect_nulls_valid', () => {
    const m = {
      type: 'path',
      kind: 'data',
      encodings: { position: { x: 'x', y: 'y' } },
      properties: { connectNulls: true },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('缺值连接对象补齐默认虚线，拒绝非描边属性和非法值', () => {
    const mark = { type: 'path', kind: 'data', encodings: { position: { x: 'x', y: 'y' } } };
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
      kind: 'data',
      encodings: { position: { x: 'dim', y: 'value' } },
      properties: { closure: { kind: 'cycle' } },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_path_closure_baseline_valid', () => {
    const m = {
      type: 'path',
      kind: 'data',
      encodings: { position: { x: 'month', y: 'revenue' } },
      properties: { closure: { kind: 'baseline', baseline: 5 } },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_path_closure_stack_valid', () => {
    const m = {
      type: 'path',
      kind: 'data',
      encodings: { closure: { baseline: 'y0' }, position: { x: 'month', y: 'y1' } },
      properties: { closure: { kind: 'stack' } },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_path_closure_stack_empty_baseline_field_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'path',
        kind: 'data',
        encodings: { closure: { baseline: '' }, position: { x: 'month', y: 'y1' } },
        properties: { closure: { kind: 'stack' } },
      }),
    ).toThrow();
  });

  it('mark_path_closure_baseline_nan_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'path',
        kind: 'data',
        encodings: { position: { x: 'month', y: 'revenue' } },
        properties: { closure: { kind: 'baseline', baseline: Number.NaN } },
      }),
    ).toThrow();
  });

  // contract：size 通道仅 PointMark
  it('mark_point_with_size_field_valid', () => {
    const m = {
      type: 'point',
      kind: 'data',
      encodings: { size: 'pop', position: { x: 'lng', y: 'lat' } },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_point_with_size_value_valid', () => {
    const m = {
      type: 'point',
      kind: 'data',
      encodings: { position: { x: 'x', y: 'y' } },
      properties: { autoPadding: 'max-radius', size: 6 },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_preserves_unknown_role_key_size', () => {
    // 未知 encoding key 在 schema 层保留；是否是合法位置角色交给 active CoordinateDefinition.roles 在 lowering 校验
    const parsed = MarkSchema.parse({
      type: 'interval',
      kind: 'data',
      encodings: { position: { x: 'c', y: 'v', size: 'p' } },
    });

    expect(parsed.encodings?.position).toMatchObject({ size: 'p' });
  });

  // contract：opacity 通道仅 PointMark
  it('mark_point_with_opacity_valid', () => {
    const m = {
      type: 'point',
      kind: 'data',
      encodings: { position: { x: 'x', y: 'y' }, opacity: { overall: 'd' } },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_preserves_unknown_role_key_opacity', () => {
    const parsed = MarkSchema.parse({
      type: 'interval',
      kind: 'data',
      encodings: { position: { x: 'c', y: 'v', opacity: 'd' } },
    });

    expect(parsed.encodings?.position).toMatchObject({ opacity: 'd' });
  });

  // contract：shape 通道仅 PointMark
  it('mark_point_with_shape_valid', () => {
    const m = {
      type: 'point',
      kind: 'data',
      encodings: { shape: 'cat', position: { x: 'x', y: 'y' } },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_point_with_constant_node_style_valid', () => {
    const m = {
      type: 'point',
      kind: 'data',
      encodings: { position: { x: 'x', y: 'y' } },
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

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_point_with_stroke_channels_valid', () => {
    const m = {
      type: 'point',
      kind: 'data',
      encodings: {
        position: { x: 'x', y: 'y' },
        stroke: 'region',
        strokeWidth: 'density',
        opacity: { overall: 'density' },
      },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_point_accepts_paint_fill_and_stroke', () => {
    const m = {
      type: 'point',
      kind: 'data',
      encodings: { position: { x: 'x', y: 'y' } },
      properties: { autoPadding: 'max-radius', fill: gradientPaint, stroke: gradientPaint },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_with_node_style_channels_valid', () => {
    const m = {
      type: 'interval',
      kind: 'data',
      encodings: { strokeWidth: 'density', position: { x: 'c', y: 'v' }, opacity: { fill: 'fillAlpha' } },
      properties: { opacity: { overall: 0.8 } },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_preserves_unknown_role_key_shape', () => {
    const parsed = MarkSchema.parse({
      type: 'interval',
      kind: 'data',
      encodings: { position: { x: 'c', y: 'v', shape: 'cat' } },
    });

    expect(parsed.encodings?.position).toMatchObject({ shape: 'cat' });
  });

  // contract：rect(heatmap) → interval (band×band)
  it('mark_rect_with_color_valid', () => {
    const m = {
      type: 'interval',
      kind: 'data',
      encodings: { color: { field: 'value', scale: 'heat' }, position: { x: 'rowKey', y: 'colKey' } },
      properties: { bounds: { x: { kind: 'band' }, y: { kind: 'band' } } },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_rect_without_color_valid', () => {
    // 缺 color → 纯网格（值映射可选）；x / y 必填性 + band 约束下放 lowering，schema 仅解析通过
    const m = {
      type: 'interval',
      kind: 'data',
      encodings: { position: { x: 'day', y: 'hour' } },
      properties: { bounds: { x: { kind: 'band' }, y: { kind: 'band' } } },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_rect_with_id_valid', () => {
    const m = {
      type: 'interval',
      id: 'heat',
      kind: 'data',
      encodings: { position: { x: 'r', y: 'c' } },
      properties: { bounds: { x: { kind: 'band' }, y: { kind: 'band' } } },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_rect_omitted_encoding_is_left_to_geometry_resolution', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        kind: 'data',
        properties: { bounds: { x: { kind: 'band' }, y: { kind: 'band' } } },
      }),
    ).not.toThrow();
  });

  it('mark_rect_typo_type_rejected', () => {
    expect(() =>
      MarkSchema.parse({ type: 'rekt', kind: 'data', encodings: { position: { x: 'r', y: 'c' } } }),
    ).toThrow();
  });

  it('mark_rect_union_discriminates', () => {
    const parsed = MarkSchema.parse({
      type: 'interval',
      kind: 'data',
      encodings: { position: { x: 'r', y: 'c' } },
      properties: { bounds: { x: { kind: 'band' }, y: { kind: 'band' } } },
    });

    expect(parsed.type).toBe('interval');
  });

  it('mark_rect_preserves_unknown_role_key_size', () => {
    // 未知 encoding key 在 schema 层保留；lowering 按坐标系 roles fail-loud
    const parsed = MarkSchema.parse({
      type: 'interval',
      kind: 'data',
      encodings: { position: { x: 'r', y: 'c', size: 'p' } },
      properties: { bounds: { x: { kind: 'band' }, y: { kind: 'band' } } },
    });

    expect(parsed.encodings?.position).toMatchObject({ size: 'p' });
  });

  it('mark_rect_json_round_trip', () => {
    const m = {
      type: 'interval',
      id: 'heat',
      kind: 'data',
      encodings: { color: { field: 'v', scale: 'heat' }, position: { x: 'r', y: 'c' } },
      properties: { bounds: { x: { kind: 'band' }, y: { kind: 'band' } } },
    };

    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });

  it('rejects unsupported built-in mark discriminators', () => {
    expect(MarkSchema.safeParse({ type: 'reference', kind: 'data', properties: { position: { y: 70 } } }).success).toBe(
      false,
    );
  });

  // contract：text → point (encoding.text) + 位置 mark label
  it('mark_text_union_discriminates', () => {
    const parsed = MarkSchema.parse({
      type: 'point',
      kind: 'data',
      encodings: { text: 'label', position: { x: 'px', y: 'py' } },
      properties: { autoPadding: 'max-radius' },
    });

    expect(parsed.type).toBe('point');
  });

  it('mark_text_dx_dy_valid', () => {
    const m = {
      type: 'point',
      kind: 'data',
      encodings: { text: 'lbl', position: { x: 'px', y: 'py' } },
      properties: { autoPadding: 'max-radius', dx: 4, dy: -8 },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_text_channel_both_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'point',
        kind: 'data',
        encodings: { text: { field: 'a', value: 'x' }, position: { x: 'px', y: 'py' } },
        properties: { autoPadding: 'max-radius' },
      }),
    ).toThrow();
  });

  it('mark_text_typo_type_rejected', () => {
    expect(() =>
      MarkSchema.parse({ type: 'txt', kind: 'data', encodings: { text: 'a', position: { x: 'px', y: 'py' } } }),
    ).toThrow();
  });

  it('mark_text_json_round_trip', () => {
    const m = {
      type: 'point',
      id: 't',
      kind: 'data',
      encodings: { text: 'label', position: { x: 'px', y: 'py' } },
      properties: { autoPadding: 'max-radius', dx: 2, dy: 3, color: '#333', displayFormat: ',.0f' },
    };

    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });

  it('mark_interval_label_valid', () => {
    const m = {
      type: 'interval',
      kind: 'data',
      encodings: { label: { content: 'revenue' }, position: { x: 'month', y: 'revenue' } },
      properties: { label: { displayFormat: ',.0f', position: 'top', distance: 6, pin: true } },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_path_host_geometry_label_valid', () => {
    const m = {
      type: 'path',
      kind: 'data',
      encodings: { position: { x: 'x', y: 'y' } },
      properties: { label: { content: 'trend', position: 'midway', side: 'top', sloped: true } },
    };

    expect(MarkSchema.parse(m)).toEqual({
      ...m,
      properties: { ...m.properties, label: { ...m.properties.label, side: 'top' } },
    });
  });

  it('mark_label_core_style_fields_valid', () => {
    const m = {
      type: 'interval',
      kind: 'data',
      encodings: { label: { content: 'revenue' }, position: { x: 'month', y: 'revenue' } },
      properties: {
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

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_path_with_core_path_style_channels_valid', () => {
    const m = {
      type: 'path',
      kind: 'data',
      encodings: { roundedCorners: 'corner', position: { x: 'x', y: 'y' }, strokeWidth: 'weight' },
      properties: { lineCap: 'round', lineJoin: 'bevel', opacity: { overall: 0.9 } },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_path_accepts_paint_fill_and_stroke', () => {
    const m = {
      type: 'path',
      kind: 'data',
      encodings: { position: { x: 'x', y: 'y' } },
      properties: { fill: gradientPaint, stroke: gradientPaint },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_accepts_paint_fill_and_stroke', () => {
    const m = {
      type: 'interval',
      kind: 'data',
      encodings: { position: { x: 'month', y: 'revenue' } },
      properties: { fill: gradientPaint, stroke: gradientPaint },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_style_colors_reject_whitespace_only_strings', () => {
    expect(
      MarkSchema.safeParse({
        type: 'point',
        kind: 'data',
        encodings: { position: { x: 'x', y: 'y' } },
        properties: { autoPadding: 'max-radius', color: '   ' },
      }).success,
    ).toBe(false);
    expect(
      MarkSchema.safeParse({
        type: 'path',
        kind: 'data',
        encodings: { position: { x: 'x', y: 'y' } },
        properties: { fill: '   ' },
      }).success,
    ).toBe(false);
    expect(
      MarkSchema.safeParse({
        type: 'interval',
        kind: 'data',
        encodings: { position: { x: 'x', y: 'y' } },
        properties: { label: { content: 'label', pin: { stroke: '   ' } } },
      }).success,
    ).toBe(false);
  });

  it('mark_point_label_numeric_position_valid', () => {
    const m = {
      type: 'point',
      kind: 'data',
      encodings: { position: { x: 'px', y: 'py' } },
      properties: { autoPadding: 'max-radius', label: { content: 'x', position: 30 } },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_label_content_neither_rejected', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'interval',
        kind: 'data',
        encodings: { position: { x: 'm', y: 'r' } },
        properties: { label: { content: {} } },
      }),
    ).toThrow();
  });

  it('mark_path_rejects_node_only_label_pin', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'path',
        kind: 'data',
        encodings: { position: { x: 'x', y: 'y' } },
        properties: { label: { content: 'trend', pin: true } },
      }),
    ).toThrow();
  });

  it('mark_relation_label_valid_and_json_round_trip', () => {
    const m = {
      type: 'relation',
      kind: 'data',
      encodings: { label: { content: 'label' } },
      properties: {
        autoPadding: false,
        source: { id: 'A' },
        target: { id: 'B' },
        label: { position: 0.5, placement: 'inside' },
        geometry: { kind: 'path' },
      },
    };

    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });

  it('mark_relation_accepts_projected_endpoint_glyphs', () => {
    const mark = {
      type: 'relation',
      kind: 'data',
      encodings: {
        source: { position: { x: 'start', y: 'category' } },
        target: { position: { x: 'end', y: 'category' } },
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

    expect(MarkSchema.parse(JSON.parse(JSON.stringify(mark)))).toEqual(mark);
  });

  it('mark_relation_rejects_endpoint_glyphs_outside_plain_projected_paths', () => {
    const endpoints = { source: {}, target: {} };

    expect(() =>
      MarkSchema.parse({
        type: 'relation',
        kind: 'data',
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
        kind: 'data',
        encodings: {
          source: { position: { x: 'start', y: 'category' } },
          target: { position: { x: 'end', y: 'category' } },
        },
        properties: { endpoints, autoPadding: false, geometry: { kind: 'ribbon', width: 8 } },
      }),
    ).toThrow(/path geometry/);
    expect(() =>
      MarkSchema.parse({
        type: 'relation',
        kind: 'data',
        encodings: {
          source: { position: { x: 'start', y: 'category' } },
          target: { position: { x: 'end', y: 'category' } },
        },
        properties: {
          autoPadding: false,
          endpoints,
          geometry: { kind: 'path', via: [{ position: { x: 1, y: 2 } }] },
        },
      }),
    ).toThrow(/via or route/);
    expect(() =>
      MarkSchema.parse({
        type: 'relation',
        kind: 'data',
        encodings: {
          source: { position: { x: 'start', y: 'category' } },
          target: { position: { x: 'end', y: 'category' } },
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
      kind: 'data',
      properties: {
        autoPadding: false,
        source: { id: 'A' },
        target: { id: 'B' },
        geometry: { kind: 'path', route: [{ kind: 'fold', via: '-|-' }] },
      },
    };

    expect(MarkSchema.parse(mark)).toEqual(mark);
  });

  it('mark_relation_algorithmic_orthogonal_routing_rejects_three_leg_fold', () => {
    expect(() =>
      MarkSchema.parse({
        type: 'relation',
        kind: 'data',
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
      kind: 'data',
      encodings: { position: { x: 'x', y: 'score' } },
      properties: { autoPadding: 'max-radius' },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
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
      kind: 'data',
      encodings: { order: 'series', position: { x: 'series', y: 'total' } },
    };

    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('custom_mark_accepts_local_transform', () => {
    const m = {
      type: 'dot',
      transforms: [{ operation: { kind: 'top-n', params: { field: 'score', n: 3 } } }],
      kind: 'data',
      encodings: { position: { x: 'x', y: 'score' } },
    };

    expect(MarkOperationSchema.parse(m)).toEqual(m);
  });
});

describe('Polar interpolation mark contract', () => {
  it.each(['polar', 'chord'] as const)('round-trips interpolation=%s for supported marks', interpolation => {
    const marks = [
      {
        type: 'path',
        properties: { interpolation },
        kind: 'data',
        encodings: { position: { x: 'angle', y: 'radius' } },
      },
      {
        type: 'interval',
        properties: { interpolation },
        kind: 'data',
        encodings: { position: { x: 'angle', y: 'radius' } },
      },
      {
        type: 'relation',
        kind: 'data',
        encodings: {
          source: { position: { x: 'sourceAngle', y: 'sourceRadius' } },
          target: { position: { x: 'targetAngle', y: 'targetRadius' } },
        },
        properties: { autoPadding: false, geometry: { kind: 'path' } },
      },
    ];

    for (const mark of marks) {
      expect(MarkSchema.parse(JSON.parse(JSON.stringify(mark)))).toEqual(mark);
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
        kind: 'data',
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
