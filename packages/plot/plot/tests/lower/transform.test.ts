import { describe, expect, it } from 'vitest';
import type { ExternalRow } from '../../src/ir';
import { applyTransforms } from '../../src/lower/transform';

const SALES: Array<ExternalRow> = [
  { month: 'Jan', product: 'A', revenue: 3 },
  { month: 'Jan', product: 'B', revenue: 5 },
  { month: 'Feb', product: 'A', revenue: 2 },
  { month: 'Feb', product: 'B', revenue: 4 },
];

describe('applyTransforms (ADR-03)', () => {
  it('transform_empty_pipeline', () => {
    expect(applyTransforms(SALES)).toBe(SALES);
    expect(applyTransforms(SALES, [])).toBe(SALES);
  });

  // sort
  it('sort_ascending', () => {
    const rows = [{ m: 3 }, { m: 1 }, { m: 2 }];
    expect(applyTransforms(rows, [{ kind: 'sort', field: 'm' }]).map(r => r.m)).toEqual([1, 2, 3]);
  });

  it('sort_descending', () => {
    const rows = [{ m: 1 }, { m: 3 }, { m: 2 }];
    expect(applyTransforms(rows, [{ kind: 'sort', field: 'm', order: 'descending' }]).map(r => r.m)).toEqual([3, 2, 1]);
  });

  it('sort_stable', () => {
    const rows = [{ m: 1, tag: 'a' }, { m: 1, tag: 'b' }, { m: 0, tag: 'c' }];
    const out = applyTransforms(rows, [{ kind: 'sort', field: 'm' }]);
    expect(out.map(r => r.tag)).toEqual(['c', 'a', 'b']);
  });

  // stack
  it('stack_two_series', () => {
    const out = applyTransforms(SALES, [{ kind: 'stack', x: 'month', y: 'revenue', groupBy: 'product' }]);
    // 保持输入顺序，追加 y0/y1；Jan: A[0,3] B[3,8]；Feb: A[0,2] B[2,6]
    expect(out[0]).toMatchObject({ month: 'Jan', product: 'A', y0: 0, y1: 3 });
    expect(out[1]).toMatchObject({ month: 'Jan', product: 'B', y0: 3, y1: 8 });
    expect(out[2]).toMatchObject({ month: 'Feb', product: 'A', y0: 0, y1: 2 });
    expect(out[3]).toMatchObject({ month: 'Feb', product: 'B', y0: 2, y1: 6 });
  });

  it('stack_first_segment_zero', () => {
    const out = applyTransforms(SALES, [{ kind: 'stack', x: 'month', y: 'revenue', groupBy: 'product' }]);
    // 每组首系列 y0 = 0
    expect(out.filter(r => r.product === 'A').every(r => r.y0 === 0)).toBe(true);
  });

  it('stack_single_series', () => {
    const rows = [{ x: 'a', s: 'X', v: 5 }];
    const out = applyTransforms(rows, [{ kind: 'stack', x: 'x', y: 'v', groupBy: 's' }]);
    expect(out[0]).toMatchObject({ y0: 0, y1: 5 });
  });

  it('stack_missing_field_counts_zero', () => {
    const rows = [
      { x: 'a', s: 'A', v: 3 },
      { x: 'a', s: 'B' }, // 缺 v → 按 0
    ];
    const out = applyTransforms(rows, [{ kind: 'stack', x: 'x', y: 'v', groupBy: 's' }]);
    expect(out[1]).toMatchObject({ y0: 3, y1: 3 });
  });

  it('stack_custom_output_fields', () => {
    const rows = [{ x: 'a', s: 'A', v: 2 }];
    const out = applyTransforms(rows, [
      { kind: 'stack', x: 'x', y: 'v', groupBy: 's', startField: 'lo', endField: 'hi' },
    ]);
    expect(out[0]).toMatchObject({ lo: 0, hi: 2 });
    expect(out[0]).not.toHaveProperty('y0');
  });

  // ADR-02：泛化 stack —— 缺省 x / groupBy 的单链累积（按数据序），喂饼图
  it('stack_single_chain_accumulates_in_data_order', () => {
    const SHARE = [{ label: 'A', value: 3 }, { label: 'B', value: 5 }, { label: 'C', value: 2 }];
    const out = applyTransforms(SHARE, [{ kind: 'stack', y: 'value' }]);
    // 行序累积：A[0,3] B[3,8] C[8,10]
    expect(out[0]).toMatchObject({ label: 'A', y0: 0, y1: 3 });
    expect(out[1]).toMatchObject({ label: 'B', y0: 3, y1: 8 });
    expect(out[2]).toMatchObject({ label: 'C', y0: 8, y1: 10 });
  });

  it('stack_single_chain_custom_output_fields', () => {
    const out = applyTransforms([{ label: 'A', value: 4 }, { label: 'B', value: 6 }], [
      { kind: 'stack', y: 'value', startField: 'a0', endField: 'a1' },
    ]);
    expect(out[0]).toMatchObject({ a0: 0, a1: 4 });
    expect(out[1]).toMatchObject({ a0: 4, a1: 10 });
  });

  // pipeline
  it('pipeline_sort_then_stack', () => {
    // 先按 product 降序再堆叠 → 系列累加序随排序后的出现序（B 先于 A）
    const out = applyTransforms(SALES, [
      { kind: 'sort', field: 'product', order: 'descending' },
      { kind: 'stack', x: 'month', y: 'revenue', groupBy: 'product' },
    ]);
    const janB = out.find(r => r.month === 'Jan' && r.product === 'B');
    expect(janB).toMatchObject({ y0: 0, y1: 5 });
  });
});
