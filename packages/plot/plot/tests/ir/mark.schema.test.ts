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
    const withId = { type: 'point', id: 'p', encoding: { x: { field: 'x' } } };
    const noId = { type: 'point', encoding: { x: { field: 'x' } } };
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
});
