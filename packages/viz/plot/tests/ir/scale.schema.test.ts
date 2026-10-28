import { describe, expect, it } from 'vitest';

import { ScaleSchema } from '../../src/schemas/scale';

describe('ScaleSchema 线性', () => {
  // Happy path
  it('linear 比例尺可省略可选字段', () => {
    expect(ScaleSchema.parse({ type: 'linear', name: 'x' })).toEqual({ type: 'linear', name: 'x' });
  });

  it('比例线性完整字段有效', () => {
    const s = { type: 'linear', name: 'y', domain: [0, 100], range: [0, 480], nice: true, clamp: true };

    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('linear 比例尺可仅指定 nice', () => {
    const s = { type: 'linear', name: 'y', nice: true };

    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  // 边界
  it.each([
    ['one value', [0]],
    ['three values', [0, 1, 2]],
  ])('比例尺定义域仅接受二元元组：%s', (_name, domain) => {
    expect(() => ScaleSchema.parse({ type: 'linear', name: 'x', domain })).toThrow();
  });

  it('仅缩放范围两个元组', () => {
    expect(() => ScaleSchema.parse({ type: 'linear', name: 'x', range: [0] })).toThrow();
  });

  // 错误路径
  it('比例空名称被拒绝', () => {
    expect(() => ScaleSchema.parse({ type: 'linear', name: '' })).toThrow();
  });

  it('比例缺失类型被拒绝', () => {
    expect(() => ScaleSchema.parse({ name: 'x' })).toThrow();
  });

  it('比例未知类型被拒绝', () => {
    expect(() => ScaleSchema.parse({ type: 'bogus', name: 'x' })).toThrow();
  });
});

describe('ScaleSchema 的 log、pow 和 sqrt 定义', () => {
  // Happy path
  it('日志 schema 有效', () => {
    const s = { type: 'log', name: 'y', base: 10, nice: true };

    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('日志省略有效选项', () => {
    expect(ScaleSchema.parse({ type: 'log', name: 'y' })).toEqual({ type: 'log', name: 'y' });
  });

  it('pow schema 有效', () => {
    const s = { type: 'pow', name: 'y', exponent: 2, domain: [0, 100] };

    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('sqrt schema 有效', () => {
    const s = { type: 'sqrt', name: 'r', domain: [0, 50], range: [0, 20] };

    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  // 边界 / 错误路径（注：domain 正性是 lowering 校验，schema 仅校验结构）
  it.each([1, 0])('log 的底数必须大于 1：%s', base => {
    expect(() => ScaleSchema.parse({ type: 'log', name: 'y', base })).toThrow();
  });

  it('schema 接受的日志域否定在下沉时被拒绝', () => {
    // schema 只校验结构（两元数值元组）；正性留 lowering fail-loud
    expect(ScaleSchema.parse({ type: 'log', name: 'y', domain: [-1, 10] })).toEqual({
      type: 'log',
      name: 'y',
      domain: [-1, 10],
    });
  });

  it('pow 指数非数字被拒绝', () => {
    expect(() => ScaleSchema.parse({ type: 'pow', name: 'y', exponent: 'two' })).toThrow();
  });
});

describe('ScaleSchema 符号/径向', () => {
  it('symlog 比例尺可省略可选字段', () => {
    expect(ScaleSchema.parse({ type: 'symlog', name: 'y' })).toEqual({ type: 'symlog', name: 'y' });
  });

  it('符号日志完整字段有效', () => {
    const s = { type: 'symlog', name: 'y', domain: [-100, 100], range: [0, 480], constant: 2, nice: true, clamp: true };

    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('符号日志负域接受 schema', () => {
    // symlog 全域有定义（含零 / 负），schema 不拦负 domain
    const s = { type: 'symlog', name: 'y', domain: [-50, 50] };

    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it.each([0, -1])('symlog 的常数必须为正：%s', constant => {
    expect(() => ScaleSchema.parse({ type: 'symlog', name: 'y', constant })).toThrow();
  });

  it('径向省略选项有效', () => {
    expect(ScaleSchema.parse({ type: 'radial', name: 'r' })).toEqual({ type: 'radial', name: 'r' });
  });

  it('radial 比例尺接受完整字段配置', () => {
    const s = { type: 'radial', name: 'r', domain: [0, 50], range: [0, 120], nice: true, clamp: false };

    expect(ScaleSchema.parse(s)).toEqual(s);
  });
});

describe('ScaleSchema 带/点', () => {
  // Happy path
  it('频段 schema 有效', () => {
    const s = { type: 'band', name: 'x', domain: ['a', 'b'] };

    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('带全字段有效', () => {
    const s = { type: 'band', name: 'x', domain: ['a', 'b'], paddingInner: 0.2, paddingOuter: 0.1, align: 0 };

    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('点 schema 有效', () => {
    const s = { type: 'point', name: 'x', padding: 0.5 };

    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('带数字域有效', () => {
    // 类别可为数值（如年份）
    const s = { type: 'band', name: 'x', domain: [2021, 2022, 2023] };

    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  // 边界 / 错误路径
  it('带省略有效选项', () => {
    expect(ScaleSchema.parse({ type: 'band', name: 'x' })).toEqual({ type: 'band', name: 'x' });
  });

  it.each([1.5, -0.1])('拒绝 band 超出范围的 padding：%s', paddingInner => {
    expect(() => ScaleSchema.parse({ type: 'band', name: 'x', paddingInner })).toThrow();
  });

  it.each([
    ['boolean', [true]],
    ['object', [{}]],
  ])('拒绝 band 定义域中的无效元素：%s', (_name, domain) => {
    expect(() => ScaleSchema.parse({ type: 'band', name: 'x', domain })).toThrow();
  });
});

describe('ScaleSchema 序号', () => {
  it('序数 schema 有效', () => {
    const s = { type: 'ordinal', name: 'col' };

    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('范围有效的序数', () => {
    const s = { type: 'ordinal', name: 'col', domain: ['a', 'b'], range: ['#a', '#b'] };

    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('序数范围非字符串被拒绝', () => {
    expect(() => ScaleSchema.parse({ type: 'ordinal', name: 'col', range: [1, 2] })).toThrow();
  });

  it('拒绝序数范围空白颜色', () => {
    expect(() => ScaleSchema.parse({ type: 'ordinal', name: 'col', range: ['#fff', '   '] })).toThrow();
  });
});

describe('ScaleSchema 时间', () => {
  it('时间 schema 有效', () => {
    const s = { type: 'time', name: 'x' };

    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('域名有效的时间', () => {
    const s = { type: 'time', name: 'x', domain: [1704067200000, 1735689600000], nice: true };

    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  it('时域非数被拒绝', () => {
    expect(() => ScaleSchema.parse({ type: 'time', name: 'x', domain: ['2024', '2025'] })).toThrow();
  });
});

describe('ScaleSchema sequential 连续顺序色阶', () => {
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

  // 边界：schema 只校结构，domain 乱序（min > max）的正性 / 顺序由 lowering fail-loud
  it('schema 接受乱序 domain（顺序校验留 lowering）', () => {
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

  it('自定义 scheme 名静态通过（未注册名在 lowering 期 fail-loud）', () => {
    expect(() => ScaleSchema.parse({ type: 'sequential', name: 'col', scheme: 'brand' })).not.toThrow();
  });

  it('空 scheme 名被拒', () => {
    expect(() => ScaleSchema.parse({ type: 'sequential', name: 'col', scheme: '' })).toThrow();
  });

  it('range 非字符串被拒', () => {
    expect(() => ScaleSchema.parse({ type: 'sequential', name: 'col', range: [0, 1] })).toThrow();
  });

  it('range 必须两元组', () => {
    expect(() => ScaleSchema.parse({ type: 'sequential', name: 'col', range: ['#fff'] })).toThrow();
  });

  it('range 拒绝纯空白颜色', () => {
    expect(() => ScaleSchema.parse({ type: 'sequential', name: 'col', range: ['#fff', '   '] })).toThrow();
  });

  // JSON round-trip
  it('JSON round-trip 不丢字段', () => {
    const s = {
      type: 'sequential',
      name: 'col',
      domain: [0, 50],
      scheme: 'blues',
      range: ['#eee', '#111'],
      nice: true,
      clamp: false,
    };

    expect(ScaleSchema.parse(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});

describe('ScaleSchema diverging 连续发散色阶', () => {
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
  it('schema 接受乱序 domain（顺序校验留 lowering）', () => {
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

  it('range 拒绝纯空白颜色', () => {
    expect(() => ScaleSchema.parse({ type: 'diverging', name: 'col', range: ['#f00', '   ', '#00f'] })).toThrow();
  });

  it('自定义 scheme 名静态通过（未注册名在 lowering 期 fail-loud）', () => {
    expect(() => ScaleSchema.parse({ type: 'diverging', name: 'col', scheme: 'brand' })).not.toThrow();
  });

  it('空 scheme 名被拒', () => {
    expect(() => ScaleSchema.parse({ type: 'diverging', name: 'col', scheme: '' })).toThrow();
  });

  // JSON round-trip
  it('JSON round-trip 不丢字段', () => {
    const s = {
      type: 'diverging',
      name: 'col',
      domain: [-1, 0, 1],
      scheme: 'rdylbu',
      range: ['#a00', '#fff', '#00a'],
      nice: false,
      clamp: true,
    };

    expect(ScaleSchema.parse(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});

describe('ScaleSchema quantize 等宽离散化', () => {
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

  it('range 拒绝纯空白颜色', () => {
    expect(() => ScaleSchema.parse({ type: 'quantize', name: 'col', range: ['#fff', '   '] })).toThrow();
  });

  it('domain 必须两元组', () => {
    expect(() => ScaleSchema.parse({ type: 'quantize', name: 'col', domain: [0] })).toThrow();
    expect(() => ScaleSchema.parse({ type: 'quantize', name: 'col', domain: [0, 1, 2] })).toThrow();
  });

  it('自定义 scheme 名静态通过（未注册名在 lowering 期 fail-loud）', () => {
    expect(() => ScaleSchema.parse({ type: 'quantize', name: 'col', scheme: 'brand' })).not.toThrow();
  });

  it('空 scheme 名被拒', () => {
    expect(() => ScaleSchema.parse({ type: 'quantize', name: 'col', scheme: '' })).toThrow();
  });

  // 边界：domain 乱序结构上合法（序校验留 lowering）
  it('schema 接受乱序 domain（顺序校验留 lowering）', () => {
    const s = { type: 'quantize', name: 'col', domain: [100, 0] };

    expect(ScaleSchema.parse(s)).toEqual(s);
  });

  // JSON round-trip
  it('JSON round-trip 不丢字段', () => {
    const s = {
      type: 'quantize',
      name: 'col',
      domain: [0, 100],
      count: 4,
      scheme: 'viridis',
      range: ['#a', '#b', '#c', '#d'],
    };

    expect(ScaleSchema.parse(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  // zod 错误路径：count < 2 的 issue 落在 count
  it('zod 错误路径定位到 count', () => {
    const r = ScaleSchema.safeParse({ type: 'quantize', name: 'col', count: 1 });

    expect(r.success).toBe(false);

    if (!r.success) expect(r.error.issues[0]?.path).toContain('count');
  });
});

describe('ScaleSchema threshold 阈值离散化', () => {
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

  it('range 拒绝纯空白颜色', () => {
    expect(() =>
      ScaleSchema.parse({ type: 'threshold', name: 'col', breakpoints: [50], range: ['#fff', '   '] }),
    ).toThrow();
  });

  // 边界：断点乱序结构上合法（升序校验留 lowering）
  it('schema 接受乱序断点（升序校验留 lowering）', () => {
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

describe('ScaleSchema quantile 分位离散化', () => {
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

  it('range 拒绝纯空白颜色', () => {
    expect(() => ScaleSchema.parse({ type: 'quantile', name: 'col', range: ['#fff', '   '] })).toThrow();
  });

  it('自定义 scheme 名静态通过（未注册名在 lowering 期 fail-loud）', () => {
    expect(() => ScaleSchema.parse({ type: 'quantile', name: 'col', scheme: 'brand' })).not.toThrow();
  });

  it('空 scheme 名被拒', () => {
    expect(() => ScaleSchema.parse({ type: 'quantile', name: 'col', scheme: '' })).toThrow();
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

describe('离散化 / 连续色阶 · 非有限数值字段被 schema 拒（自 adversarial BLOCKING 提升；守 IR 100% JSON 可序列化）', () => {
  // Infinity 经 JSON.stringify 变 null、再 parse 失败——非有限数必须在 parse 期 fail-loud，不放进 IR
  it('threshold breakpoints 含 Infinity 被拒', () => {
    expect(() =>
      ScaleSchema.parse({
        type: 'threshold',
        name: 'col',
        breakpoints: [60, Number.POSITIVE_INFINITY],
        range: ['#111', '#888', '#eee'],
      }),
    ).toThrow();
  });

  it('quantize domain 含 Infinity 被拒', () => {
    expect(() =>
      ScaleSchema.parse({ type: 'quantize', name: 'col', domain: [0, Number.POSITIVE_INFINITY], count: 3 }),
    ).toThrow();
  });

  it('sequential domain 含 -Infinity 被拒', () => {
    expect(() =>
      ScaleSchema.parse({ type: 'sequential', name: 'col', domain: [Number.NEGATIVE_INFINITY, 100] }),
    ).toThrow();
  });

  it('diverging domain 含 Infinity 被拒', () => {
    expect(() =>
      ScaleSchema.parse({ type: 'diverging', name: 'col', domain: [-100, 0, Number.POSITIVE_INFINITY] }),
    ).toThrow();
  });
});

describe('ScaleSchema 位置域填充', () => {
  it.each([
    ['range number', 0.25],
    ['range object without kind', { lower: 12 }],
    ['explicit range object', { kind: 'range', upper: 8 }],
    ['explicit ratio object', { kind: 'ratio', lower: 0.1, upper: 0.2 }],
  ])('通过解析和 JSON 往返保留 %s', (_name, domainPadding) => {
    const source = { type: 'linear', name: 'x', domainPadding, singleValueSpan: 2 };

    expect(ScaleSchema.parse(JSON.parse(JSON.stringify(source)))).toEqual(source);
  });

  it.each([
    ['empty object', {}],
    ['kind-only range object', { kind: 'range' }],
    ['kind-only ratio object', { kind: 'ratio' }],
    ['unknown kind', { kind: 'pixels', lower: 1 }],
    ['negative number', -0.1],
    ['negative range side', { kind: 'range', upper: -0.1 }],
    ['non-finite range side', { kind: 'range', lower: Number.POSITIVE_INFINITY }],
    ['ratio equal to one', { kind: 'ratio', lower: 1 }],
    ['ratio above one', { kind: 'ratio', upper: 1.1 }],
  ])('拒绝 %s', (_name, domainPadding) => {
    expect(ScaleSchema.safeParse({ type: 'linear', name: 'x', domainPadding }).success).toBe(false);
  });

  it.each([
    ['lower', { kind: 'ratio', lower: 1 }],
    ['upper', { kind: 'ratio', upper: 1 }],
  ])('在 %s 侧找到无效的比率', (side, domainPadding) => {
    const result = ScaleSchema.safeParse({ type: 'linear', name: 'x', domainPadding });

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['domainPadding', side]);
  });

  it('单值跨度必须为正', () => {
    expect(() => ScaleSchema.parse({ type: 'linear', name: 'x', singleValueSpan: 0 })).toThrow();
  });
});
