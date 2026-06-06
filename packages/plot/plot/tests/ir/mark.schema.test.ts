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
});
