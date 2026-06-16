import { describe, expect, it } from 'vitest';
import { MarkSchema } from '../../src/ir/mark';

describe('MarkSchema (ADR-05)', () => {
  // Happy path
  it('mark_point_valid', () => {
    const m = { type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_line_with_order_valid', () => {
    const m = { type: 'line', id: 'trend', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  // 边界
  it('mark_line_omits_order_valid', () => {
    const m = { type: 'line', encoding: { x: { field: 'x' }, y: { field: 'y' } } };
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
    const line = { type: 'line', encoding: { x: { field: 'a' }, y: { field: 'b' } } };
    const point = { type: 'point', encoding: { x: { field: 'c' }, y: { value: 0 } } };
    expect(MarkSchema.parse(line)).toEqual(line);
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

  // ADR-05：relation（series / arrangement）
  it('mark_interval_series_dodge_valid', () => {
    const m = { type: 'interval', series: 'product', arrangement: 'dodge', encoding: { x: { field: 'm' }, y: { field: 'r' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_stack_valid', () => {
    const m = { type: 'interval', series: 'product', arrangement: 'stack', y0Field: 'lo', y1Field: 'hi', encoding: { x: { field: 'm' }, y: { field: 'r' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_arrangement_bad_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'interval', arrangement: 'pile', encoding: { x: { field: 'm' }, y: { field: 'r' } } })).toThrow();
  });

  it('mark_line_series_valid', () => {
    const m = { type: 'line', series: 'city', order: 't', encoding: { x: { field: 't' }, y: { field: 'v' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  // ADR-02：sector(pie / donut) mark
  it('mark_sector_valid', () => {
    const m = { type: 'sector', encoding: { color: { field: 'label' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_sector_omits_fields_uses_defaults', () => {
    // startField / endField 可选：缺省语义 y0 / y1（schema 不写入默认值，仅解析通过）
    const m = { type: 'sector', encoding: { color: { field: 'label' } } };
    const parsed = MarkSchema.parse(m);
    expect(parsed).not.toHaveProperty('startField');
    expect(parsed).not.toHaveProperty('endField');
  });

  it('mark_sector_custom_bound_fields_valid', () => {
    const m = { type: 'sector', startField: 'lo', endField: 'hi', encoding: { color: { field: 'label' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_sector_with_id_valid', () => {
    const m = { type: 'sector', id: 'pie', encoding: { color: { field: 'label' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_sector_union_discriminates', () => {
    // discriminated union 按 type 判别到 sector 分支（保留 startField，不与 interval 字段混淆）
    const parsed = MarkSchema.parse({ type: 'sector', startField: 'lo', encoding: { color: { value: '#333' } } });
    expect(parsed.type).toBe('sector');
    expect((parsed as { startField?: string }).startField).toBe('lo');
  });

  it('mark_sector_json_round_trip', () => {
    const m = { type: 'sector', startField: 'y0', endField: 'y1', encoding: { color: { field: 'label' } } };
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });

  it('mark_sector_missing_encoding_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'sector' })).toThrow();
  });

  it('mark_sector_typo_type_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'sektor', encoding: { color: { field: 'label' } } })).toThrow();
  });

  it('mark_sector_empty_start_field_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'sector', startField: '', encoding: { color: { field: 'label' } } })).toThrow();
  });

  // ADR-03：area mark
  it('mark_area_minimal_valid', () => {
    // baseline / closed 省略：schema 不写入默认值，仅解析通过
    const m = { type: 'area', encoding: { x: { field: 'date' }, y: { field: 'val' } } };
    const parsed = MarkSchema.parse(m);
    expect(parsed).toEqual(m);
    expect(parsed).not.toHaveProperty('baseline');
    expect(parsed).not.toHaveProperty('closed');
  });

  it('mark_area_explicit_baseline_closed_valid', () => {
    const m = { type: 'area', order: 'date', baseline: 5, closed: true, encoding: { x: { field: 'date' }, y: { field: 'val' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_area_baseline_zero_valid', () => {
    const m = { type: 'area', baseline: 0, encoding: { x: { field: 'date' }, y: { field: 'val' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_area_series_valid', () => {
    const m = { type: 'area', series: 'city', order: 't', encoding: { x: { field: 't' }, y: { field: 'v' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_area_with_id_valid', () => {
    const m = { type: 'area', id: 'band', encoding: { x: { field: 'x' }, y: { field: 'y' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  // 错误路径：baseline 必须有限（.finite 防 Infinity 破坏 JSON round-trip）
  it('mark_area_baseline_infinity_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'area', baseline: Number.POSITIVE_INFINITY, encoding: { x: { field: 'x' }, y: { field: 'y' } } })).toThrow();
  });

  it('mark_area_baseline_nan_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'area', baseline: Number.NaN, encoding: { x: { field: 'x' }, y: { field: 'y' } } })).toThrow();
  });

  it('mark_area_missing_encoding_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'area' })).toThrow();
  });

  it('mark_area_typo_type_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'aria', encoding: { x: { field: 'x' }, y: { field: 'y' } } })).toThrow();
  });

  it('mark_area_empty_order_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'area', order: '', encoding: { x: { field: 'x' }, y: { field: 'y' } } })).toThrow();
  });

  // union 判别到 area 分支（保留 area 专属 baseline，不与别的成员混淆）
  it('mark_area_union_discriminates', () => {
    const parsed = MarkSchema.parse({ type: 'area', baseline: 2, encoding: { x: { field: 'x' }, y: { field: 'y' } } });
    expect(parsed.type).toBe('area');
    expect((parsed as { baseline?: number }).baseline).toBe(2);
  });

  it('mark_area_json_round_trip', () => {
    const m = { type: 'area', order: 'date', series: 'city', baseline: 0, closed: false, encoding: { x: { field: 'date' }, y: { field: 'val' } } };
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });

  // ADR-03：line 加 closed（雷达多边形）
  it('mark_line_closed_valid', () => {
    const m = { type: 'line', closed: true, encoding: { x: { field: 'dim' }, y: { field: 'value' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_line_closed_omitted_valid', () => {
    const m = { type: 'line', encoding: { x: { field: 'x' }, y: { field: 'y' } } };
    const parsed = MarkSchema.parse(m);
    expect(parsed).not.toHaveProperty('closed');
  });

  it('mark_line_closed_bad_type_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'line', closed: 'yes', encoding: { x: { field: 'x' }, y: { field: 'y' } } })).toThrow();
  });

  it('mark_line_closed_json_round_trip', () => {
    const m = { type: 'line', order: 'dim', closed: true, encoding: { x: { field: 'dim' }, y: { field: 'value' } } };
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });

  // alpha.7 ADR-02：size 通道仅 PointMark
  it('mark_point_with_size_field_valid', () => {
    const m = { type: 'point', encoding: { x: { field: 'lng' }, y: { field: 'lat' }, size: { field: 'pop' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_point_with_size_value_valid', () => {
    const m = { type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' }, size: { value: 6 } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_strips_size', () => {
    // size 不在 interval 的 encoding 契约里：非 strict zod 剥离（TS 层禁止作者写入）
    const parsed = MarkSchema.parse({ type: 'interval', encoding: { x: { field: 'c' }, y: { field: 'v' }, size: { field: 'p' } } });
    expect((parsed.encoding as { size?: unknown }).size).toBeUndefined();
  });

  // alpha.7 ADR-04：opacity 通道仅 PointMark
  it('mark_point_with_opacity_valid', () => {
    const m = { type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' }, opacity: { field: 'd' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_strips_opacity', () => {
    const parsed = MarkSchema.parse({ type: 'interval', encoding: { x: { field: 'c' }, y: { field: 'v' }, opacity: { field: 'd' } } });
    expect((parsed.encoding as { opacity?: unknown }).opacity).toBeUndefined();
  });

  // alpha.7 ADR-05：shape 通道仅 PointMark
  it('mark_point_with_shape_valid', () => {
    const m = { type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' }, shape: { field: 'cat' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_interval_strips_shape', () => {
    const parsed = MarkSchema.parse({ type: 'interval', encoding: { x: { field: 'c' }, y: { field: 'v' }, shape: { field: 'cat' } } });
    expect((parsed.encoding as { shape?: unknown }).shape).toBeUndefined();
  });

  // alpha.11 ADR-02：rect(heatmap) mark
  it('mark_rect_with_color_valid', () => {
    const m = { type: 'rect', encoding: { x: { field: 'rowKey' }, y: { field: 'colKey' }, color: { field: 'value', scale: 'heat' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_rect_without_color_valid', () => {
    // 缺 color → 纯网格（值映射可选）；x / y 必填性 + band 约束下放 lowering，schema 仅解析通过
    const m = { type: 'rect', encoding: { x: { field: 'day' }, y: { field: 'hour' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_rect_with_id_valid', () => {
    const m = { type: 'rect', id: 'heat', encoding: { x: { field: 'r' }, y: { field: 'c' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_rect_missing_encoding_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'rect' })).toThrow();
  });

  it('mark_rect_typo_type_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'rekt', encoding: { x: { field: 'r' }, y: { field: 'c' } } })).toThrow();
  });

  it('mark_rect_union_discriminates', () => {
    const parsed = MarkSchema.parse({ type: 'rect', encoding: { x: { field: 'r' }, y: { field: 'c' } } });
    expect(parsed.type).toBe('rect');
  });

  it('mark_rect_strips_size', () => {
    // size 仅 PointMark：rect encoding 非 strict zod 剥离
    const parsed = MarkSchema.parse({ type: 'rect', encoding: { x: { field: 'r' }, y: { field: 'c' }, size: { field: 'p' } } });
    expect((parsed.encoding as { size?: unknown }).size).toBeUndefined();
  });

  it('mark_rect_json_round_trip', () => {
    const m = { type: 'rect', id: 'heat', encoding: { x: { field: 'r' }, y: { field: 'c' }, color: { field: 'v', scale: 'heat' } } };
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });

  // alpha.11 ADR-03：rule(参考线 / 阈值带) mark
  it('mark_rule_horizontal_constant_valid', () => {
    const m = { type: 'rule', encoding: { y: { value: 80 }, color: { value: 'crimson' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_rule_vertical_field_valid', () => {
    const m = { type: 'rule', encoding: { x: { field: 'date' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_rule_per_datum_field_color_valid', () => {
    const m = { type: 'rule', encoding: { y: { field: 'threshold' }, color: { field: 'category', scale: 'c' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_rule_extent_pair_valid', () => {
    const m = { type: 'rule', extentField: 'rowLo', extentToField: 'rowHi', encoding: { x: { field: 'date' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_rule_band_constant_yTo_valid', () => {
    const m = { type: 'rule', yTo: 90, encoding: { y: { value: 70 }, color: { value: 'amber' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_rule_band_field_yTo_valid', () => {
    const m = { type: 'rule', yTo: 'hi', encoding: { y: { field: 'lo' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_rule_band_xTo_valid', () => {
    const m = { type: 'rule', xTo: 5, encoding: { x: { value: 2 } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_rule_minimal_omits_optionals', () => {
    // xTo / yTo / extent 省略：schema 不写入默认值，仅解析通过（line 形态由 lowering 判别）
    const m = { type: 'rule', encoding: { y: { value: 50 } } };
    const parsed = MarkSchema.parse(m);
    expect(parsed).not.toHaveProperty('yTo');
    expect(parsed).not.toHaveProperty('xTo');
    expect(parsed).not.toHaveProperty('extentField');
  });

  it('mark_rule_with_id_valid', () => {
    const m = { type: 'rule', id: 'avg', encoding: { y: { value: 80 } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_rule_union_discriminates', () => {
    const parsed = MarkSchema.parse({ type: 'rule', yTo: 90, encoding: { y: { value: 70 } } });
    expect(parsed.type).toBe('rule');
    expect((parsed as { yTo?: number }).yTo).toBe(90);
  });

  it('mark_rule_empty_extent_field_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'rule', extentField: '', encoding: { x: { value: 5 } } })).toThrow();
  });

  it('mark_rule_empty_string_yTo_rejected', () => {
    // yTo string 须 min(1)：空串非法
    expect(() => MarkSchema.parse({ type: 'rule', yTo: '', encoding: { y: { value: 70 } } })).toThrow();
  });

  it('mark_rule_typo_type_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'rul', encoding: { y: { value: 80 } } })).toThrow();
  });

  it('mark_rule_strips_size', () => {
    // size 仅 PointMark：rule encoding 非 strict zod 剥离
    const parsed = MarkSchema.parse({ type: 'rule', encoding: { y: { value: 80 }, size: { field: 'p' } } });
    expect((parsed.encoding as { size?: unknown }).size).toBeUndefined();
  });

  it('mark_rule_json_round_trip', () => {
    const m = { type: 'rule', id: 'tol', yTo: 'hi', extentField: 'a', extentToField: 'b', encoding: { y: { field: 'lo' }, color: { field: 'cat', scale: 'c' } } };
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });

  // alpha.11 ADR-04：text mark + 位置 mark label
  it('mark_text_union_discriminates', () => {
    const parsed = MarkSchema.parse({ type: 'text', encoding: { x: { field: 'px' }, y: { field: 'py' }, text: { field: 'label' } } });
    expect(parsed.type).toBe('text');
  });

  it('mark_text_dx_dy_valid', () => {
    const m = { type: 'text', dx: 4, dy: -8, encoding: { x: { field: 'px' }, y: { field: 'py' }, text: { value: 'lbl' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_text_missing_text_channel_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'text', encoding: { x: { field: 'px' }, y: { field: 'py' } } })).toThrow();
  });

  it('mark_text_channel_both_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'text', encoding: { x: { field: 'px' }, y: { field: 'py' }, text: { field: 'a', value: 'b' } } })).toThrow();
  });

  it('mark_text_typo_type_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'txt', encoding: { x: { field: 'px' }, y: { field: 'py' }, text: { field: 'a' } } })).toThrow();
  });

  it('mark_text_json_round_trip', () => {
    const m = { type: 'text', id: 't', dx: 2, dy: 3, encoding: { x: { field: 'px' }, y: { field: 'py' }, text: { field: 'label', format: ',.0f' }, color: { value: '#333' } } };
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });

  it('mark_interval_label_valid', () => {
    const m = { type: 'interval', label: { content: { field: 'revenue', format: ',.0f' }, position: 'above', distance: 6, pin: true }, encoding: { x: { field: 'month' }, y: { field: 'revenue' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_point_label_numeric_position_valid', () => {
    const m = { type: 'point', label: { content: { value: 'x' }, position: 30 }, encoding: { x: { field: 'px' }, y: { field: 'py' } } };
    expect(MarkSchema.parse(m)).toEqual(m);
  });

  it('mark_label_content_neither_rejected', () => {
    expect(() => MarkSchema.parse({ type: 'interval', label: { content: {} }, encoding: { x: { field: 'm' }, y: { field: 'r' } } })).toThrow();
  });

  it('mark_sector_strips_label', () => {
    // label 仅位置 mark（point/line/interval/area）；sector 非 strict zod 剥离
    const parsed = MarkSchema.parse({ type: 'sector', label: { content: { value: 'x' } }, encoding: { color: { field: 'label' } } });
    expect((parsed as { label?: unknown }).label).toBeUndefined();
  });
});
