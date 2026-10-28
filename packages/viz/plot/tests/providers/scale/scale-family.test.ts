import type { IRPath, IRScope, IRStep } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { PlotsLoweringOptions } from '../../../src/pipeline/expand';
import { lowerPlotWithDataArtifact } from '../../../src/pipeline/expand/lower';
import type { IRPlot } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

/** 笛卡尔默认画布：x [0,2]→[0,480]，y range [300,0]（无 axis → plot area = 整图） */
const cartOpts: PlotsLoweringOptions = { layout: { width: 480, height: 300 } };

const expandOf = (
  spec: IRPlot,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: PlotsLoweringOptions,
): IRScope => {
  return lowerPlotWithDataArtifact(spec, datasets, { ...options, textMeasurer: measureLabel }).child as IRScope;
};

const firstLayer = (
  spec: IRPlot,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: PlotsLoweringOptions,
): IRScope => expandOf(spec, datasets, options).children[0] as IRScope;

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
const lineSpec = (yScale: Record<string, unknown>): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'x', domainPadding: 0 },
      { ...yScale, name: 'y', domainPadding: yScale.domainPadding ?? 0 },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'path', encodings: { order: 'i', position: { x: { field: 'i' }, y: { field: 'v' } } } }],
  });

describe('秤族·日志（契约）', () => {
  // Happy path：log 映射几何中点。domain [1,100] range [300,0]：v=10 → log 中点 → y≈150
  it('对数将值映射到几何中点', () => {
    const data = [
      { i: 0, v: 1 },
      { i: 1, v: 10 },
      { i: 2, v: 100 },
    ];
    const path = collectPaths(firstLayer(lineSpec({ type: 'log' }), { d: data }, cartOpts))[0];
    const mid = stepPoint(path.children[1]);

    expect(mid[0]).toBeCloseTo(240, 6); // x linear i=1
    expect(mid[1]).toBeCloseTo(150, 6); // log 几何中点
  });

  // 边界：正值域推断（含非正值数据时仍只取正值 extent，非正点投影跳过）
  it('日志推断正域跳过非正域', () => {
    const data = [
      { i: 0, v: 0 },
      { i: 1, v: 10 },
      { i: 2, v: 100 },
    ];

    // v=0 不可绘（log）→ 该点跳过；仍有 2 个有效顶点成线
    const path = collectPaths(firstLayer(lineSpec({ type: 'log' }), { d: data }, cartOpts))[0];
    const points = path.children.filter(s => s.kind === 'move' || s.kind === 'line');

    expect(points.length).toBe(2);
  });

  // 错误路径：显式 domain 含 0 / 负 → lowering fail-loud
  it('log 显式定义域包含非正数时明确报错', () => {
    const data = [
      { i: 0, v: 1 },
      { i: 1, v: 10 },
    ];

    expect(() => expandOf(lineSpec({ type: 'log', domain: [0, 100] }), { d: data }, cartOpts)).toThrow(
      /strictly positive/,
    );
    expect(() => expandOf(lineSpec({ type: 'log', domain: [-1, 100] }), { d: data }, cartOpts)).toThrow(
      /strictly positive/,
    );
  });
});

describe('比例尺系列·sqrt（契约）', () => {
  // Happy path：sqrt 映射。domain [0,4] range [300,0]：v=1 → sqrt(1)/sqrt(4)=0.5 → y≈150
  it('sqrt 按平方根映射', () => {
    const data = [
      { i: 0, v: 0 },
      { i: 1, v: 1 },
      { i: 2, v: 4 },
    ];
    const path = collectPaths(firstLayer(lineSpec({ type: 'sqrt' }), { d: data }, cartOpts))[0];

    expect(stepPoint(path.children[1])[1]).toBeCloseTo(150, 6);
  });

  it('sqrt 显式定义域包含负数时明确报错', () => {
    const data = [
      { i: 0, v: 1 },
      { i: 1, v: 4 },
    ];

    expect(() => expandOf(lineSpec({ type: 'sqrt', domain: [-1, 9] }), { d: data }, cartOpts)).toThrow(/non-negative/);
  });
});

describe('秤族·pow（契约）', () => {
  // Happy path：pow exponent 2，domain [0,2] range [300,0]：v=1 → 1^2/2^2=0.25 → y≈225
  it('战俘指数的两个平方的映射', () => {
    const data = [
      { i: 0, v: 0 },
      { i: 1, v: 1 },
      { i: 2, v: 2 },
    ];
    const path = collectPaths(firstLayer(lineSpec({ type: 'pow', exponent: 2 }), { d: data }, cartOpts))[0];

    expect(stepPoint(path.children[1])[1]).toBeCloseTo(225, 6);
  });

  it('pow 使用非整数指数且定义域包含负数时明确报错', () => {
    const data = [
      { i: 0, v: 1 },
      { i: 1, v: 4 },
    ];

    expect(() => expandOf(lineSpec({ type: 'pow', exponent: 0.5, domain: [-1, 9] }), { d: data }, cartOpts)).toThrow(
      /non-negative domain/,
    );
  });

  it('pow 使用整数指数时允许负定义域', () => {
    const data = [
      { i: 0, v: -2 },
      { i: 1, v: 0 },
      { i: 2, v: 2 },
    ];

    // exponent 2（整数）允许负 domain，不抛
    expect(() => expandOf(lineSpec({ type: 'pow', exponent: 2 }), { d: data }, cartOpts)).not.toThrow();
  });
});

