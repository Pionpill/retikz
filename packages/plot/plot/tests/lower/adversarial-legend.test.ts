import { ChildSchema, type IRChild, type IRNode, type IRScope, compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { type LowerPlotsOptions, lowerPlots } from '../../src/lower/expand';

/**
 * ADR-03 legend guide 对抗测试（Adversarial Bug Hunter）。
 *
 * 目标：用 LLM 真实 / 边角会生成的 plot IR JSON 让 legend lowering 抛意外 / 返回坏结果 /
 * 产出不可序列化或非有限数 IR。只构造输入、不改实现。
 */

type Datasets = Record<string, Array<Record<string, unknown>>>;

const expandOf = (spec: PlotSpec, datasets: Datasets, options: LowerPlotsOptions = { width: 480, height: 300 }): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

const isScope = (child: IRChild): child is IRScope => child.type === 'scope';
const isNode = (child: IRChild): child is IRNode => child.type === 'node';
/** legend swatch / glyph / ramp Node（shape rectangle 等，无 text）；标签 Node 有 text */
const swatchNodesOf = (scope: IRScope): Array<IRNode> => scope.children.filter(isNode).filter(node => node.text === undefined);
const labelNodesOf = (scope: IRScope): Array<IRNode> => scope.children.filter(isNode).filter(node => node.text !== undefined);

const allScopes = (root: IRScope): Array<IRScope> => {
  const out: Array<IRScope> = [];
  const walk = (scope: IRScope): void => {
    for (const child of scope.children) {
      if (isScope(child)) {
        out.push(child);
        walk(child);
      }
    }
  };
  walk(root);
  return out;
};

const legendScopes = (outer: IRScope): Array<IRScope> =>
  allScopes(outer).filter(scope => typeof scope.id === 'string' && scope.id.startsWith('legend'));

/** 收集整棵子树所有数值（坐标 / offset / opacity / size 等），用于查 NaN / Infinity 泄漏 */
const collectNumbers = (value: unknown, out: Array<number>): void => {
  if (typeof value === 'number') {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectNumbers(item, out);
    return;
  }
  if (value && typeof value === 'object') {
    for (const v of Object.values(value)) collectNumbers(v, out);
  }
};

/** 整棵树是否含函数 / 不可 JSON 序列化的值 */
const hasNonJsonValue = (value: unknown): boolean => {
  if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') return true;
  if (typeof value === 'number') return !Number.isFinite(value);
  if (Array.isArray(value)) return value.some(hasNonJsonValue);
  if (value && typeof value === 'object') return Object.values(value).some(hasNonJsonValue);
  return false;
};

// ── 数据 ──────────────────────────────────────────────────────────────
const ORDINAL_ROWS = [
  { lon: 0, lat: 0, kind: 'A' },
  { lon: 1, lat: 1, kind: 'B' },
  { lon: 2, lat: 0, kind: 'C' },
];

describe('[adversarial] legend — JSON round-trip / 非有限数泄漏（攻击面 1/3）', () => {
  it('[adversarial] ramp linearGradient stops 在退化 domain（单值数据）下 offset / color 仍有限且可序列化', () => {
    // 所有 temperature 相同 → sequential domain 退化 [v, v]，span === 0
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd', model: [{ name: 'lon', type: 'continuous' }, { name: 'lat', type: 'continuous' }, { name: 't', type: 'continuous' }] },
      scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }, { type: 'sequential', name: 'c' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' }, color: { field: 't', scale: 'c' } } }],
      guides: [{ type: 'legend', channel: 'color', scale: 'c' }],
    });
    const outer = expandOf(spec, { d: [{ lon: 0, lat: 0, t: 7 }, { lon: 1, lat: 1, t: 7 }] });
    const legend = legendScopes(outer)[0];
    expect(legend).toBeDefined();
    const nums: Array<number> = [];
    collectNumbers(legend, nums);
    expect(nums.every(Number.isFinite)).toBe(true);
    expect(hasNonJsonValue(legend)).toBe(false);
    // round-trip 等价
    expect(JSON.parse(JSON.stringify(legend))).toEqual(legend);
  });

  it('[adversarial] 整个 legend 产物经 core ChildSchema 校验（IR 100% 合法且无 descriptor 泄漏）', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }, { type: 'ordinal', name: 'kc' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' }, color: { field: 'kind', scale: 'kc' } } }],
      guides: [{ type: 'legend', channel: 'color', scale: 'kc' }],
    });
    const outer = expandOf(spec, { d: ORDINAL_ROWS });
    for (const legend of legendScopes(outer)) {
      const parsed = ChildSchema.safeParse(legend);
      expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.issues)).toBe(true);
      // descriptor 字段（lowering 内部）不应泄漏进 IR
      expect(JSON.stringify(legend)).not.toContain('descriptor');
      expect(JSON.stringify(legend)).not.toContain('scaleType');
    }
  });

  it('[adversarial] 含 legend 的完整 plot 经 compileToScene 全程不抛、产 Scene', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd', model: [{ name: 'lon', type: 'continuous' }, { name: 'lat', type: 'continuous' }, { name: 't', type: 'continuous' }] },
      scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }, { type: 'sequential', name: 'c' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' }, color: { field: 't', scale: 'c' } } }],
      guides: [{ type: 'legend', channel: 'color', scale: 'c' }],
    });
    const composites = lowerPlots({ d: [{ lon: 0, lat: 0, t: 5 }, { lon: 1, lat: 1, t: 20 }] }, { width: 480, height: 300 });
    expect(() => compileToScene({ version: 1, type: 'scene', children: [spec] }, { composites })).not.toThrow();
  });
});

