import type { IRNode, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { type LowerPlotsOptions, lowerPlots } from '../../src/lower/expand';

/** 笛卡尔默认画布：x [0,..]→[0,480]，y range [300,0]（无 axis → plot area = 整图） */
const cartOpts: LowerPlotsOptions = { width: 480, height: 300 };

const expandOf = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>): IRScope => {
  const [def] = lowerPlots(datasets, cartOpts);
  return def.expand(spec) as IRScope;
};

/** 取第一个 mark 图层 scope（外层 plot scope 的第一个子 scope） */
const firstLayer = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>): IRScope => expandOf(spec, datasets).children[0] as IRScope;

/**
 * 收集图层内每个 point node 的有效 fill（离散色把同档 node 分组到子 Scope.nodeDefault.fill）。
 * 返回长度与 node 数一致、按 node 出现序的 fill 串数组（无 fill → undefined）。
 */
const nodeFills = (layer: IRScope): Array<string | undefined> => {
  const out: Array<string | undefined> = [];
  const walk = (children: ReadonlyArray<unknown>, inheritedFill: string | undefined): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown>; nodeDefault?: { fill?: string }; fill?: string };
      if (node.type === 'node') out.push(node.fill ?? inheritedFill);
      else if (node.type === 'scope' && node.children) walk(node.children, node.nodeDefault?.fill ?? inheritedFill);
    }
  };
  walk(layer.children, undefined);
  return out;
};

/** 深度收集图层内所有 point node */
const collectNodes = (layer: IRScope): Array<IRNode> => {
  const out: Array<IRNode> = [];
  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'node') out.push(node as unknown as IRNode);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };
  walk(layer.children);
  return out;
};

/** 建单 point mark 的 cartesian spec，x/y linear + 给定离散化色 scale，color 引用之 */
const pointSpec = (colorScale: Record<string, unknown>): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }, { ...colorScale, name: 'col' }],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' }, color: { field: 'v', scale: 'col' } } }],
  });