describe('比例系列·符号日志', () => {
  // Happy path：对称对数，domain 缺省 [-10, 10] 对称、range [300,0]：v=0 → symlog(0)=0 落几何中点 → y≈150
  it('符号日志将零映射到中点', () => {
    const data = [
      { i: 0, v: -10 },
      { i: 1, v: 0 },
      { i: 2, v: 10 },
    ];
    const path = collectPaths(firstLayer(lineSpec({ type: 'symlog' }), { d: data }, cartOpts))[0];

    expect(stepPoint(path.children[1])[1]).toBeCloseTo(150, 6); // 对称 domain 下 0 落中点
  });

  // 边界：含零 / 负值合法（log 不能），全部成顶点不跳过
  it('symlog 接受零和负值', () => {
    const data = [
      { i: 0, v: -5 },
      { i: 1, v: 0 },
      { i: 2, v: 5 },
    ];
    const path = collectPaths(firstLayer(lineSpec({ type: 'symlog' }), { d: data }, cartOpts))[0];
    const points = path.children.filter(s => s.kind === 'move' || s.kind === 'line');

    expect(points.length).toBe(3);
  });
});

describe('秤系列·径向', () => {
  // Happy path：面积感知半径。domain [0,4] range [300,0]：x=1 → unsquare(linear) = sqrt(67500)≈259.81
  it('径向地图按区域真实半径', () => {
    const data = [
      { i: 0, v: 0 },
      { i: 1, v: 1 },
      { i: 2, v: 4 },
    ];
    const path = collectPaths(firstLayer(lineSpec({ type: 'radial' }), { d: data }, cartOpts))[0];

    expect(stepPoint(path.children[1])[1]).toBeCloseTo(Math.sqrt(67500), 4);
  });

  // 端到端：polar2D 玫瑰图（角向 band 类别 + 径向 radial 值）整体 lower 产出每类别一扇区，半径随值单调增
  it('径向驱动器极性玫瑰半径', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'band', name: 'a' },
        { type: 'radial', name: 'r', domainPadding: 0 },
      ],
      coordinate: { type: 'polar2D', angle: 'a', radius: 'r', interpolation: 'polar' },
      marks: [{ type: 'interval', encodings: { position: { x: { field: 'cat' }, y: { field: 'val' } } } }],
    });
    const data = [
      { cat: 'A', val: 1 },
      { cat: 'B', val: 4 },
      { cat: 'C', val: 9 },
    ];
    const nodes: Array<{ shape?: { type?: string; params?: Record<string, number> } }> = [];

    const walk = (children: ReadonlyArray<unknown>): void => {
      for (const child of children) {
        const node = child as {
          type?: string;
          shape?: { type?: string; params?: Record<string, number> };
          children?: ReadonlyArray<unknown>;
        };
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
  it('radial 允许 interval 基线', () => {
    const barSpec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'band', name: 'x' },
        { type: 'radial', name: 'y', domainPadding: 0 },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'interval', encodings: { position: { x: { field: 'cat' }, y: { field: 'v' } } } }],
    });
    const data = [
      { cat: 'a', v: 1 },
      { cat: 'b', v: 4 },
    ];

    expect(() => expandOf(barSpec, { d: data }, cartOpts)).not.toThrow();
  });
});

describe('秤系列·L1 基线保护器（契约）', () => {
  const barSpec = (yScale: Record<string, unknown>): IRPlot =>
    PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'band', name: 'x' },
        { ...yScale, name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'interval', encodings: { position: { x: { field: 'cat' }, y: { field: 'v' } } } }],
    });

  const areaSpec = (yScale: Record<string, unknown>): IRPlot =>
    PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x', domainPadding: 0 },
        { ...yScale, name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'path',
          encodings: { order: 'i', position: { x: { field: 'i' }, y: { field: 'v' } } },
          properties: { closure: { kind: 'baseline' } },
        },
      ],
    });

  // baseline guard 现按具体 scale type 报错（log / pow / sqrt / symlog 各自命名；承自定义 allowsBaseline=false 的 scale）
  const MSG = /nonlinear continuous scale \((log|pow|sqrt|symlog)\) cannot be used with interval\/area/;

  it('interval 使用 log 比例尺时明确报错', () => {
    const data = [
      { cat: 'a', v: 1 },
      { cat: 'b', v: 10 },
    ];

    expect(() => expandOf(barSpec({ type: 'log' }), { d: data }, cartOpts)).toThrow(MSG);
  });

  it('面积标记使用 sqrt 比例尺时明确报错', () => {
    const data = [
      { i: 0, v: 1 },
      { i: 1, v: 4 },
    ];

    expect(() => expandOf(areaSpec({ type: 'sqrt' }), { d: data }, cartOpts)).toThrow(MSG);
  });

  it('interval 使用 pow 比例尺时明确报错', () => {
    const data = [
      { cat: 'a', v: 1 },
      { cat: 'b', v: 4 },
    ];

    expect(() => expandOf(barSpec({ type: 'pow', exponent: 2 }), { d: data }, cartOpts)).toThrow(MSG);
  });

  it('interval 使用 symlog 比例尺时明确报错', () => {
    const data = [
      { cat: 'a', v: -4 },
      { cat: 'b', v: 4 },
    ];

    expect(() => expandOf(barSpec({ type: 'symlog' }), { d: data }, cartOpts)).toThrow(MSG);
  });

  // 交互：line（非 baseline mark）+ log 不被守卫拦
  it('允许行加日志', () => {
    const data = [
      { i: 0, v: 1 },
      { i: 1, v: 10 },
    ];

    expect(() => expandOf(lineSpec({ type: 'log' }), { d: data }, cartOpts)).not.toThrow();
  });
});
