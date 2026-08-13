import type { IRNode, IRPath, IRScope } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import type { IRPlotSpec } from '../../../src/schemas';

import { lowerPlots } from '../../../src/pipeline/expand';
import { PlotSpecSchema } from '../../../src/schemas';

/** 笛卡尔默认画布：x [0,..]→[0,480]，y range [300,0]（无 axis → plot area = 整图） */
const cartOpts: LowerPlotsOptions = { width: 480, height: 300 };

const expandOf = (
  spec: IRPlotSpec,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: LowerPlotsOptions = {},
): IRScope => {
  const [def] = lowerPlots(datasets, { ...cartOpts, ...options });
  return def.expand(spec).children[0] as IRScope;
};

/** 取第一个 mark 图层 scope（外层 plot scope 的第一个子 scope） */
const firstLayer = (
  spec: IRPlotSpec,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options: LowerPlotsOptions = {},
): IRScope => expandOf(spec, datasets, options).children[0] as IRScope;

/** 深度收集图层内所有 point node（连续色按色分组到子 Scope，fill 落在子 Scope.nodeDefault） */
const collectNodes = (layer: IRScope): Array<IRNode> => {
  const out: Array<IRNode> = [];
  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'node') out.push(child as IRNode);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };
  walk(layer.children);
  return out;
};

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

/**
 * 收集图层内每个 point node 的有效 fill（连续色把同色 node 分组到子 Scope.nodeDefault.fill）。
 * 返回长度与 node 数一致、按 node 出现序的 fill 串数组（无 fill → undefined）
 */
const nodeFills = (layer: IRScope): Array<string | undefined> => {
  const out: Array<string | undefined> = [];
  const walk = (children: ReadonlyArray<unknown>, inheritedFill: string | undefined): void => {
    for (const child of children) {
      const node = child as {
        type?: string;
        children?: ReadonlyArray<unknown>;
        nodeDefault?: { fill?: string };
        fill?: string;
      };
      if (node.type === 'node') out.push(node.fill ?? inheritedFill);
      else if (node.type === 'scope' && node.children) walk(node.children, node.nodeDefault?.fill ?? inheritedFill);
    }
  };
  walk(layer.children, undefined);
  return out;
};

/** 建单 point mark 的 cartesian spec，x/y linear + 给定连续色 scale，color 引用之 */
const pointSpec = (colorScale: Record<string, unknown>, plotTheme?: IRPlotSpec['plotTheme']): IRPlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
      { ...colorScale, name: 'col' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [
      {
        type: 'point',
        color: { kind: 'field', value: 'v', scale: 'col' },
        encoding: { x: { field: 'x' }, y: { field: 'y' } },
      },
    ],
    plotTheme,
  });

describe('连续色 · sequential 求值（contract）', () => {
  // Happy path：数值字段 + point → 各点按 viridis 取色，端点对色带两端，互异
  it('sequential 连续字段各点取色且端点异色', () => {
    const data = [
      { x: 0, y: 0, v: 0 },
      { x: 1, y: 1, v: 50 },
      { x: 2, y: 2, v: 100 },
    ];
    const layer = firstLayer(pointSpec({ type: 'sequential', domain: [0, 100] }), { d: data });
    const fills = nodeFills(layer);
    expect(fills).toHaveLength(3);
    expect(fills.every(f => typeof f === 'string' && f.length > 0)).toBe(true);
    // 端点（v=0 与 v=100）取不同颜色（单方向色带两端）
    expect(fills[0]).not.toEqual(fills[2]);
  });

  // Happy path：指定 scheme: 'blues' → 与默认（viridis）取色不同
  it('scheme blues 取色不同于默认 viridis', () => {
    const data = [
      { x: 0, y: 0, v: 0 },
      { x: 1, y: 1, v: 100 },
    ];
    const blues = nodeFills(
      firstLayer(pointSpec({ type: 'sequential', domain: [0, 100], scheme: 'blues' }), { d: data }),
    );
    const viridis = nodeFills(firstLayer(pointSpec({ type: 'sequential', domain: [0, 100] }), { d: data }));
    expect(blues[1]).not.toEqual(viridis[1]);
  });

  // Happy path：bar / interval mark 连续色 per-datum 着色（point/bar/sector 边界内）
  it('interval（柱）连续色 per-datum 着色', () => {
    const data = [
      { cat: 'a', v: 1 },
      { cat: 'b', v: 5 },
      { cat: 'c', v: 9 },
    ];
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'sequential', name: 'col', domain: [0, 9] },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        { type: 'interval', encoding: { x: { field: 'cat' }, y: { field: 'v' }, color: { field: 'v', scale: 'col' } } },
      ],
    });
    const fills = nodeFills(firstLayer(spec, { d: data }));
    expect(fills).toHaveLength(3);
    expect(fills[0]).not.toEqual(fills[2]);
  });
});

