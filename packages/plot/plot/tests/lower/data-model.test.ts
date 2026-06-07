import { describe, expect, it } from 'vitest';
import { PlotFieldType, type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { inferFieldType, isIsoDateString } from '../../src/lower/infer';
import { collectUserSourceFields, resolveFieldTypes } from '../../src/lower/validate';

/** 构造最小可解析 PlotSpec（cartesian + 给定 marks / transform / model） */
const buildSpec = (overrides: Record<string, unknown>): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'line', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
    ...overrides,
  });

const rowsOf = (...values: Array<unknown>): Array<Record<string, unknown>> => values.map(v => ({ f: v }));

describe('inferFieldType — 缺省推断（ADR-01）', () => {
  // Happy path
  it('infer_temporal_from_iso', () => {
    expect(inferFieldType(rowsOf('2024-01-01', '2024-02-01'), 'f')).toBe(PlotFieldType.Temporal);
    expect(inferFieldType(rowsOf('2024-01-01T08:30:00Z'), 'f')).toBe(PlotFieldType.Temporal);
  });

  it('infer_temporal_from_date_instance', () => {
    expect(inferFieldType(rowsOf(new Date('2024-01-01'), new Date('2024-02-01')), 'f')).toBe(PlotFieldType.Temporal);
  });

  it('infer_quantitative_from_number', () => {
    expect(inferFieldType(rowsOf(1, 2, 3.5), 'f')).toBe(PlotFieldType.Quantitative);
  });

  it('infer_nominal_from_string', () => {
    expect(inferFieldType(rowsOf('apple', 'banana'), 'f')).toBe(PlotFieldType.Nominal);
  });

  // 边界
  it('temporal_guard_rejects_bare_number', () => {
    // 数值 5 → quantitative；数字串 '5' → nominal（绝不误判 temporal）
    expect(inferFieldType(rowsOf(5, 6), 'f')).toBe(PlotFieldType.Quantitative);
    expect(inferFieldType(rowsOf('5', '6'), 'f')).toBe(PlotFieldType.Nominal);
    // YYYY/MM/DD 非严格 ISO → nominal
    expect(inferFieldType(rowsOf('2024/01/01'), 'f')).toBe(PlotFieldType.Nominal);
    // 无时区 datetime → nominal（拒模糊本地时间）
    expect(inferFieldType(rowsOf('2024-01-01T08:30:00'), 'f')).toBe(PlotFieldType.Nominal);
  });

  it('empty_or_all_null_field', () => {
    expect(inferFieldType(rowsOf(null, undefined), 'f')).toBe(PlotFieldType.Nominal);
    expect(inferFieldType([], 'f')).toBe(PlotFieldType.Nominal);
  });

  it('mixed_types_fall_back_nominal', () => {
    expect(inferFieldType(rowsOf(1, 'two', 3), 'f')).toBe(PlotFieldType.Nominal);
  });

  it('non_scalar_values_skipped', () => {
    // 非标量（对象 / 数组）跳过，剩余数值 → quantitative
    expect(inferFieldType(rowsOf({ a: 1 }, 2, 3), 'f')).toBe(PlotFieldType.Quantitative);
  });

  it('sampling_dual_threshold', () => {
    // 前 1000 行全数值、第 1500 行才出现字符串 → 扫描封顶 1000，仍判 quantitative
    const rows = Array.from({ length: 2000 }, (_, i) => ({ f: i < 1500 ? i : 'late-string' }));
    expect(inferFieldType(rows, 'f')).toBe(PlotFieldType.Quantitative);
  });
});

describe('isIsoDateString — 严格 ISO guard（ADR-01）', () => {
  it('iso_accept_reject', () => {
    expect(isIsoDateString('2024-01-01')).toBe(true);
    expect(isIsoDateString('2024-01-01T08:30:00Z')).toBe(true);
    expect(isIsoDateString('2024-01-01T08:30:00+08:00')).toBe(true);
    expect(isIsoDateString('2024/01/01')).toBe(false);
    expect(isIsoDateString('2024-01-01T08:30:00')).toBe(false); // 无时区
    expect(isIsoDateString('5')).toBe(false);
    expect(isIsoDateString('hello')).toBe(false);
  });
});