describe('[adversarial] legend — zod / 占位边界（攻击面 2/6/10）', () => {
  it('[adversarial] 极小画布 + right legend：plotArea 收窄不产生负宽 / NaN 坐标（或 fail-loud）', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }, { type: 'ordinal', name: 'kc' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' }, color: { field: 'kind', scale: 'kc' } } }],
      guides: [{ type: 'axis', dimension: 'x' }, { type: 'axis', dimension: 'y' }, { type: 'legend', channel: 'color', scale: 'kc', position: 'right' }],
    });
    // 画布 90×60：legend reserve 80 + axis margin 会逼近 / 超出宽度
    let outer: IRScope | undefined;
    let threw = false;
    try {
      outer = expandOf(spec, { d: ORDINAL_ROWS }, { width: 90, height: 60 });
    } catch {
      threw = true;
    }
    if (!threw && outer) {
      const nums: Array<number> = [];
      collectNumbers(outer, nums);
      expect(nums.every(Number.isFinite)).toBe(true);
      // legend band 不应有负宽 / 负高（结构性）：swatch / ramp Node 坐标 + 尺寸有限
      for (const legend of legendScopes(outer)) {
        for (const swatch of swatchNodesOf(legend)) {
          const n: Array<number> = [];
          collectNumbers(swatch, n);
          expect(n.every(Number.isFinite)).toBe(true);
        }
      }
    }
    // 要么 fail-loud（plotArea 越界抛），要么产合法有限坐标；不能静默出 NaN
    expect(true).toBe(true);
  });

  it('[adversarial] 多个 legend 同 right position 堆叠：band 不重叠失控、坐标有限', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }, { type: 'ordinal', name: 'kc' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' }, color: { field: 'kind', scale: 'kc' }, size: { field: 'lon' } } }],
      guides: [
        { type: 'legend', channel: 'color', scale: 'kc', position: 'right' },
        { type: 'legend', channel: 'size', position: 'right' },
      ],
    });
    const outer = expandOf(spec, { d: ORDINAL_ROWS });
    const legends = legendScopes(outer);
    expect(legends.length).toBe(2);
    const nums: Array<number> = [];
    collectNumbers(outer, nums);
    expect(nums.every(Number.isFinite)).toBe(true);
  });

  it('[adversarial] tickCount 非整数 / 负数被 schema 拒绝（zod 报错可定位）', () => {
    const bad = {
      namespace: 'plot', type: 'plot', data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }, { type: 'sequential', name: 'c' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' }, color: { field: 't', scale: 'c' } } }],
      guides: [{ type: 'legend', channel: 'color', scale: 'c', tickCount: -3 }],
    };
    const parsed = PlotSpecSchema.safeParse(bad);
    expect(parsed.success).toBe(false);
  });

  it('[adversarial] 拼错 channel 被 schema 拒绝', () => {
    const bad = {
      namespace: 'plot', type: 'plot', data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' } } }],
      guides: [{ type: 'legend', channel: 'colour' }],
    };
    expect(PlotSpecSchema.safeParse(bad).success).toBe(false);
  });

  it('[adversarial] legend 缺 channel 被 schema 拒绝', () => {
    const bad = {
      namespace: 'plot', type: 'plot', data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' } } }],
      guides: [{ type: 'legend' }],
    };
    expect(PlotSpecSchema.safeParse(bad).success).toBe(false);
  });
});