describe('连续色 · diverging 求值（contract）', () => {
  // Happy path：domain [-100,0,100] → 中点 0 取淡色、两端异色
  it('diverging 中点淡色两端异色', () => {
    const data = [
      { x: 0, y: 0, v: -100 },
      { x: 1, y: 1, v: 0 },
      { x: 2, y: 2, v: 100 },
    ];
    const fills = nodeFills(
      firstLayer(pointSpec({ type: 'diverging', domain: [-100, 0, 100], scheme: 'rdbu' }), { d: data }),
    );
    expect(fills).toHaveLength(3);
    // 两端异色
    expect(fills[0]).not.toEqual(fills[2]);
    // 中点（v=0）与两端均不同（pale center）
    expect(fills[1]).not.toEqual(fills[0]);
    expect(fills[1]).not.toEqual(fills[2]);
  });

  // 交互：range 覆盖 scheme —— 同给 range + scheme → 取 range 端点
  it('range 覆盖 scheme（取 range 端点色）', () => {
    const data = [
      { x: 0, y: 0, v: -100 },
      { x: 1, y: 1, v: 100 },
    ];
    const fills = nodeFills(
      firstLayer(
        pointSpec({
          type: 'diverging',
          domain: [-100, 0, 100],
          scheme: 'rdbu',
          range: ['#ff0000', '#ffffff', '#0000ff'],
        }),
        { d: data },
      ),
    );
    // range 端点颜色（覆盖 scheme）；端点取自定义 range 两端
    const lowSeq = nodeFills(
      firstLayer(pointSpec({ type: 'sequential', domain: [0, 100], range: ['#123456', '#abcdef'] }), {
        d: [
          { x: 0, y: 0, v: 0 },
          { x: 1, y: 1, v: 100 },
        ],
      }),
    );
    expect(lowSeq[0]?.toLowerCase()).toContain('12');
    expect(fills[0]).not.toEqual(fills[1]);
  });
});

describe('连续色 · Plot theme scheme 消费（contract）', () => {
  const data = [
    { x: 0, y: 0, v: -100 },
    { x: 1, y: 1, v: 0 },
    { x: 2, y: 2, v: 100 },
  ];

  it('让 theme sequential/diverging scheme 通过 options.colorSchemes 进入 scale 求值', () => {
    const colorSchemes = {
      'theme-sequential': (t: number): string => (t < 0.5 ? '#102030' : '#d0e0f0'),
      'theme-diverging': (t: number): string => (t < 0.5 ? '#ff0000' : t > 0.5 ? '#0000ff' : '#ffffff'),
    };
    const sequential = nodeFills(
      firstLayer(
        pointSpec({ type: 'sequential', domain: [-100, 100] }, { palette: { sequential: 'theme-sequential' } }),
        { d: data },
        { colorSchemes },
      ),
    );
    const diverging = nodeFills(
      firstLayer(
        pointSpec({ type: 'diverging', domain: [-100, 0, 100] }, { palette: { diverging: 'theme-diverging' } }),
        { d: data },
        { colorSchemes },
      ),
    );

    expect(sequential[0]).not.toEqual(sequential[2]);
    expect(diverging[0]).not.toEqual(diverging[1]);
    expect(diverging[1]).not.toEqual(diverging[2]);
  });

  it('让未注册的 theme scheme 在实际 scale 消费时 fail-loud', () => {
    expect(() =>
      firstLayer(
        pointSpec({ type: 'sequential', domain: [-100, 100] }, { palette: { sequential: 'missing-theme-scheme' } }),
        { d: data },
      ),
    ).toThrow('unknown color scheme "missing-theme-scheme"');
  });
});

