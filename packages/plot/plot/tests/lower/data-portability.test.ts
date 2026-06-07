import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { PlotFieldType, type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { coerceValue, normalizeRows } from '../../src/lower/coerce';
import { type LowerPlotsOptions, lowerPlots } from '../../src/lower/expand';
import { resolveFieldPath } from '../../src/lower/field';
import { createPlotLocator } from '../../src/lower/locate';
import { readSourceIndex, tagSourceIndex } from '../../src/lower/provenance';
import { applyTransforms } from '../../src/lower/transform';

/** 跑一次完整下沉（抛错路径用 expect(fn).toThrow） */
const compile = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>, options?: LowerPlotsOptions) =>
  compileToScene({ version: 1, type: 'scene', children: [spec] }, { composites: lowerPlots(datasets, options) });

const specWithModel = (): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd', model: [{ name: 'month', type: 'temporal' }, { name: 'revenue', type: 'quantitative' }] },
    scales: [{ type: 'time', name: 'x' }, { type: 'linear', name: 'y' }],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'line', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
  });

const specNoModel = (): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'point', encoding: { x: { field: 'a' }, y: { field: 'b' } } }],
  });

describe('coerceValue — 按 PlotFieldType 值强制（ADR-02）', () => {
  it('quantitative_number_and_strict_string', () => {
    expect(coerceValue(120, PlotFieldType.Quantitative)).toBe(120);
    expect(coerceValue('120', PlotFieldType.Quantitative)).toBe(120);
    expect(coerceValue(' 1.5e3 ', PlotFieldType.Quantitative)).toBe(1500);
  });

  it('quantitative_rejects_dirty_strings', () => {
    for (const bad of ['', '12px', '0xFF', 'Infinity', 'NaN', 'abc']) {
      expect(Number.isNaN(coerceValue(bad, PlotFieldType.Quantitative) as number)).toBe(true);
    }
    expect(Number.isNaN(coerceValue({}, PlotFieldType.Quantitative) as number)).toBe(true);
  });

  it('proportion_out_of_range_kept', () => {
    expect(coerceValue(1.5, PlotFieldType.Proportion)).toBe(1.5);
    expect(coerceValue('-0.2', PlotFieldType.Proportion)).toBe(-0.2);
  });

  it('temporal_accepts_date_iso_epoch', () => {
    const expected = Date.parse('2024-01-01');
    expect(coerceValue('2024-01-01', PlotFieldType.Temporal)).toBe(expected);
    expect(coerceValue(new Date('2024-01-01'), PlotFieldType.Temporal)).toBe(expected);
    expect(coerceValue(expected, PlotFieldType.Temporal)).toBe(expected);
  });

  it('temporal_invalid_is_nan', () => {
    expect(Number.isNaN(coerceValue('2024/01/01', PlotFieldType.Temporal) as number)).toBe(true);
    expect(Number.isNaN(coerceValue('abc', PlotFieldType.Temporal) as number)).toBe(true);
  });

  it('nominal_keeps_string_or_number', () => {
    expect(coerceValue('north', PlotFieldType.Nominal)).toBe('north');
    expect(coerceValue(3, PlotFieldType.Nominal)).toBe(3);
    expect(coerceValue({}, PlotFieldType.Nominal)).toBeUndefined();
  });
});