describe('[adversarial] legend — channel 未编码 / 消歧（攻击面 5）', () => {
  it('[adversarial] legend channel=size 但无 mark 编码 size → 应 fail-loud（可定位）', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot', type: 'plot', data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' } } }],
      guides: [{ type: 'legend', channel: 'size' }],
    });
    expect(() => expandOf(spec, { d: ORDINAL_ROWS })).toThrow(/size/);
  });

  it('[adversarial] legend channel=color 但无任何 color 编码 → fail-loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot', type: 'plot', data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' } } }],
      guides: [{ type: 'legend', channel: 'color' }],
    });
    expect(() => expandOf(spec, { d: ORDINAL_ROWS })).toThrow();
  });

  it('[adversarial] legend.scale 指向存在但通道不匹配的 scale（color legend 指向 x linear scale）', () => {
    // guide.scale='x' 存在（是个 linear 位置 scale），但不是 color scale。
    const spec = PlotSpecSchema.parse({
      namespace: 'plot', type: 'plot', data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }, { type: 'ordinal', name: 'kc' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' }, color: { field: 'kind', scale: 'kc' } } }],
      guides: [{ type: 'legend', channel: 'color', scale: 'x' }],
    });
    // 期望：要么 fail-loud（scale 类型不符），要么产出无 field 的退化 swatch；不应崩出无意义内部错误
    let result: IRScope | undefined;
    let err: unknown;
    try {
      result = expandOf(spec, { d: ORDINAL_ROWS });
    } catch (e) {
      err = e;
    }
    // 记录行为：若不抛，legend 应有限可序列化
    if (result) {
      expect(hasNonJsonValue(result)).toBe(false);
    } else {
      expect(err).toBeInstanceOf(Error);
    }
  });
});

