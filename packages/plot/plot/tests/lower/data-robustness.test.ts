import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { PlotFieldType, type PlotSpec, PlotSpecSchema, ScalarValueSchema } from '../../src/ir';
import { coerceValue, normalizeRows, validateBoundData } from '../../src/lower/coerce';
import { inferFieldType } from '../../src/lower/infer';
import { type LowerPlotsOptions, lowerPlots, prepareRows } from '../../src/lower/expand';

/**
 * ADR-08 待实现字段的本地类型扩展：`LowerPlotsOptions.invalid` 现在还不存在（实现 Agent 的活），
 * 给 options 一个 `invalid?: 'skip' | 'error'` 表达「实现后该字段应存在」，让测试文件能编译。
 * 实现落地后应删除此扩展、直接用 `LowerPlotsOptions`。
 */
type RobustOptions = LowerPlotsOptions & { invalid?: 'skip' | 'error' };

/** 跑一次完整下沉（抛错路径用 expect(fn).toThrow） */
const compile = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>, options?: RobustOptions) =>
  compileToScene({ version: 1, type: 'scene', children: [spec] }, { composites: lowerPlots(datasets, options) });

/** 无 model：纯推断路径（point mark，x/y 绑 a/b） */
const specNoModel = (): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'point', encoding: { x: { field: 'a' }, y: { field: 'b' } } }],
  });

/** 有 model：x continuous / y continuous（point mark，x/y 绑 a/b） */
const specWithModel = (): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd', model: [{ name: 'a', type: 'continuous' }, { name: 'b', type: 'continuous' }] },
    scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'point', encoding: { x: { field: 'a' }, y: { field: 'b' } } }],
  });

/** 无 model + 时间字段（推断 temporal，应归一化成 epoch ms） */
const specTemporalNoModel = (): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [{ type: 'time', name: 'x' }, { type: 'linear', name: 'y' }],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'line', encoding: { x: { field: 't' }, y: { field: 'v' } } }],
  });

/** stack transform spec：分组 m + 量 v（x continuous，验证非法值被 skip 但整行仍参与 stack） */
const specStack = (): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd', model: [{ name: 'm', type: 'categorical' }, { name: 'v', type: 'continuous' }] },
    scales: [{ type: 'band', name: 'x' }, { type: 'linear', name: 'y' }],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    transform: [{ kind: 'stack', x: 'm', y: 'v' }],
    marks: [{ type: 'interval', arrangement: 'stack', encoding: { x: { field: 'm' }, y: { field: 'v' } } }],
  });

/** 直接驱动 prepareRows（绕过 transform），取 normalized 行断言归一化产物 */
const prepare = (spec: PlotSpec, rows: Array<Record<string, unknown>>, options: RobustOptions = {}) =>
  prepareRows(spec, { d: rows }, options, rows);