describe('normalizeRows — ingest 归一化（ADR-02）', () => {
  const fieldTypes = new Map([['month', PlotFieldType.Temporal], ['revenue', PlotFieldType.Quantitative]]);

  it('identity_coerces_in_place', () => {
    const out = normalizeRows([{ month: '2024-01-01', revenue: '120' }], fieldTypes);
    expect(out[0].month).toBe(Date.parse('2024-01-01'));
    expect(out[0].revenue).toBe(120);
  });

  it('fieldmap_renames_then_coerces', () => {
    const out = normalizeRows([{ period: '2024-01-01', amount: '90' }], fieldTypes, { month: 'period', revenue: 'amount' });
    expect(out[0].month).toBe(Date.parse('2024-01-01'));
    expect(out[0].revenue).toBe(90);
  });

  it('nested_physical_path_via_fieldmap', () => {
    const out = normalizeRows([{ pricing: { amount: 42 } }], new Map([['revenue', PlotFieldType.Quantitative]]), { revenue: 'pricing.amount' });
    expect(out[0].revenue).toBe(42);
  });

  it('nested_logical_path_coerces', () => {
    // 评审 P1：点路径逻辑名归一化写扁平 key，下游 resolveFieldPath exact-first 命中 coerced 值（不再读回原始嵌套字符串）
    const out = normalizeRows([{ user: { age: '42' } }], new Map([['user.age', PlotFieldType.Quantitative]]));
    expect(out[0]['user.age']).toBe(42);
    expect(resolveFieldPath(out[0], 'user.age')).toBe(42);
  });

  it('preserves_source_index', () => {
    const tagged = tagSourceIndex([{ revenue: '5' }, { revenue: '7' }]);
    const out = normalizeRows(tagged, new Map([['revenue', PlotFieldType.Quantitative]]));
    expect(readSourceIndex(out[1])).toBe(1);
    expect(out[1].revenue).toBe(7);
  });
});

describe('coerce-before-transform（评审 P1 关键回归）', () => {
  it('numeric_string_stacks_correctly', () => {
    // 数字串先归一化成数值，再 stack 累加 → 得 8 而非 0
    const normalized = normalizeRows(
      [{ m: 'Q1', v: '3' }, { m: 'Q1', v: '5' }],
      new Map([['v', PlotFieldType.Quantitative]]),
    );
    const stacked = applyTransforms(normalized, [{ kind: 'stack', x: 'm', y: 'v' }]);
    expect(stacked[1]).toMatchObject({ y0: 3, y1: 8 });
  });
});

describe('fieldMaps 校验（ADR-02 集成）', () => {
  it('fieldmap_without_model_throws', () => {
    expect(() => compile(specNoModel(), { d: [{ a: 1, b: 2 }] }, { fieldMaps: { d: { a: 'x' } } })).toThrow(/requires data\.model/i);
  });

  it('fieldmap_unknown_logical_throws', () => {
    expect(() => compile(specWithModel(), { d: [{ month: '2024-01-01', revenue: 1 }] }, { fieldMaps: { d: { nope: 'x' } } })).toThrow(/unknown logical field/i);
  });

  it('fieldmap_unknown_dataset_throws', () => {
    expect(() => compile(specWithModel(), { d: [{ month: '2024-01-01', revenue: 1 }] }, { fieldMaps: { other: { month: 'x' } } })).toThrow(/unknown dataset/i);
  });

  it('identity_swap_same_model_compiles', () => {
    // 同名同类型换源（恒等）→ 正常下沉，不抛
    expect(() => compile(specWithModel(), { d: [{ month: '2024-01-01', revenue: 10 }, { month: '2024-02-01', revenue: 14 }] })).not.toThrow();
  });

  it('fieldmap_rename_compiles', () => {
    const renamed = compile(specWithModel(), { d: [{ period: '2024-01-01', amount: 10 }] }, { fieldMaps: { d: { month: 'period', revenue: 'amount' } } });
    expect(renamed).toBeTruthy();
  });
});

describe('validateData（ADR-02）', () => {
  it('off_by_default_missing_field_no_throw', () => {
    // 默认不校验绑定数据：字段缺失只是空图，不抛
    expect(() => compile(specWithModel(), { d: [{ wrong: 1 }] })).not.toThrow();
  });

  it('on_throws_when_field_absent', () => {
    expect(() => compile(specWithModel(), { d: [{ wrong: 1 }] }, { validateData: true })).toThrow(/no valid values/i);
  });
});

describe('locator fieldMaps parity（评审 P2）', () => {
  it('locator_build_throws_like_render', () => {
    // 同 spec+options：render 抛 unknown logical field → locator build 也抛（不再静默返回结果）
    expect(() => createPlotLocator(specWithModel(), { d: [{ month: '2024-01-01', revenue: 1 }] }, { fieldMaps: { d: { nope: 'x' } } })).toThrow(/unknown logical field/i);
  });

  it('locator_build_throws_fieldmap_without_model', () => {
    expect(() => createPlotLocator(specNoModel(), { d: [{ a: 1, b: 2 }] }, { fieldMaps: { d: { a: 'x' } } })).toThrow(/requires data\.model/i);
  });
});