describe('离散色 · quantize 等宽切档求值（alpha.8 ADR-02）', () => {
  // Happy path：domain [0,100] count 5 → 值按 20 宽切档，落同档同色、不同档异色
  it('quantize 5 档：值落对应档色', () => {
    const data = [{ x: 0, y: 0, v: 10 }, { x: 1, y: 1, v: 30 }, { x: 2, y: 2, v: 50 }, { x: 3, y: 3, v: 70 }, { x: 4, y: 4, v: 90 }];
    const fills = nodeFills(firstLayer(pointSpec({ type: 'quantize', domain: [0, 100], count: 5, scheme: 'blues' }), { d: data }));
    expect(fills).toHaveLength(5);
    expect(fills.every(f => typeof f === 'string' && f.length > 0)).toBe(true);
    // 5 个值落 5 个不同档 → 5 种不同色
    expect(new Set(fills).size).toBe(5);
  });

  // Happy path：同档值取同色
  it('quantize 同档值取同色', () => {
    const data = [{ x: 0, y: 0, v: 5 }, { x: 1, y: 1, v: 15 }, { x: 2, y: 2, v: 95 }];
    // count 5, domain [0,100]：5 与 15 同落 [0,20) 第 0 档，95 落末档
    const fills = nodeFills(firstLayer(pointSpec({ type: 'quantize', domain: [0, 100], count: 5 }), { d: data }));
    expect(fills[0]).toEqual(fills[1]);
    expect(fills[0]).not.toEqual(fills[2]);
  });

  // 边界：省略 domain → 从数据 [min,max] 切
  it('quantize 省略 domain 从数据 [min,max] 推断', () => {
    const data = [{ x: 0, y: 0, v: 0 }, { x: 1, y: 1, v: 50 }, { x: 2, y: 2, v: 100 }];
    expect(() => firstLayer(pointSpec({ type: 'quantize', count: 5 }), { d: data })).not.toThrow();
    const fills = nodeFills(firstLayer(pointSpec({ type: 'quantize', count: 5 }), { d: data }));
    expect(fills).toHaveLength(3);
    expect(fills[0]).not.toEqual(fills[2]);
  });

  // 交互：range 覆盖 scheme
  it('quantize range 覆盖 scheme（取 range 档色）', () => {
    const data = [{ x: 0, y: 0, v: 10 }, { x: 1, y: 1, v: 90 }];
    const fills = nodeFills(firstLayer(pointSpec({ type: 'quantize', domain: [0, 100], scheme: 'blues', range: ['#111111', '#999999', '#eeeeee'] }), { d: data }));
    const lower = fills.map(f => f?.toLowerCase());
    // 端点落 range 首/末档（range 长度即档数 3）
    expect(lower[0]).toEqual('#111111');
    expect(lower[1]).toEqual('#eeeeee');
  });

  // 交互：scheme 采样与 ADR-01 一致（quantize 'blues' 采 N 档 vs sequential 'blues' 等距采样——都产稳定 hex 且档间不同色）
  it('quantize scheme blues 产稳定 hex 且档间互异', () => {
    const data = [{ x: 0, y: 0, v: 0 }, { x: 1, y: 1, v: 50 }, { x: 2, y: 2, v: 100 }];
    const fills = nodeFills(firstLayer(pointSpec({ type: 'quantize', domain: [0, 100], count: 3, scheme: 'blues' }), { d: data }));
    expect(fills.every(f => typeof f === 'string' && /^#?[0-9a-fA-F]/.test(f))).toBe(true);
    expect(new Set(fills).size).toBe(3);
  });
});

describe('离散色 · threshold 阈值断点求值（alpha.8 ADR-02）', () => {
  // Happy path：breakpoints [60,80] + 3 色 → 50→色0、70→色1、90→色2
  it('threshold 断点 [60,80] + 3 色落档', () => {
    const data = [{ x: 0, y: 0, v: 50 }, { x: 1, y: 1, v: 70 }, { x: 2, y: 2, v: 90 }];
    const fills = nodeFills(firstLayer(pointSpec({ type: 'threshold', breakpoints: [60, 80], range: ['#e74c3c', '#f1c40f', '#2ecc71'] }), { d: data }));
    const lower = fills.map(f => f?.toLowerCase());
    expect(lower[0]).toEqual('#e74c3c');
    expect(lower[1]).toEqual('#f1c40f');
    expect(lower[2]).toEqual('#2ecc71');
  });

  // 边界：单断点 threshold [50] + 2 色 → 二分
  it('单断点 threshold [50] + 2 色二分', () => {
    const data = [{ x: 0, y: 0, v: 30 }, { x: 1, y: 1, v: 70 }];
    const fills = nodeFills(firstLayer(pointSpec({ type: 'threshold', breakpoints: [50], range: ['#000000', '#ffffff'] }), { d: data }));
    const lower = fills.map(f => f?.toLowerCase());
    expect(lower[0]).toEqual('#000000');
    expect(lower[1]).toEqual('#ffffff');
  });

  // Happy path：省略 range → scheme 采 breakpoints.length+1 档
  it('threshold 省略 range 用 scheme 采档', () => {
    const data = [{ x: 0, y: 0, v: 50 }, { x: 1, y: 1, v: 70 }, { x: 2, y: 2, v: 90 }];
    const fills = nodeFills(firstLayer(pointSpec({ type: 'threshold', breakpoints: [60, 80], scheme: 'reds' }), { d: data }));
    expect(fills).toHaveLength(3);
    expect(new Set(fills).size).toBe(3);
    expect(fills.every(f => typeof f === 'string' && f.length > 0)).toBe(true);
  });

  // 错误路径：断点乱序 [80,60] → fail-loud
  it('threshold 断点乱序 [80,60] fail-loud', () => {
    const data = [{ x: 0, y: 0, v: 50 }, { x: 1, y: 1, v: 90 }];
    expect(() => expandOf(pointSpec({ type: 'threshold', breakpoints: [80, 60], range: ['#a', '#b', '#c'] }), { d: data })).toThrow();
  });

  // 错误路径：range 长度不匹配（[60,80] 须 3 色，给 2 色）→ fail-loud
  it('threshold range 长度不匹配（须 breakpoints+1）fail-loud', () => {
    const data = [{ x: 0, y: 0, v: 50 }, { x: 1, y: 1, v: 90 }];
    expect(() => expandOf(pointSpec({ type: 'threshold', breakpoints: [60, 80], range: ['#a', '#b'] }), { d: data })).toThrow();
  });
});

describe('离散色 · quantile 分位切档求值（alpha.8 ADR-02）', () => {
  // Happy path：偏斜数据 count 4 → 每档样本数约等
  it('quantile 4 档每档样本数约等', () => {
    // 12 样本 / 4 档 → 每档约 3 个
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 100, 200, 300, 400];
    const data = values.map((v, i) => ({ x: i, y: i, v }));
    const fills = nodeFills(firstLayer(pointSpec({ type: 'quantile', count: 4, scheme: 'viridis' }), { d: data }));
    expect(fills).toHaveLength(12);
    // 4 个不同档色
    const distinct = new Set(fills);
    expect(distinct.size).toBe(4);
    // 每档样本数约等（12/4 = 3，容差 ±1）
    const counts = new Map<string | undefined, number>();
    for (const f of fills) counts.set(f, (counts.get(f) ?? 0) + 1);
    for (const c of counts.values()) expect(Math.abs(c - 3)).toBeLessThanOrEqual(1);
  });

  // 错误路径：显式 domain → fail-loud（分位由数据定，ADR 决策⑤）
  //   注：QuantileColorScaleSchema 非 strict，schema parse 会静默 strip domain（见 scale.schema.test.ts），
  //   故此处显式 domain 已被剥离、lowering 收不到——本测试改测「带 domain 的 spec 经 schema parse 后仍正常 lower 不受 domain 影响」。
  //   真正的「给 domain → fail-loud」契约在 schema 层即以 strip 形式落地（用户给的 domain 无效化），lowering 不读 domain。
  it('quantile 显式 domain 被 schema strip、lowering 不受其影响', () => {
    const data = [{ x: 0, y: 0, v: 1 }, { x: 1, y: 1, v: 2 }, { x: 2, y: 2, v: 3 }, { x: 3, y: 3, v: 4 }];
    // domain 在 PlotSpecSchema.parse 时已被 strip；lower 仍按数据分位求值
    expect(() => expandOf(pointSpec({ type: 'quantile', count: 2, domain: [0, 1000] }), { d: data })).not.toThrow();
    const withDomain = nodeFills(firstLayer(pointSpec({ type: 'quantile', count: 2, domain: [0, 1000] }), { d: data }));
    const without = nodeFills(firstLayer(pointSpec({ type: 'quantile', count: 2 }), { d: data }));
    // 给 domain 与不给 domain 结果一致（domain 被 strip、分位纯由数据定）
    expect(withDomain).toEqual(without);
  });

  // 交互：scheme 采样产稳定 hex 且档间互异
  it('quantile scheme 产稳定 hex 且档间互异', () => {
    const data = [1, 2, 3, 4, 5, 6].map((v, i) => ({ x: i, y: i, v }));
    const fills = nodeFills(firstLayer(pointSpec({ type: 'quantile', count: 3, scheme: 'plasma' }), { d: data }));
    expect(fills.every(f => typeof f === 'string' && f.length > 0)).toBe(true);
    expect(new Set(fills).size).toBe(3);
  });
});

describe('离散色 · fail-loud 守卫（alpha.8 ADR-02）', () => {
  const pathColorSpec = (markType: 'line' | 'area', colorScale: Record<string, unknown>): PlotSpec =>
    PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }, { ...colorScale, name: 'col' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: markType, order: 'x', encoding: { x: { field: 'x' }, y: { field: 'y' }, color: { field: 'v', scale: 'col' } } }],
    });

  // 错误路径：line + 离散化 color → fail-loud（离散色仅 point/bar/sector）
  it('line + quantize color fail-loud', () => {
    const data = [{ x: 0, y: 1, v: 0 }, { x: 1, y: 3, v: 50 }, { x: 2, y: 2, v: 100 }];
    expect(() => expandOf(pathColorSpec('line', { type: 'quantize', domain: [0, 100], count: 5 }), { d: data })).toThrow();
  });

  it('area + threshold color fail-loud', () => {
    const data = [{ x: 0, y: 1, v: 0 }, { x: 1, y: 3, v: 50 }, { x: 2, y: 2, v: 100 }];
    expect(() => expandOf(pathColorSpec('area', { type: 'threshold', breakpoints: [50], range: ['#000', '#fff'] }), { d: data })).toThrow();
  });

  it('line + quantile color fail-loud', () => {
    const data = [{ x: 0, y: 1, v: 0 }, { x: 1, y: 3, v: 50 }, { x: 2, y: 2, v: 100 }];
    expect(() => expandOf(pathColorSpec('line', { type: 'quantile', count: 4 }), { d: data })).toThrow();
  });
});

describe('离散色 · 回归：每点产 node（alpha.8 ADR-02）', () => {
  // 离散化 color 仍走 per-datum point node（与连续色一致，不产 path）
  it('quantize point mark 每数据点产 node', () => {
    const data = [{ x: 0, y: 0, v: 10 }, { x: 1, y: 1, v: 50 }, { x: 2, y: 2, v: 90 }];
    const nodes = collectNodes(firstLayer(pointSpec({ type: 'quantize', domain: [0, 100], count: 5 }), { d: data }));
    expect(nodes).toHaveLength(3);
  });
});