describe('[adversarial] legend — 各 scale 形态退化 / 数值稳定（攻击面 7/8）', () => {
  it('[adversarial] threshold legend 无 range 无 scheme：分箱标签有限、可序列化', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot', type: 'plot',
      data: { reference: 'd', model: [{ name: 'lon', type: 'continuous' }, { name: 'lat', type: 'continuous' }, { name: 'v', type: 'continuous' }] },
      scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }, { type: 'threshold', name: 'c', breakpoints: [10, 20, 30] }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' }, color: { field: 'v', scale: 'c' } } }],
      guides: [{ type: 'legend', channel: 'color', scale: 'c' }],
    });
    const outer = expandOf(spec, { d: [{ lon: 0, lat: 0, v: 5 }, { lon: 1, lat: 1, v: 25 }, { lon: 2, lat: 0, v: 35 }] });
    const legend = legendScopes(outer)[0];
    expect(legend).toBeDefined();
    const labels = labelNodesOf(legend);
    // 4 档（3 断点）→ 4 区间标签
    expect(labels.length).toBe(4);
    expect(labels.every(l => typeof l.text === 'string' && l.text.length > 0)).toBe(true);
    expect(hasNonJsonValue(legend)).toBe(false);
  });

  it('[adversarial] quantize legend 全相同值（domain 退化）：分箱边界不产 NaN', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot', type: 'plot',
      data: { reference: 'd', model: [{ name: 'lon', type: 'continuous' }, { name: 'lat', type: 'continuous' }, { name: 'v', type: 'continuous' }] },
      scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }, { type: 'quantize', name: 'c' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' }, color: { field: 'v', scale: 'c' } } }],
      guides: [{ type: 'legend', channel: 'color', scale: 'c' }],
    });
    const outer = expandOf(spec, { d: [{ lon: 0, lat: 0, v: 3 }, { lon: 1, lat: 1, v: 3 }, { lon: 2, lat: 0, v: 3 }] });
    const legend = legendScopes(outer)[0];
    expect(legend).toBeDefined();
    const nums: Array<number> = [];
    collectNumbers(legend, nums);
    expect(nums.every(Number.isFinite)).toBe(true);
    const labels = labelNodesOf(legend);
    expect(labels.every(l => typeof l.text === 'string' && !l.text.includes('NaN'))).toBe(true);
  });

  it('[adversarial] ordinal legend 50 大量类别：swatch 数正确、坐标有限', () => {
    const rows = Array.from({ length: 60 }, (_u, i) => ({ lon: i, lat: i % 5, kind: `cat${i % 50}` }));
    const spec = PlotSpecSchema.parse({
      namespace: 'plot', type: 'plot', data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }, { type: 'ordinal', name: 'kc' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' }, color: { field: 'kind', scale: 'kc' } } }],
      guides: [{ type: 'legend', channel: 'color', scale: 'kc' }],
    });
    const outer = expandOf(spec, { d: rows });
    const legend = legendScopes(outer)[0];
    expect(legend).toBeDefined();
    // 50 类 → 50 swatch Node + 50 label Node
    expect(swatchNodesOf(legend).length).toBe(50);
    expect(labelNodesOf(legend).length).toBe(50);
    const nums: Array<number> = [];
    collectNumbers(legend, nums);
    expect(nums.every(Number.isFinite)).toBe(true);
  });

  it('[adversarial] size legend 单一正值（domain 退化 [0,0] 或 [0,v]）：半径有限、无 NaN', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot', type: 'plot', data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' }, size: { field: 'p' } } }],
      guides: [{ type: 'legend', channel: 'size' }],
    });
    // 所有 population 为 0 → makeSizeResolver descriptor domain [0,0]
    const outer = expandOf(spec, { d: [{ lon: 0, lat: 0, p: 0 }, { lon: 1, lat: 1, p: 0 }] });
    const legend = legendScopes(outer)[0];
    expect(legend).toBeDefined();
    const nums: Array<number> = [];
    collectNumbers(legend, nums);
    expect(nums.every(Number.isFinite)).toBe(true);
  });

  it('[adversarial] opacity legend domain 退化（span 0）：opacity 落 [0,1]', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot', type: 'plot',
      data: { reference: 'd', model: [{ name: 'lon', type: 'continuous' }, { name: 'lat', type: 'continuous' }, { name: 'o', type: 'continuous' }] },
      scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' }, opacity: { field: 'o' } } }],
      guides: [{ type: 'legend', channel: 'opacity' }],
    });
    const outer = expandOf(spec, { d: [{ lon: 0, lat: 0, o: 5 }, { lon: 1, lat: 1, o: 5 }] });
    const legend = legendScopes(outer)[0];
    expect(legend).toBeDefined();
    for (const swatch of swatchNodesOf(legend)) {
      if (swatch.fillOpacity !== undefined) {
        expect(swatch.fillOpacity).toBeGreaterThanOrEqual(0);
        expect(swatch.fillOpacity).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('[adversarial] legend — formatter 极值（攻击面 10）', () => {
  it('[adversarial] sequential ramp tickCount=1：刻度不崩、stops 仍合法', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot', type: 'plot',
      data: { reference: 'd', model: [{ name: 'lon', type: 'continuous' }, { name: 'lat', type: 'continuous' }, { name: 't', type: 'continuous' }] },
      scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }, { type: 'sequential', name: 'c' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' }, color: { field: 't', scale: 'c' } } }],
      guides: [{ type: 'legend', channel: 'color', scale: 'c', tickCount: 1 }],
    });
    const outer = expandOf(spec, { d: [{ lon: 0, lat: 0, t: 1 }, { lon: 1, lat: 1, t: 100 }] });
    const legend = legendScopes(outer)[0];
    expect(legend).toBeDefined();
    expect(hasNonJsonValue(legend)).toBe(false);
    // ramp 矩形 Node 的 linearGradient stops offset 必须落 [0,1]
    for (const swatch of swatchNodesOf(legend)) {
      const fill = swatch.fill;
      if (fill && typeof fill === 'object' && 'stops' in fill) {
        for (const stop of (fill as { stops: Array<{ offset: number }> }).stops) {
          expect(stop.offset).toBeGreaterThanOrEqual(0);
          expect(stop.offset).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('[adversarial] sequential ramp tickCount 极大（1000）：刻度不死循环 / 不爆栈', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot', type: 'plot',
      data: { reference: 'd', model: [{ name: 'lon', type: 'continuous' }, { name: 'lat', type: 'continuous' }, { name: 't', type: 'continuous' }] },
      scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }, { type: 'sequential', name: 'c' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' }, color: { field: 't', scale: 'c' } } }],
      guides: [{ type: 'legend', channel: 'color', scale: 'c', tickCount: 1000 }],
    });
    const start = Date.now();
    const outer = expandOf(spec, { d: [{ lon: 0, lat: 0, t: 0.001 }, { lon: 1, lat: 1, t: 0.002 }] });
    expect(Date.now() - start).toBeLessThan(2000);
    expect(legendScopes(outer)[0]).toBeDefined();
  });

  it('[adversarial] 超长类别名（千字符）：legend 不崩、label 文本保留', () => {
    const longName = 'x'.repeat(2000);
    const spec = PlotSpecSchema.parse({
      namespace: 'plot', type: 'plot', data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }, { type: 'ordinal', name: 'kc' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' }, color: { field: 'kind', scale: 'kc' } } }],
      guides: [{ type: 'legend', channel: 'color', scale: 'kc' }],
    });
    const outer = expandOf(spec, { d: [{ lon: 0, lat: 0, kind: longName }, { lon: 1, lat: 1, kind: 'B' }] });
    const legend = legendScopes(outer)[0];
    expect(legend).toBeDefined();
    const nums: Array<number> = [];
    collectNumbers(legend, nums);
    expect(nums.every(Number.isFinite)).toBe(true);
  });
});

describe('[adversarial] legend × 默认 axes / polar（攻击面 9）', () => {
  it('[adversarial] polar plot + legend：占位不崩、产合法 IR', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot', type: 'plot', data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'angle' }, { type: 'linear', name: 'radius' }, { type: 'ordinal', name: 'kc' }],
      coordinate: { type: 'polar2D', angle: 'angle', radius: 'radius', startAngle: 0, endAngle: 360, innerRadius: 0 },
      marks: [{ type: 'point', encoding: { x: { field: 'lon' }, y: { field: 'lat' }, color: { field: 'kind', scale: 'kc' } } }],
      guides: [{ type: 'legend', channel: 'color', scale: 'kc', position: 'right' }],
    });
    let outer: IRScope | undefined;
    expect(() => { outer = expandOf(spec, { d: ORDINAL_ROWS }); }).not.toThrow();
    if (outer) {
      const legend = legendScopes(outer)[0];
      expect(legend).toBeDefined();
      const nums: Array<number> = [];
      collectNumbers(legend, nums);
      expect(nums.every(Number.isFinite)).toBe(true);
    }
  });
});