describe('collectUserSourceFields — 用户源字段集（ADR-01）', () => {
  it('collect_encoding_order_series', () => {
    const spec = buildSpec({
      marks: [{ type: 'line', order: 'idx', series: 'cat', encoding: { x: { field: 'month' }, y: { field: 'revenue' }, color: { field: 'cat' } } }],
    });
    const fields = collectUserSourceFields(spec);
    expect(fields.has('month')).toBe(true);
    expect(fields.has('revenue')).toBe(true);
    expect(fields.has('idx')).toBe(true);
    expect(fields.has('cat')).toBe(true);
  });

  it('collect_transform_inputs', () => {
    const spec = buildSpec({
      transform: [
        { kind: 'sort', field: 'month' },
        { kind: 'stack', x: 'month', y: 'revenue', groupBy: 'product' },
      ],
    });
    const fields = collectUserSourceFields(spec);
    expect(fields.has('month')).toBe(true);
    expect(fields.has('revenue')).toBe(true);
    expect(fields.has('product')).toBe(true);
  });

  it('derived_fields_not_collected', () => {
    // stack 输出 startField/endField、interval y0Field/y1Field 是派生字段，不应进用户源集
    const spec = buildSpec({
      transform: [{ kind: 'stack', x: 'month', y: 'revenue', startField: 'lo', endField: 'hi' }],
      marks: [{ type: 'interval', y0Field: 'lo', y1Field: 'hi', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
    });
    const fields = collectUserSourceFields(spec);
    expect(fields.has('lo')).toBe(false);
    expect(fields.has('hi')).toBe(false);
  });

  it('constant_value_channel_not_collected', () => {
    const spec = buildSpec({
      marks: [{ type: 'line', encoding: { x: { field: 'month' }, y: { field: 'revenue' }, color: { value: 'red' } } }],
    });
    expect(collectUserSourceFields(spec).has('red')).toBe(false);
  });
});

describe('resolveFieldTypes — 类型解析 + strict 校验（ADR-01）', () => {
  const rows = [{ month: '2024-01-01', revenue: 10, cat: 'A' }];

  it('model_type_overrides_inference', () => {
    // model 声明 ordinal、数据是数值 → 用声明类型，不推 quantitative
    const map = resolveFieldTypes([{ name: 'revenue', type: 'ordinal' }], [{ revenue: 5 }], new Set(['revenue']));
    expect(map.get('revenue')).toBe(PlotFieldType.Ordinal);
  });

  it('proportion_only_via_model', () => {
    const withModel = resolveFieldTypes([{ name: 'share', type: 'proportion' }], [{ share: 0.4 }], new Set(['share']));
    expect(withModel.get('share')).toBe(PlotFieldType.Proportion);
    // 无 model 同数据 → quantitative（proportion 不自动推断）
    const inferred = resolveFieldTypes(undefined, [{ share: 0.4 }], new Set(['share']));
    expect(inferred.get('share')).toBe(PlotFieldType.Quantitative);
  });

  it('no_model_infers_all', () => {
    const map = resolveFieldTypes(undefined, rows, new Set(['month', 'revenue', 'cat']));
    expect(map.get('month')).toBe(PlotFieldType.Temporal);
    expect(map.get('revenue')).toBe(PlotFieldType.Quantitative);
    expect(map.get('cat')).toBe(PlotFieldType.Nominal);
  });

  it('resolved_map_covers_all_fields', () => {
    const map = resolveFieldTypes([{ name: 'month', type: 'temporal' }, { name: 'revenue', type: 'quantitative' }], rows, new Set(['month', 'revenue']));
    expect(map.size).toBe(2);
  });

  // 错误路径
  it('strict_unknown_field_throws', () => {
    expect(() => resolveFieldTypes([{ name: 'month', type: 'temporal' }], rows, new Set(['quater']))).toThrow(/unknown field/i);
  });

  it('duplicate_field_name_throws', () => {
    expect(() =>
      resolveFieldTypes([{ name: 'month', type: 'temporal' }, { name: 'month', type: 'nominal' }], rows, new Set(['month'])),
    ).toThrow(/duplicate field/i);
  });

  it('no_model_skips_reference_check', () => {
    // 无 model：引用任意字段不报错（全推断）
    expect(() => resolveFieldTypes(undefined, rows, new Set(['anything', 'whatever']))).not.toThrow();
  });
});