describe('连续色 · domain 推断与退化（contract）', () => {
  // 边界：省略 domain → 从数据取 [min,max]（端点仍异色）
  it('sequential 省略 domain 从数据推断 [min,max]', () => {
    const data = [
      { x: 0, y: 0, v: 3 },
      { x: 1, y: 1, v: 7 },
      { x: 2, y: 2, v: 11 },
    ];
    const fills = nodeFills(firstLayer(pointSpec({ type: 'sequential' }), { d: data }));
    expect(fills).toHaveLength(3);
    expect(fills[0]).not.toEqual(fills[2]);
  });

  it('diverging 省略 domain 推断 [min,mid,max]', () => {
    const data = [
      { x: 0, y: 0, v: -4 },
      { x: 1, y: 1, v: 0 },
      { x: 2, y: 2, v: 4 },
    ];
    const fills = nodeFills(firstLayer(pointSpec({ type: 'diverging' }), { d: data }));
    expect(fills).toHaveLength(3);
    expect(fills[0]).not.toEqual(fills[2]);
  });

  // 边界：单值数据（所有值相等）→ 不崩，退化取色
  it('单值数据不崩（退化取色）', () => {
    const data = [
      { x: 0, y: 0, v: 5 },
      { x: 1, y: 1, v: 5 },
      { x: 2, y: 2, v: 5 },
    ];
    expect(() => firstLayer(pointSpec({ type: 'sequential' }), { d: data })).not.toThrow();
    const fills = nodeFills(firstLayer(pointSpec({ type: 'sequential' }), { d: data }));
    expect(fills.every(f => typeof f === 'string' && f.length > 0)).toBe(true);
  });
});

describe('连续色 · fail-loud 守卫（contract）', () => {
  const pathColorSpec = (markType: 'line' | 'area'): IRPlotSpec =>
    PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'sequential', name: 'col', domain: [0, 10] },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: markType,
          order: 'x',
          encoding: { x: { field: 'x' }, y: { field: 'y' }, color: { field: 'v', scale: 'col' } },
        },
      ],
    });

  // 错误路径：line + 连续 color → fail-loud（连续色仅 point/bar/sector）
  it('line + 连续 color fail-loud', () => {
    const data = [
      { x: 0, y: 1, v: 0 },
      { x: 1, y: 3, v: 5 },
      { x: 2, y: 2, v: 10 },
    ];
    expect(() => expandOf(pathColorSpec('line'), { d: data })).toThrow();
  });

  // 错误路径：area + 连续 color → fail-loud
  it('area + 连续 color fail-loud', () => {
    const data = [
      { x: 0, y: 1, v: 0 },
      { x: 1, y: 3, v: 5 },
      { x: 2, y: 2, v: 10 },
    ];
    expect(() => expandOf(pathColorSpec('area'), { d: data })).toThrow();
  });

  // 错误路径：diverging domain 乱序（low > mid > high）→ lowering fail-loud
  it('diverging domain 乱序 fail-loud', () => {
    const data = [
      { x: 0, y: 0, v: -100 },
      { x: 1, y: 1, v: 100 },
    ];
    expect(() => expandOf(pointSpec({ type: 'diverging', domain: [100, 0, -100] }), { d: data })).toThrow();
  });

  // 错误路径：sequential domain min == max（显式给反序）→ lowering fail-loud
  it('sequential domain 反序（min > max）fail-loud', () => {
    const data = [
      { x: 0, y: 0, v: 0 },
      { x: 1, y: 1, v: 100 },
    ];
    expect(() => expandOf(pointSpec({ type: 'sequential', domain: [100, 0] }), { d: data })).toThrow();
  });

  // 错误路径：temporal 字段 + diverging → fail-loud（diverging 对 temporal 无意义）
  it('temporal + diverging fail-loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'diverging', name: 'col' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          color: { kind: 'field', value: 'date', scale: 'col' },
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        },
      ],
    });
    const data = [
      { x: 0, y: 0, date: '2024-01-01' },
      { x: 1, y: 1, date: '2024-06-01' },
    ];
    expect(() => expandOf(spec, { d: data })).toThrow();
  });
});

