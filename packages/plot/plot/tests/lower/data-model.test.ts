import { describe, expect, it } from 'vitest';
import { PlotFieldType, type PlotSpec, PlotSpecSchema } from '../../src/schemas';
import { inferFieldType, isIsoDateString, resolveFieldTypes } from '../../src/features';
import { collectSourceFields } from '../../src/pipeline/source-fields';

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
    marks: [{ type: 'path', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
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

  it('infer_continuous_from_number', () => {
    expect(inferFieldType(rowsOf(1, 2, 3.5), 'f')).toBe(PlotFieldType.Continuous);
  });

  it('infer_categorical_from_string', () => {
    expect(inferFieldType(rowsOf('apple', 'banana'), 'f')).toBe(PlotFieldType.Categorical);
  });

  // 边界
  it('temporal_guard_rejects_bare_number', () => {
    // 数值 5 → continuous；数字串 '5' → categorical（绝不误判 temporal）
    expect(inferFieldType(rowsOf(5, 6), 'f')).toBe(PlotFieldType.Continuous);
    expect(inferFieldType(rowsOf('5', '6'), 'f')).toBe(PlotFieldType.Categorical);
    // YYYY/MM/DD 非严格 ISO → categorical
    expect(inferFieldType(rowsOf('2024/01/01'), 'f')).toBe(PlotFieldType.Categorical);
    // 无时区 datetime → categorical（拒模糊本地时间）
    expect(inferFieldType(rowsOf('2024-01-01T08:30:00'), 'f')).toBe(PlotFieldType.Categorical);
  });

  it('empty_or_all_null_field', () => {
    expect(inferFieldType(rowsOf(null, undefined), 'f')).toBe(PlotFieldType.Categorical);
    expect(inferFieldType([], 'f')).toBe(PlotFieldType.Categorical);
  });

  it('mixed_types_fall_back_categorical', () => {
    expect(inferFieldType(rowsOf(1, 'two', 3), 'f')).toBe(PlotFieldType.Categorical);
  });

  it('non_scalar_values_skipped', () => {
    // 非标量（对象 / 数组）跳过，剩余数值 → continuous
    expect(inferFieldType(rowsOf({ a: 1 }, 2, 3), 'f')).toBe(PlotFieldType.Continuous);
  });

  it('sampling_dual_threshold', () => {
    // 前 1000 行全数值、第 1500 行才出现字符串 → 扫描封顶 1000，仍判 continuous
    const rows = Array.from({ length: 2000 }, (_, i) => ({ f: i < 1500 ? i : 'late-string' }));
    expect(inferFieldType(rows, 'f')).toBe(PlotFieldType.Continuous);
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

describe('collectSourceFields — 用户源字段集（ADR-01）', () => {
  it('collect_encoding_order_series', () => {
    const spec = buildSpec({
      marks: [{ type: 'path', order: 'idx', series: 'cat', encoding: { x: { field: 'month' }, y: { field: 'revenue' }, color: { field: 'cat' } } }],
    });
    const fields = collectSourceFields(spec);
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
    const fields = collectSourceFields(spec);
    expect(fields.has('month')).toBe(true);
    expect(fields.has('revenue')).toBe(true);
    expect(fields.has('product')).toBe(true);
  });

  it('derived_fields_not_collected', () => {
    // stack 输出 startField/endField、interval y0Field/y1Field 是派生字段，不应进用户源集
    const spec = buildSpec({
      transform: [{ kind: 'stack', x: 'month', y: 'revenue', startField: 'lo', endField: 'hi' }],
      marks: [{ type: 'interval', bounds: { y: { kind: 'extent', from: 'lo', to: 'hi' } }, encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
    });
    const fields = collectSourceFields(spec);
    expect(fields.has('lo')).toBe(false);
    expect(fields.has('hi')).toBe(false);
  });

  it('constant_value_channel_not_collected', () => {
    const spec = buildSpec({
      marks: [{ type: 'path', encoding: { x: { field: 'month' }, y: { field: 'revenue' }, color: { value: 'red' } } }],
    });
    expect(collectSourceFields(spec).has('red')).toBe(false);
  });

  it('collect_label_and_text_content_fields_alpha11', () => {
    // 位置 mark 的 priority-1 datum label 内容字段 + TextMark 的 text 内容字段都进用户源集（alpha.11 P1 回归）
    const spec = buildSpec({
      marks: [
        { type: 'interval', label: { content: { field: 'lbl' } }, encoding: { x: { field: 'month' }, y: { field: 'revenue' } } },
        { type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' }, text: { field: 'note' } } },
      ],
    });
    const fields = collectSourceFields(spec);
    expect(fields.has('lbl')).toBe(true);
    expect(fields.has('note')).toBe(true);
  });

  it('collect_rule_band_and_extent_fields_alpha11', () => {
    // rule band 上界 string（field）+ extent 字段进用户源集；数字常量上界不作字段
    const spec = buildSpec({
      marks: [
        { type: 'reference', encoding: { y: { field: 'lo' } }, yTo: 'hi', extentField: 'a', extentToField: 'b' },
        { type: 'reference', encoding: { y: { value: 70 } }, yTo: 90 },
      ],
    });
    const fields = collectSourceFields(spec);
    expect(fields.has('lo')).toBe(true);
    expect(fields.has('hi')).toBe(true);
    expect(fields.has('a')).toBe(true);
    expect(fields.has('b')).toBe(true);
    expect(fields.has('90')).toBe(false);
  });

  it('text_field_enters_strict_model_alpha11', () => {
    // 声明 model 时，TextMark text 引用的字段必须列入 model，否则 fail-loud（P1：之前被绕过、静默空文本）
    const spec = buildSpec({
      marks: [{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' }, text: { field: 'note' } } }],
    });
    const userFields = collectSourceFields(spec);
    expect(() => resolveFieldTypes([{ name: 'month' }, { name: 'revenue' }], [{ month: 1, revenue: 2, note: 'x' }], userFields)).toThrow(/unknown field/i);
  });

  // alpha.12 ADR-01：bin / aggregate 输入字段进、派生输出字段不进
  it('bin_inputs_in_outputs_out', () => {
    const spec = buildSpec({
      transform: [{ kind: 'bin', field: 'measurement', reduce: 'sum', reduceField: 'weight' }],
      marks: [{ type: 'interval', bounds: { x: { kind: 'extent', from: 'binStart', to: 'binEnd' } }, encoding: { y: { field: 'binValue' } } }],
    });
    const fields = collectSourceFields(spec);
    // 输入字段进
    expect(fields.has('measurement')).toBe(true);
    expect(fields.has('weight')).toBe(true);
    // 派生输出字段不进（即便被 mark 的 encoding.y / x0Field / x1Field 引用）
    expect(fields.has('binStart')).toBe(false);
    expect(fields.has('binEnd')).toBe(false);
    expect(fields.has('binValue')).toBe(false);
  });

  it('bin_custom_output_fields_not_collected', () => {
    const spec = buildSpec({
      transform: [{ kind: 'bin', field: 'm', startField: 'lo', endField: 'hi', valueField: 'n' }],
      marks: [{ type: 'interval', bounds: { x: { kind: 'extent', from: 'lo', to: 'hi' } }, encoding: { y: { field: 'n' } } }],
    });
    const fields = collectSourceFields(spec);
    expect(fields.has('m')).toBe(true);
    expect(fields.has('lo')).toBe(false);
    expect(fields.has('hi')).toBe(false);
    expect(fields.has('n')).toBe(false);
  });

  it('aggregate_inputs_in_output_out', () => {
    const spec = buildSpec({
      transform: [{ kind: 'aggregate', groupBy: ['region', 'product'], reduce: 'sum', field: 'revenue', as: 'total' }],
      marks: [{ type: 'interval', encoding: { x: { field: 'region' }, y: { field: 'total' } } }],
    });
    const fields = collectSourceFields(spec);
    expect(fields.has('region')).toBe(true);
    expect(fields.has('product')).toBe(true);
    expect(fields.has('revenue')).toBe(true);
    // 派生输出字段 as 不进（即便被 encoding.y 引用）
    expect(fields.has('total')).toBe(false);
  });

  it('aggregate_default_as_not_collected', () => {
    const spec = buildSpec({
      transform: [{ kind: 'aggregate', groupBy: ['region'], reduce: 'sum', field: 'revenue' }],
      marks: [{ type: 'interval', encoding: { x: { field: 'region' }, y: { field: 'sumRevenue' } } }],
    });
    const fields = collectSourceFields(spec);
    expect(fields.has('sumRevenue')).toBe(false);
  });

  // alpha.12 ADR-02：normalize / derive-interval / jitter 输入字段进、派生输出不进
  it('normalize_inputs_in_as_out', () => {
    const spec = buildSpec({
      transform: [{ kind: 'normalize', field: 'amount', groupBy: ['quarter'], basis: 'percent', as: 'share' }],
      marks: [{ type: 'interval', encoding: { x: { field: 'quarter' }, y: { field: 'share' } } }],
    });
    const fields = collectSourceFields(spec);
    expect(fields.has('amount')).toBe(true);
    expect(fields.has('quarter')).toBe(true);
    expect(fields.has('share')).toBe(false); // 派生输出
  });

  it('normalize_overwrite_keeps_field', () => {
    // as 缺省（原位覆盖）→ field 仍是用户源字段（被读取）
    const spec = buildSpec({
      transform: [{ kind: 'normalize', field: 'amount', groupBy: ['quarter'] }],
      marks: [{ type: 'interval', encoding: { x: { field: 'quarter' }, y: { field: 'amount' } } }],
    });
    expect(collectSourceFields(spec).has('amount')).toBe(true);
  });

  it('derive_interval_inputs_in_outputs_out', () => {
    const spec = buildSpec({
      transform: [{ kind: 'derive-interval', startFrom: 'start', endFrom: 'end', startField: 'lo', endField: 'hi' }],
      marks: [{ type: 'interval', bounds: { y: { kind: 'extent', from: 'lo', to: 'hi' } }, encoding: { x: { field: 'task' }, y: { field: 'end' } } }],
    });
    const fields = collectSourceFields(spec);
    expect(fields.has('start')).toBe(true);
    expect(fields.has('end')).toBe(true);
    expect(fields.has('lo')).toBe(false);
    expect(fields.has('hi')).toBe(false);
  });

  it('jitter_field_enters_source_set', () => {
    // jitter 原位覆盖被抖连续数值字段（读+写同字段）→ 是用户源字段，须进 strict 集
    const spec = buildSpec({
      transform: [{ kind: 'jitter', axis: 'x', xField: 'dose', amount: 0.3, seed: 1 }],
      marks: [{ type: 'point', encoding: { x: { field: 'dose' }, y: { field: 'response' } } }],
    });
    expect(collectSourceFields(spec).has('dose')).toBe(true);
  });
});

describe('resolveFieldTypes — 类型解析 + strict 校验（ADR-01）', () => {
  const rows = [{ month: '2024-01-01', revenue: 10, cat: 'A' }];

  it('model_type_overrides_inference', () => {
    // model 声明 categorical、数据是数值 → 用声明类型，不推 continuous
    const map = resolveFieldTypes([{ name: 'revenue', type: 'categorical' }], [{ revenue: 5 }], new Set(['revenue']));
    expect(map.get('revenue')).toBe(PlotFieldType.Categorical);
  });

  it('no_model_infers_all', () => {
    const map = resolveFieldTypes(undefined, rows, new Set(['month', 'revenue', 'cat']));
    expect(map.get('month')).toBe(PlotFieldType.Temporal);
    expect(map.get('revenue')).toBe(PlotFieldType.Continuous);
    expect(map.get('cat')).toBe(PlotFieldType.Categorical);
  });

  it('resolved_map_covers_all_fields', () => {
    const map = resolveFieldTypes([{ name: 'month', type: 'temporal' }, { name: 'revenue', type: 'continuous' }], rows, new Set(['month', 'revenue']));
    expect(map.size).toBe(2);
  });

  // 错误路径
  it('strict_unknown_field_throws', () => {
    expect(() => resolveFieldTypes([{ name: 'month', type: 'temporal' }], rows, new Set(['quater']))).toThrow(/unknown field/i);
  });

  it('duplicate_field_name_throws', () => {
    expect(() =>
      resolveFieldTypes([{ name: 'month', type: 'temporal' }, { name: 'month', type: 'categorical' }], rows, new Set(['month'])),
    ).toThrow(/duplicate field/i);
  });

  it('no_model_skips_reference_check', () => {
    // 无 model：引用任意字段不报错（全推断）
    expect(() => resolveFieldTypes(undefined, rows, new Set(['anything', 'whatever']))).not.toThrow();
  });
});

describe('resolveFieldTypes — 部分声明 model（type 可选，ADR-05）', () => {
  const rows = [{ month: '2024-01-01', revenue: 10, cat: 'A' }];

  it('partial_model_infers_untyped', () => {
    // month 显式 temporal、revenue 仅 name → 推断 continuous
    const map = resolveFieldTypes([{ name: 'month', type: 'temporal' }, { name: 'revenue' }], rows, new Set(['month', 'revenue']));
    expect(map.get('month')).toBe(PlotFieldType.Temporal);
    expect(map.get('revenue')).toBe(PlotFieldType.Continuous);
  });

  it('typed_field_uses_declaration_in_partial_model', () => {
    // 部分 model 里带 type 的字段用声明（不被数据推断盖）：revenue 数值但声明 categorical
    const map = resolveFieldTypes(
      [{ name: 'revenue', type: 'categorical' }, { name: 'month' }],
      [{ revenue: 5, month: '2024-01-01' }],
      new Set(['revenue', 'month']),
    );
    expect(map.get('revenue')).toBe(PlotFieldType.Categorical);
    expect(map.get('month')).toBe(PlotFieldType.Temporal);
  });

  it('name_only_satisfies_strict', () => {
    // 字段仅给 name → 满足 strict、不抛，类型推断
    expect(() => resolveFieldTypes([{ name: 'revenue' }], [{ revenue: 5 }], new Set(['revenue']))).not.toThrow();
    const map = resolveFieldTypes([{ name: 'revenue' }], [{ revenue: 5 }], new Set(['revenue']));
    expect(map.get('revenue')).toBe(PlotFieldType.Continuous);
  });

  it('all_name_only_equals_infer', () => {
    // 全 name-only model → 类型结果与无 model 推断一致
    const partial = resolveFieldTypes([{ name: 'month' }, { name: 'revenue' }, { name: 'cat' }], rows, new Set(['month', 'revenue', 'cat']));
    const inferred = resolveFieldTypes(undefined, rows, new Set(['month', 'revenue', 'cat']));
    expect(partial).toEqual(inferred);
  });

  it('name_only_empty_data_falls_categorical', () => {
    // name-only 字段数据空 → 推断默认 categorical
    const map = resolveFieldTypes([{ name: 'x' }], [], new Set(['x']));
    expect(map.get('x')).toBe(PlotFieldType.Categorical);
  });

  // 错误路径：type 可选不削弱 strict
  it('name_only_does_not_weaken_strict', () => {
    // model 仅含 name-only 字段，但引用了未列字段 → 仍抛 unknown
    expect(() => resolveFieldTypes([{ name: 'month' }], rows, new Set(['quater']))).toThrow(/unknown field/i);
  });

  it('duplicate_name_throws_regardless_of_type', () => {
    // 重名（一条带 type、一条 name-only）→ 抛 duplicate
    expect(() =>
      resolveFieldTypes([{ name: 'month', type: 'temporal' }, { name: 'month' }], rows, new Set(['month'])),
    ).toThrow(/duplicate field/i);
  });
});
