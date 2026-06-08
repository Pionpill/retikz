import { describe, expect, it } from 'vitest';
import { ScaleSchema } from '../../src/ir/scale';

describe('ScaleSchema (ADR-03)', () => {
  // Happy path
  it('scale_linear_omits_optionals_valid', () => {
    expect(ScaleSchema.parse({ type: 'linear', name: 'x' })).toEqual({ type: 'linear', name: 'x' });
  });

  it('scale_linear_full_fields_valid', () => {
    const s = { type: 'linear', name: 'y', domain: [0, 100], range: [0, 480], nice: true, clamp: true };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('scale_linear_nice_only_valid', () => {
    const s = { type: 'linear', name: 'y', nice: true };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  // 边界
  it('scale_domain_two_tuple_only', () => {
    expect(() => ScaleSchema.parse({ type: 'linear', name: 'x', domain: [0] })).toThrow();
    expect(() => ScaleSchema.parse({ type: 'linear', name: 'x', domain: [0, 1, 2] })).toThrow();
  });

  it('scale_range_two_tuple_only', () => {
    expect(() => ScaleSchema.parse({ type: 'linear', name: 'x', range: [0] })).toThrow();
  });

  // 错误路径
  it('scale_empty_name_rejected', () => {
    expect(() => ScaleSchema.parse({ type: 'linear', name: '' })).toThrow();
  });

  it('scale_missing_type_rejected', () => {
    expect(() => ScaleSchema.parse({ name: 'x' })).toThrow();
  });

  it('scale_unknown_type_rejected', () => {
    expect(() => ScaleSchema.parse({ type: 'bogus', name: 'x' })).toThrow();
  });
});

describe('ScaleSchema log / pow / sqrt (alpha.7 ADR-01)', () => {
  // Happy path
  it('log_schema_valid', () => {
    const s = { type: 'log', name: 'y', base: 10, nice: true };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('log_omits_optionals_valid', () => {
    expect(ScaleSchema.parse({ type: 'log', name: 'y' })).toEqual({ type: 'log', name: 'y' });
  });

  it('pow_schema_valid', () => {
    const s = { type: 'pow', name: 'y', exponent: 2, domain: [0, 100] };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('sqrt_schema_valid', () => {
    const s = { type: 'sqrt', name: 'r', domain: [0, 50], range: [0, 20] };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  // 边界 / 错误路径（注：domain 正性是 lowering 校验，schema 仅校验结构）
  it('log_base_must_be_gt_one', () => {
    expect(() => ScaleSchema.parse({ type: 'log', name: 'y', base: 1 })).toThrow();
    expect(() => ScaleSchema.parse({ type: 'log', name: 'y', base: 0 })).toThrow();
  });

  it('log_domain_negative_accepted_by_schema_rejected_at_lowering', () => {
    // schema 只校验结构（两元数值元组）；正性留 lowering fail-loud
    expect(ScaleSchema.parse({ type: 'log', name: 'y', domain: [-1, 10] })).toEqual({ type: 'log', name: 'y', domain: [-1, 10] });
  });

  it('pow_exponent_non_number_rejected', () => {
    expect(() => ScaleSchema.parse({ type: 'pow', name: 'y', exponent: 'two' })).toThrow();
  });
});

describe('ScaleSchema band / point (ADR-01)', () => {
  // Happy path
  it('band_schema_valid', () => {
    const s = { type: 'band', name: 'x', domain: ['a', 'b'] };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('band_full_fields_valid', () => {
    const s = { type: 'band', name: 'x', domain: ['a', 'b'], paddingInner: 0.2, paddingOuter: 0.1, align: 0 };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('point_schema_valid', () => {
    const s = { type: 'point', name: 'x', padding: 0.5 };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('band_numeric_domain_valid', () => {
    // 类别可为数值（如年份）
    const s = { type: 'band', name: 'x', domain: [2021, 2022, 2023] };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  // 边界 / 错误路径
  it('band_omits_optionals_valid', () => {
    expect(ScaleSchema.parse({ type: 'band', name: 'x' })).toEqual({ type: 'band', name: 'x' });
  });

  it('band_padding_out_of_range_rejected', () => {
    expect(() => ScaleSchema.parse({ type: 'band', name: 'x', paddingInner: 1.5 })).toThrow();
    expect(() => ScaleSchema.parse({ type: 'band', name: 'x', paddingInner: -0.1 })).toThrow();
  });

  it('band_domain_bad_element_rejected', () => {
    expect(() => ScaleSchema.parse({ type: 'band', name: 'x', domain: [true] })).toThrow();
    expect(() => ScaleSchema.parse({ type: 'band', name: 'x', domain: [{}] })).toThrow();
  });
});

describe('ScaleSchema ordinal (ADR-04)', () => {
  it('ordinal_schema_valid', () => {
    const s = { type: 'ordinal', name: 'col' };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('ordinal_with_range_valid', () => {
    const s = { type: 'ordinal', name: 'col', domain: ['a', 'b'], range: ['#a', '#b'] };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('ordinal_range_non_string_rejected', () => {
    expect(() => ScaleSchema.parse({ type: 'ordinal', name: 'col', range: [1, 2] })).toThrow();
  });
});

describe('ScaleSchema time (ADR-06)', () => {
  it('time_schema_valid', () => {
    const s = { type: 'time', name: 'x' };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('time_with_domain_nice_valid', () => {
    const s = { type: 'time', name: 'x', domain: [1704067200000, 1735689600000], nice: true };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('time_domain_non_number_rejected', () => {
    expect(() => ScaleSchema.parse({ type: 'time', name: 'x', domain: ['2024', '2025'] })).toThrow();
  });
});

describe('ScaleSchema sequential 连续顺序色阶（alpha.8 ADR-01）', () => {
  // Happy path
  it('省略可选字段合法', () => {
    expect(ScaleSchema.parse({ type: 'sequential', name: 'col' })).toEqual({ type: 'sequential', name: 'col' });
  });

  it('全字段合法（domain + scheme + nice + clamp）', () => {
    const s = { type: 'sequential', name: 'col', domain: [0, 100], scheme: 'viridis', nice: true, clamp: true };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('range 端点颜色合法', () => {
    const s = { type: 'sequential', name: 'col', range: ['#fff', '#000'] };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  // schema 不写 default：scheme 省略后 parse 结果不含 scheme（default 留给 lowering）
  it('scheme 省略时 parse 不注入默认值', () => {
    expect(ScaleSchema.parse({ type: 'sequential', name: 'col' })).not.toHaveProperty('scheme');
  });

  // 边界：schema 只校结构，domain 乱序（min > max）在结构上仍合法（正性 / 序由 lowering fail-loud）
  it('domain 乱序在 schema 层仍合法（序校验留 lowering）', () => {
    const s = { type: 'sequential', name: 'col', domain: [100, 0] };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  // 错误路径
  it('缺 name 被拒', () => {
    expect(() => ScaleSchema.parse({ type: 'sequential' })).toThrow();
  });

  it('空 name 被拒', () => {
    expect(() => ScaleSchema.parse({ type: 'sequential', name: '' })).toThrow();
  });

  it('domain 必须两元组（非三元 / 非单元）', () => {
    expect(() => ScaleSchema.parse({ type: 'sequential', name: 'col', domain: [0] })).toThrow();
    expect(() => ScaleSchema.parse({ type: 'sequential', name: 'col', domain: [0, 1, 2] })).toThrow();
  });

  it('未知 scheme 被拒', () => {
    expect(() => ScaleSchema.parse({ type: 'sequential', name: 'col', scheme: 'bogus' })).toThrow();
  });

  it('range 非字符串被拒', () => {
    expect(() => ScaleSchema.parse({ type: 'sequential', name: 'col', range: [0, 1] })).toThrow();
  });

  it('range 必须两元组', () => {
    expect(() => ScaleSchema.parse({ type: 'sequential', name: 'col', range: ['#fff'] })).toThrow();
  });

  // JSON round-trip
  it('JSON round-trip 不丢字段', () => {
    const s = { type: 'sequential', name: 'col', domain: [0, 50], scheme: 'blues', range: ['#eee', '#111'], nice: true, clamp: false };
    expect(ScaleSchema.parse(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});

describe('ScaleSchema diverging 连续发散色阶（alpha.8 ADR-01）', () => {
  // Happy path
  it('省略可选字段合法', () => {
    expect(ScaleSchema.parse({ type: 'diverging', name: 'col' })).toEqual({ type: 'diverging', name: 'col' });
  });

  it('全字段合法（三元 domain + scheme + nice + clamp）', () => {
    const s = { type: 'diverging', name: 'col', domain: [-100, 0, 100], scheme: 'rdbu', nice: true, clamp: true };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('range 三端点颜色合法', () => {
    const s = { type: 'diverging', name: 'col', range: ['#f00', '#eee', '#00f'] };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  // schema 不写 default：scheme 省略后 parse 结果不含 scheme（default 留给 lowering）
  it('scheme 省略时 parse 不注入默认值', () => {
    expect(ScaleSchema.parse({ type: 'diverging', name: 'col' })).not.toHaveProperty('scheme');
  });

  // 边界：domain 乱序结构上合法（low<mid<high 序校验留 lowering）
  it('domain 乱序在 schema 层仍合法（序校验留 lowering）', () => {
    const s = { type: 'diverging', name: 'col', domain: [100, 0, -100] };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  // 错误路径
  it('缺 name 被拒', () => {
    expect(() => ScaleSchema.parse({ type: 'diverging' })).toThrow();
  });

  it('domain 必须三元组（两元不够）', () => {
    expect(() => ScaleSchema.parse({ type: 'diverging', name: 'col', domain: [0, 100] })).toThrow();
    expect(() => ScaleSchema.parse({ type: 'diverging', name: 'col', domain: [0, 50, 100, 150] })).toThrow();
  });

  it('range 必须三元组', () => {
    expect(() => ScaleSchema.parse({ type: 'diverging', name: 'col', range: ['#f00', '#00f'] })).toThrow();
  });

  it('未知 scheme 被拒', () => {
    expect(() => ScaleSchema.parse({ type: 'diverging', name: 'col', scheme: 'nope' })).toThrow();
  });

  // JSON round-trip
  it('JSON round-trip 不丢字段', () => {
    const s = { type: 'diverging', name: 'col', domain: [-1, 0, 1], scheme: 'rdylbu', range: ['#a00', '#fff', '#00a'], nice: false, clamp: true };
    expect(ScaleSchema.parse(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});

describe('ScaleSchema quantize 等宽离散化（alpha.8 ADR-02）', () => {
  // Happy path
  it('省略可选字段合法（仅 type + name）', () => {
    expect(ScaleSchema.parse({ type: 'quantize', name: 'col' })).toEqual({ type: 'quantize', name: 'col' });
  });

  it('全字段合法（domain + count + scheme）', () => {
    const s = { type: 'quantize', name: 'col', domain: [0, 100], count: 5, scheme: 'blues' };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('range 显式离散色数组合法', () => {
    const s = { type: 'quantize', name: 'col', range: ['#fff', '#888', '#000'] };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  // schema 不写 default：count 省略后 parse 结果不含 count（default 留给 lowering）
  it('count 省略时 parse 不注入默认值', () => {
    expect(ScaleSchema.parse({ type: 'quantize', name: 'col' })).not.toHaveProperty('count');
  });

  // 错误路径
  it('缺 name 被拒', () => {
    expect(() => ScaleSchema.parse({ type: 'quantize' })).toThrow();
  });

  it('空 name 被拒', () => {
    expect(() => ScaleSchema.parse({ type: 'quantize', name: '' })).toThrow();
  });

  it('count < 2 被拒', () => {
    expect(() => ScaleSchema.parse({ type: 'quantize', name: 'col', count: 1 })).toThrow();
  });

  it('count 非整数被拒', () => {
    expect(() => ScaleSchema.parse({ type: 'quantize', name: 'col', count: 2.5 })).toThrow();
  });

  it('range 少于 2 元素被拒', () => {
    expect(() => ScaleSchema.parse({ type: 'quantize', name: 'col', range: ['#fff'] })).toThrow();
  });

  it('range 非字符串被拒', () => {
    expect(() => ScaleSchema.parse({ type: 'quantize', name: 'col', range: [0, 1] })).toThrow();
  });

  it('domain 必须两元组', () => {
    expect(() => ScaleSchema.parse({ type: 'quantize', name: 'col', domain: [0] })).toThrow();
    expect(() => ScaleSchema.parse({ type: 'quantize', name: 'col', domain: [0, 1, 2] })).toThrow();
  });

  it('未知 scheme 被拒', () => {
    expect(() => ScaleSchema.parse({ type: 'quantize', name: 'col', scheme: 'bogus' })).toThrow();
  });

  // 边界：domain 乱序结构上合法（序校验留 lowering）
  it('domain 乱序在 schema 层仍合法（序校验留 lowering）', () => {
    const s = { type: 'quantize', name: 'col', domain: [100, 0] };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  // JSON round-trip
  it('JSON round-trip 不丢字段', () => {
    const s = { type: 'quantize', name: 'col', domain: [0, 100], count: 4, scheme: 'viridis', range: ['#a', '#b', '#c', '#d'] };
    expect(ScaleSchema.parse(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  // zod 错误路径：count < 2 的 issue 落在 count
  it('zod 错误路径定位到 count', () => {
    const r = ScaleSchema.safeParse({ type: 'quantize', name: 'col', count: 1 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toContain('count');
  });
});

describe('ScaleSchema threshold 阈值离散化（alpha.8 ADR-02）', () => {
  // Happy path
  it('单断点合法（type + name + breakpoints）', () => {
    const s = { type: 'threshold', name: 'col', breakpoints: [50] };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('多断点 + range 合法', () => {
    const s = { type: 'threshold', name: 'col', breakpoints: [60, 80], range: ['#e74c3c', '#f1c40f', '#2ecc71'] };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('断点 + scheme 合法', () => {
    const s = { type: 'threshold', name: 'col', breakpoints: [10, 20, 30], scheme: 'reds' };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  // 错误路径：breakpoints 必填
  it('缺 breakpoints 被拒（阈值无默认）', () => {
    expect(() => ScaleSchema.parse({ type: 'threshold', name: 'col' })).toThrow();
  });

  it('空 breakpoints 数组被拒（须 ≥ 1）', () => {
    expect(() => ScaleSchema.parse({ type: 'threshold', name: 'col', breakpoints: [] })).toThrow();
  });

  it('breakpoints 非数值被拒', () => {
    expect(() => ScaleSchema.parse({ type: 'threshold', name: 'col', breakpoints: ['a', 'b'] })).toThrow();
  });

  it('缺 name 被拒', () => {
    expect(() => ScaleSchema.parse({ type: 'threshold', breakpoints: [50] })).toThrow();
  });

  it('range 少于 2 元素被拒', () => {
    expect(() => ScaleSchema.parse({ type: 'threshold', name: 'col', breakpoints: [50], range: ['#fff'] })).toThrow();
  });

  // 边界：断点乱序结构上合法（升序校验留 lowering）
  it('断点乱序在 schema 层仍合法（升序校验留 lowering）', () => {
    const s = { type: 'threshold', name: 'col', breakpoints: [80, 60] };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  // JSON round-trip
  it('JSON round-trip 不丢字段', () => {
    const s = { type: 'threshold', name: 'col', breakpoints: [60, 80], scheme: 'rdylgn', range: ['#a', '#b', '#c'] };
    expect(ScaleSchema.parse(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  // zod 错误路径：缺 breakpoints 的 issue 落在 breakpoints
  it('zod 错误路径定位到 breakpoints', () => {
    const r = ScaleSchema.safeParse({ type: 'threshold', name: 'col' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toContain('breakpoints');
  });
});

describe('ScaleSchema quantile 分位离散化（alpha.8 ADR-02）', () => {
  // Happy path
  it('省略可选字段合法（仅 type + name）', () => {
    expect(ScaleSchema.parse({ type: 'quantile', name: 'col' })).toEqual({ type: 'quantile', name: 'col' });
  });

  it('count + scheme 合法', () => {
    const s = { type: 'quantile', name: 'col', count: 4, scheme: 'viridis' };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('range 显式离散色合法', () => {
    const s = { type: 'quantile', name: 'col', range: ['#fff', '#000'] };
    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  // 关键：schema 非 strict，显式 domain 被静默 strip（不在 schema 层报错，fail-loud 留 lowering）
  it('显式 domain 被 schema 静默 strip（fail-loud 留 lowering）', () => {
    const parsed = ScaleSchema.parse({ type: 'quantile', name: 'col', domain: [0, 100] });
    expect(parsed).not.toHaveProperty('domain');
    expect(parsed).toEqual({ type: 'quantile', name: 'col' });
  });

  // 错误路径
  it('缺 name 被拒', () => {
    expect(() => ScaleSchema.parse({ type: 'quantile' })).toThrow();
  });

  it('count < 2 被拒', () => {
    expect(() => ScaleSchema.parse({ type: 'quantile', name: 'col', count: 1 })).toThrow();
  });

  it('count 非整数被拒', () => {
    expect(() => ScaleSchema.parse({ type: 'quantile', name: 'col', count: 3.3 })).toThrow();
  });

  it('range 少于 2 元素被拒', () => {
    expect(() => ScaleSchema.parse({ type: 'quantile', name: 'col', range: ['#fff'] })).toThrow();
  });

  it('未知 scheme 被拒', () => {
    expect(() => ScaleSchema.parse({ type: 'quantile', name: 'col', scheme: 'nope' })).toThrow();
  });

  // JSON round-trip
  it('JSON round-trip 不丢字段', () => {
    const s = { type: 'quantile', name: 'col', count: 4, scheme: 'magma', range: ['#a', '#b', '#c', '#d'] };
    expect(ScaleSchema.parse(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  // zod 错误路径：count < 2 的 issue 落在 count
  it('zod 错误路径定位到 count', () => {
    const r = ScaleSchema.safeParse({ type: 'quantile', name: 'col', count: 1 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toContain('count');
  });
});