describe('ADR-08 数据健壮性 — bigint ingest', () => {
  it('bigint_ingested_as_continuous：无 model 下 bigint 推断 continuous 且归一化成数值', () => {
    // classify(bigint) → continuous（无 model 推断）；normalizeRows 把 42n coerce 成 42
    expect(inferFieldType([{ a: 42n }, { a: 7n }], 'a')).toBe(PlotFieldType.Continuous);
    const { fieldTypes, normalized } = prepare(specNoModel(), [{ a: 42n, b: 1n }, { a: 7n, b: 2n }]);
    expect(fieldTypes.get('a')).toBe(PlotFieldType.Continuous);
    expect(normalized[0].a).toBe(42);
    expect(normalized[1].a).toBe(7);
  });

  it('safe_integer_bigint_accepted：MAX_SAFE_INTEGER 的 bigint 被接受、转 number', () => {
    const safe = 9007199254740991n; // = Number.MAX_SAFE_INTEGER
    expect(coerceValue(safe, PlotFieldType.Continuous)).toBe(Number(safe));
    const { normalized } = prepare(specWithModel(), [{ a: safe, b: 1 }]);
    expect(normalized[0].a).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('unsafe_bigint_treated_invalid：超 safe 区间 bigint（finite 但丢精度）默认 skip 当非法值', () => {
    const unsafe = 9007199254740993n; // > MAX_SAFE_INTEGER，Number(unsafe) 仍 finite 但失精
    // coerceNumber 只收 Number.isSafeInteger(Number(value))，否则 NaN
    expect(Number.isNaN(coerceValue(unsafe, PlotFieldType.Continuous) as number)).toBe(true);
    // 默认 skip：归一化写 NaN 哨兵、不删行、不抛
    const { normalized } = prepare(specWithModel(), [{ a: unsafe, b: 1 }]);
    expect(Number.isNaN(normalized[0].a as number)).toBe(true);
  });

  it('bigint_with_model_continuous：model 声明 continuous + bigint 数据 → coerce 成 number', () => {
    const { fieldTypes, normalized } = prepare(specWithModel(), [{ a: 100n, b: 200n }]);
    expect(fieldTypes.get('a')).toBe(PlotFieldType.Continuous);
    expect(normalized[0].a).toBe(100);
    expect(normalized[0].b).toBe(200);
  });
});

describe('ADR-08 数据健壮性 — invalid 策略（skip / error）', () => {
  it('invalid_skip_default：默认 skip 遇脏值不抛，写 NaN 哨兵', () => {
    // 'abc' 非法 continuous → 默认 skip：归一化写 NaN，全链不抛
    const { normalized } = prepare(specWithModel(), [{ a: 'abc', b: 1 }, { a: 5, b: 2 }]);
    expect(Number.isNaN(normalized[0].a as number)).toBe(true);
    expect(normalized[1].a).toBe(5);
    expect(() => compile(specWithModel(), { d: [{ a: 'abc', b: 1 }, { a: 5, b: 2 }] })).not.toThrow();
  });

  it('invalid_error_throws：invalid:error 遇任一非法值全量 fail-loud', () => {
    expect(() => compile(specWithModel(), { d: [{ a: 'abc', b: 1 }, { a: 5, b: 2 }] }, { invalid: 'error' })).toThrow();
  });

  it('invalid_error_message_locates_field：error 报错指明出错字段', () => {
    // 报错信息须包含出错的字段名 "a"，把空图猜谜变明确诊断
    expect(() => compile(specWithModel(), { d: [{ a: 'oops', b: 1 }] }, { invalid: 'error' })).toThrow(/\ba\b/);
  });

  it('unsafe_bigint_error_throws：invalid:error + 超 safe 区间 bigint → fail-loud（cross-review #4）', () => {
    const unsafe = 9007199254740993n;
    expect(() => compile(specWithModel(), { d: [{ a: unsafe, b: 1 }] }, { invalid: 'error' })).toThrow();
  });

  it('invalid_error_scope_is_participating_fields：error 只校验 spec 参与字段，未引用脏字段不触发（cross-review #5）', () => {
    // spec 只参与 a / b；额外的脏字段 junk 不在 collectUserSourceFields 内 → invalid:error 不应因 junk 报错
    expect(() => compile(specWithModel(), { d: [{ a: 1, b: 2, junk: 'garbage' }, { a: 3, b: 4, junk: {} }] }, { invalid: 'error' })).not.toThrow();
  });

  it('invalid_skip_keeps_row_for_transform：非法值被 skip 但整行仍参与 stack（不删行，cross-review #5）', () => {
    // 第二行 v 非法（'x'）→ skip 写 NaN 但不删行；stack 仍把它当作一组的成员（行序 / 全行集不被破坏）
    const { normalized } = prepare(specStack(), [{ m: 'Q1', v: 3 }, { m: 'Q1', v: 'x' }, { m: 'Q1', v: 5 }]);
    expect(normalized).toHaveLength(3); // 不删行
    expect(normalized[0].v).toBe(3);
    expect(Number.isNaN(normalized[1].v as number)).toBe(true); // 哨兵，整行保留
    expect(normalized[2].v).toBe(5);
  });
});

describe('ADR-08 数据健壮性 — validateData 字段级报告', () => {
  it('validatedata_reports_field_counts：报错含字段级 invalid/missing 计数', () => {
    // 字段 a 全部非法 → validateBoundData 报错须带字段级计数（如 "field \"a\": N invalid"），不止二元 fail
    const rows = [{ a: 'bad', b: 1 }, { a: undefined, b: 2 }, { a: 'nope', b: 3 }];
    const fieldTypes = new Map([['a', PlotFieldType.Continuous], ['b', PlotFieldType.Continuous]]);
    let message = '';
    try {
      validateBoundData(rows, fieldTypes, 100);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/\ba\b/);
    // 字段级计数：报错信息须出现 invalid / missing 计数关键字（区别于旧的纯二元 "no valid values"）
    expect(message).toMatch(/invalid|missing/i);
    expect(message).toMatch(/\d+/);
  });
});

describe('ADR-08 数据健壮性 — 恒归一化（去门控）', () => {
  it('no_model_normalize_equivalent：无 model 干净数据恒归一化后产物与现状等价（防回归）', () => {
    // 干净数据（数字是数、字符串分类）：恒归一化 normalizeRows 后逐字段等于手动 coerceValue 的结果
    const spec = specNoModel();
    const rows = [{ a: 1, b: 10 }, { a: 2, b: 20 }, { a: 3, b: 30 }];
    const { fieldTypes, normalized } = prepare(spec, rows);
    const manual = normalizeRows(rows, fieldTypes);
    expect(normalized).toEqual(manual);
    // 且与现状（干净数字原样）逐字段一致
    expect(normalized[0].a).toBe(1);
    expect(normalized[2].b).toBe(30);
  });

  it('normalize_always_runs_with_inference：无 model 纯推断 → canonical 行已 coerce（time 字段成 epoch ms）', () => {
    // 无 model：t 推断 temporal，恒归一化把 ISO 串 coerce 成 epoch ms（不再走「无 model 即原始行」旧门控）
    const spec = specTemporalNoModel();
    const { fieldTypes, normalized } = prepare(spec, [{ t: '2024-01-01', v: 5 }, { t: '2024-02-01', v: 7 }]);
    expect(fieldTypes.get('t')).toBe(PlotFieldType.Temporal);
    expect(normalized[0].t).toBe(Date.parse('2024-01-01'));
    expect(normalized[1].t).toBe(Date.parse('2024-02-01'));
    expect(normalized[0].v).toBe(5);
  });
});

describe('ADR-08 数据健壮性 — resolveField 交互', () => {
  it('invalid_with_resolveField：resolveField.parse 返非法值 → 按 invalid 策略处理（skip/error 一致）', () => {
    const spec = specWithModel();
    // resolveField.parse 对 a 返回 undefined（非法）→ 归一化写哨兵；默认 skip 不抛
    const resolveField: LowerPlotsOptions['resolveField'] = field =>
      field === 'a' ? { type: PlotFieldType.Continuous, parse: () => undefined } : undefined;
    const { normalized } = prepare(spec, [{ a: 5, b: 1 }], { resolveField });
    expect(normalized[0].a).toBeUndefined(); // parse 返非法 → 哨兵
    // 同样的 resolveField 非法输出，invalid:error 应 fail-loud（skip / error 对 resolver 输出一致处理）
    expect(() => compile(spec, { d: [{ a: 5, b: 1 }] }, { resolveField, invalid: 'error' })).toThrow();
  });
});

describe('ADR-08 序列化契约 — bigint 不进 IR', () => {
  it('scalar_value_rejects_bigint：ScalarValueSchema 拒 bigint（守 JSON 可序列化红线）', () => {
    // bigint 非 JSON 可序列化（JSON.stringify(1n) 抛）；它只是 ingest 运行时输入，转 number 后才进下游，绝不进 IR 标量
    expect(() => ScalarValueSchema.parse(1n)).toThrow();
  });
});
