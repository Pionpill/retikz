import type { IRPath, IRScope, IRStep } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '../../src/schemas';
import { type LowerPlotsOptions, lowerPlots } from '../../src/pipeline/expand';

/** 笛卡尔默认画布：x [0,2]→[0,480]，y range [300,0]（无 axis → plot area = 整图） */
const cartOpts: LowerPlotsOptions = { width: 480, height: 300 };

const expandOf = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>, options: LowerPlotsOptions): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

const firstLayer = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>, options: LowerPlotsOptions): IRScope =>
  expandOf(spec, datasets, options).children[0] as IRScope;

const collectPaths = (layer: IRScope): Array<IRPath> => {
  const out: Array<IRPath> = [];
  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'path') out.push(child as IRPath);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };
  walk(layer.children);
  return out;
};

const stepPoint = (step: IRStep): [number, number] => (step as { to: [number, number] }).to;

/** 建单 line mark 的 cartesian spec，x linear、y 为给定连续 scale 定义 */
const lineSpec = (yScale: Record<string, unknown>): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [{ type: 'linear', name: 'x' }, { ...yScale, name: 'y' }],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'path', order: 'i', encoding: { x: { field: 'i' }, y: { field: 'v' } } }],
  });

describe('scale family · log (alpha.7 ADR-01)', () => {
  // Happy path：log 映射几何中点。domain [1,100] range [300,0]：v=10 → log 中点 → y≈150
  it('log_maps_value_to_geometric_midpoint', () => {
    const data = [{ i: 0, v: 1 }, { i: 1, v: 10 }, { i: 2, v: 100 }];
    const path = collectPaths(firstLayer(lineSpec({ type: 'log' }), { d: data }, cartOpts))[0];
    const mid = stepPoint(path.children[1]);
    expect(mid[0]).toBeCloseTo(240, 6); // x linear i=1
    expect(mid[1]).toBeCloseTo(150, 6); // log 几何中点
  });

  // 边界：正值域推断（含非正值数据时仍只取正值 extent，非正点投影跳过）
  it('log_infers_positive_domain_skips_nonpositive', () => {
    const data = [{ i: 0, v: 0 }, { i: 1, v: 10 }, { i: 2, v: 100 }];
    // v=0 不可绘（log）→ 该点跳过；仍有 2 个有效顶点成线
    const path = collectPaths(firstLayer(lineSpec({ type: 'log' }), { d: data }, cartOpts))[0];
    const points = path.children.filter(s => s.kind === 'move' || s.kind === 'line');
    expect(points.length).toBe(2);
  });

  // 错误路径：显式 domain 含 0 / 负 → lowering fail-loud
  it('log_explicit_nonpositive_domain_fails_loud', () => {
    const data = [{ i: 0, v: 1 }, { i: 1, v: 10 }];
    expect(() => expandOf(lineSpec({ type: 'log', domain: [0, 100] }), { d: data }, cartOpts)).toThrow(/strictly positive/);
    expect(() => expandOf(lineSpec({ type: 'log', domain: [-1, 100] }), { d: data }, cartOpts)).toThrow(/strictly positive/);
  });
});

describe('scale family · sqrt (alpha.7 ADR-01)', () => {
  // Happy path：sqrt 映射。domain [0,4] range [300,0]：v=1 → sqrt(1)/sqrt(4)=0.5 → y≈150
  it('sqrt_maps_by_square_root', () => {
    const data = [{ i: 0, v: 0 }, { i: 1, v: 1 }, { i: 2, v: 4 }];
    const path = collectPaths(firstLayer(lineSpec({ type: 'sqrt' }), { d: data }, cartOpts))[0];
    expect(stepPoint(path.children[1])[1]).toBeCloseTo(150, 6);
  });

  it('sqrt_explicit_negative_domain_fails_loud', () => {
    const data = [{ i: 0, v: 1 }, { i: 1, v: 4 }];
    expect(() => expandOf(lineSpec({ type: 'sqrt', domain: [-1, 9] }), { d: data }, cartOpts)).toThrow(/non-negative/);
  });
});

describe('scale family · pow (alpha.7 ADR-01)', () => {
  // Happy path：pow exponent 2，domain [0,2] range [300,0]：v=1 → 1^2/2^2=0.25 → y≈225
  it('pow_exponent_two_maps_by_square', () => {
    const data = [{ i: 0, v: 0 }, { i: 1, v: 1 }, { i: 2, v: 2 }];
    const path = collectPaths(firstLayer(lineSpec({ type: 'pow', exponent: 2 }), { d: data }, cartOpts))[0];
    expect(stepPoint(path.children[1])[1]).toBeCloseTo(225, 6);
  });

  it('pow_non_integer_exponent_negative_domain_fails_loud', () => {
    const data = [{ i: 0, v: 1 }, { i: 1, v: 4 }];
    expect(() => expandOf(lineSpec({ type: 'pow', exponent: 0.5, domain: [-1, 9] }), { d: data }, cartOpts)).toThrow(/non-negative domain/);
  });

  it('pow_integer_exponent_allows_negative_domain', () => {
    const data = [{ i: 0, v: -2 }, { i: 1, v: 0 }, { i: 2, v: 2 }];
    // exponent 2（整数）允许负 domain，不抛
    expect(() => expandOf(lineSpec({ type: 'pow', exponent: 2 }), { d: data }, cartOpts)).not.toThrow();
  });
});