describe('连续色 · temporal sequential（contract）', () => {
  // 交互：时间字段经 sequential（时间戳当连续量）→ 时间渐变色，不 fail-loud
  it('temporal + sequential 时间渐变取色', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'sequential', name: 'col' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          color: { kind: 'field', value: 'date', scale: 'col' },
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        },
      ],
    });
    const data = [
      { x: 0, y: 0, date: '2024-01-01' },
      { x: 1, y: 1, date: '2024-06-01' },
      { x: 2, y: 2, date: '2024-12-01' },
    ];
    const layer = firstLayer(spec, { d: data });
    const fills = nodeFills(layer);
    expect(fills).toHaveLength(3);
    expect(fills[0]).not.toEqual(fills[2]);
  });
});

describe('连续色 · 非有限 domain 端点 fail-loud（contract 越界一致性）', () => {
  // 非有限 domain 端点会被 scale schema 的 number 校验静态拦截；此处刻意绕过静态校验，验证 lowering 期的纵深防御（resolve* finite 守卫）
  const infinitySpec = (colorScale: Record<string, unknown>): IRPlotSpec =>
    ({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { ...colorScale, name: 'col' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          color: { kind: 'field', value: 'v', scale: 'col' },
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        },
      ],
    }) as IRPlotSpec;
  const data = [
    { x: 0, y: 0, v: 1 },
    { x: 1, y: 1, v: 1e9 },
    { x: 2, y: 2, v: 1e18 },
  ];

  // 此前 [0, Infinity] 会让 span=Infinity、每点 t=0，所有点静默压成端点色（信息全丢、不报错）
  it('sequential domain 含 Infinity 抛错而非静默塌成单色', () => {
    expect(() =>
      expandOf(infinitySpec({ type: 'sequential', domain: [0, Number.POSITIVE_INFINITY] }), { d: data }),
    ).toThrow(/Infinity/);
  });

  // 此前 [-100,0,Infinity] 校验过、正侧 t=0.5，不同量级值压成中点色
  it('diverging domain 含 Infinity 抛错而非静默压成中点色', () => {
    expect(() =>
      expandOf(infinitySpec({ type: 'diverging', domain: [-100, 0, Number.POSITIVE_INFINITY] }), { d: data }),
    ).toThrow(/Infinity/);
  });
});

describe('连续色 · 回归：categorical 仍走 ordinal（contract）', () => {
  // 交互：categorical color 字段仍可正常着色（连续色阶不影响分类路径）
  it('categorical 字段不受连续色阶影响', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'ordinal', name: 'col' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          color: { kind: 'field', value: 'city', scale: 'col' },
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        },
      ],
    });
    const data = [
      { x: 0, y: 0, city: 'A' },
      { x: 1, y: 1, city: 'B' },
    ];
    const fills = nodeFills(firstLayer(spec, { d: data }));
    expect(fills[0]).not.toEqual(fills[1]);
    expect(collectNodes(firstLayer(spec, { d: data }))).toHaveLength(2);
    expect(collectPaths(firstLayer(spec, { d: data }))).toHaveLength(0);
  });
});