describe('scale family · symlog', () => {
  // Happy path：对称对数，domain 缺省 [-10, 10] 对称、range [300,0]：v=0 → symlog(0)=0 落几何中点 → y≈150
  it('symlog_maps_zero_to_midpoint', () => {
    const data = [{ i: 0, v: -10 }, { i: 1, v: 0 }, { i: 2, v: 10 }];
    const path = collectPaths(firstLayer(lineSpec({ type: 'symlog' }), { d: data }, cartOpts))[0];
    expect(stepPoint(path.children[1])[1]).toBeCloseTo(150, 6); // 对称 domain 下 0 落中点
  });

  // 边界：含零 / 负值合法（log 不能），全部成顶点不跳过
  it('symlog_admits_zero_and_negative', () => {
    const data = [{ i: 0, v: -5 }, { i: 1, v: 0 }, { i: 2, v: 5 }];
    const path = collectPaths(firstLayer(lineSpec({ type: 'symlog' }), { d: data }, cartOpts))[0];
    const points = path.children.filter(s => s.kind === 'move' || s.kind === 'line');
    expect(points.length).toBe(3);
  });
});

describe('scale family · radial', () => {
  // Happy path：面积感知半径。domain [0,4] range [300,0]：x=1 → unsquare(linear) = sqrt(67500)≈259.81
  it('radial_maps_by_area_true_radius', () => {
    const data = [{ i: 0, v: 0 }, { i: 1, v: 1 }, { i: 2, v: 4 }];
    const path = collectPaths(firstLayer(lineSpec({ type: 'radial' }), { d: data }, cartOpts))[0];
    expect(stepPoint(path.children[1])[1]).toBeCloseTo(Math.sqrt(67500), 4);
  });

  // 端到端：polar2D 玫瑰图（角向 band 类别 + 径向 radial 值）整体 lower 产出每类别一扇区，半径随值单调增
  it('radial_drives_polar_rose_radius', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'band', name: 'a' }, { type: 'radial', name: 'r' }],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r' },
      marks: [{ type: 'interval', encoding: { x: { field: 'cat' }, y: { field: 'val' } } }],
    });
    const data = [{ cat: 'A', val: 1 }, { cat: 'B', val: 4 }, { cat: 'C', val: 9 }];
    const nodes: Array<{ shape?: { type?: string; params?: Record<string, number> } }> = [];
    const walk = (children: ReadonlyArray<unknown>): void => {
      for (const child of children) {
        const node = child as { type?: string; shape?: { type?: string; params?: Record<string, number> }; children?: ReadonlyArray<unknown> };
        if (node.type === 'node') nodes.push(node);
        else if (node.type === 'scope' && node.children) walk(node.children);
      }
    };
    walk(firstLayer(spec, { d: data }, cartOpts).children);
    expect(nodes).toHaveLength(3); // 每类别一扇区
    const radii = nodes.map(node => node.shape?.params?.outerRadius ?? NaN);
    expect(nodes.every(node => node.shape?.type === 'sector')).toBe(true);
    expect(radii).toEqual([...radii].sort((a, b) => a - b)); // val 升序 → 外半径单调增
  });

  // radial allowsBaseline=true：可作 interval / area 值轴（面积编码值，玫瑰图扇区）
  it('radial_allows_interval_baseline', () => {
    const barSpec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'band', name: 'x' }, { type: 'radial', name: 'y' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'interval', encoding: { x: { field: 'cat' }, y: { field: 'v' } } }],
    });
    const data = [{ cat: 'a', v: 1 }, { cat: 'b', v: 4 }];
    expect(() => expandOf(barSpec, { d: data }, cartOpts)).not.toThrow();
  });
});

describe('scale family · L1 baseline guard (alpha.7 ADR-01)', () => {
  const barSpec = (yScale: Record<string, unknown>): PlotSpec =>
    PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'band', name: 'x' }, { ...yScale, name: 'y' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'interval', encoding: { x: { field: 'cat' }, y: { field: 'v' } } }],
    });

  const areaSpec = (yScale: Record<string, unknown>): PlotSpec =>
    PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'linear', name: 'x' }, { ...yScale, name: 'y' }],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'path', order: 'i', closure: { kind: 'baseline' }, encoding: { x: { field: 'i' }, y: { field: 'v' } } }],
    });

  // baseline guard 现按具体 scale type 报错（log / pow / sqrt / symlog 各自命名；承自定义 allowsBaseline=false 的 scale）
  const MSG = /nonlinear continuous scale \((log|pow|sqrt|symlog)\) cannot be used with interval\/area/;

  it('interval_plus_log_fails_loud', () => {
    const data = [{ cat: 'a', v: 1 }, { cat: 'b', v: 10 }];
    expect(() => expandOf(barSpec({ type: 'log' }), { d: data }, cartOpts)).toThrow(MSG);
  });

  it('area_plus_sqrt_fails_loud', () => {
    const data = [{ i: 0, v: 1 }, { i: 1, v: 4 }];
    expect(() => expandOf(areaSpec({ type: 'sqrt' }), { d: data }, cartOpts)).toThrow(MSG);
  });

  it('interval_plus_pow_fails_loud', () => {
    const data = [{ cat: 'a', v: 1 }, { cat: 'b', v: 4 }];
    expect(() => expandOf(barSpec({ type: 'pow', exponent: 2 }), { d: data }, cartOpts)).toThrow(MSG);
  });

  it('interval_plus_symlog_fails_loud', () => {
    const data = [{ cat: 'a', v: -4 }, { cat: 'b', v: 4 }];
    expect(() => expandOf(barSpec({ type: 'symlog' }), { d: data }, cartOpts)).toThrow(MSG);
  });

  // 交互：line（非 baseline mark）+ log 不被守卫拦
  it('line_plus_log_allowed', () => {
    const data = [{ i: 0, v: 1 }, { i: 1, v: 10 }];
    expect(() => expandOf(lineSpec({ type: 'log' }), { d: data }, cartOpts)).not.toThrow();
  });
});
