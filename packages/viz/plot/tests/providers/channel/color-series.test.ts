import type { IRNode, IRPath, IRScope } from '@retikz/core';
import { resolveDefaultCoreThemeColors, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { PlotsLoweringOptions } from '../../../src/pipeline/expand';
import { lowerPlotWithDataArtifact } from '../../../src/pipeline/expand/lower';
import type { IRPlot } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

const cartOpts: PlotsLoweringOptions = { layout: { width: 480, height: 300 } };

const sharedCategorical = resolveDefaultCoreThemeColors(ThemeMode.Light).categorical;

const expandOf = (spec: IRPlot, datasets: Record<string, Array<Record<string, unknown>>>): IRScope => {
  return lowerPlotWithDataArtifact(spec, datasets, { ...cartOpts, textMeasurer: measureLabel }).child as IRScope;
};

const firstLayer = (spec: IRPlot, datasets: Record<string, Array<Record<string, unknown>>>): IRScope =>
  expandOf(spec, datasets).children[0] as IRScope;

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

/** 建 spec：x/y linear + ordinal 色 scale，单 mark */
const specOf = (mark: Record<string, unknown>): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
      { type: 'ordinal', name: 'col' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [mark],
  });

const SERIES_DATA = [
  { t: 0, v: 1, city: 'X' },
  { t: 1, v: 3, city: 'X' },
  { t: 0, v: 2, city: 'Y' },
  { t: 1, v: 4, city: 'Y' },
];

describe('color × series · B/C 收口（contract）', () => {
  // Happy path：多系列 line 显式 series → 每系列一条着色线
  it('显式系列将线条分组并着色', () => {
    const spec = specOf({
      type: 'path',
      encodings: {
        series: 'city',
        order: 't',
        color: { field: 'city', scale: 'col' },
        position: { x: { field: 't' }, y: { field: 'v' } },
      },
    });
    const paths = collectPaths(firstLayer(spec, { d: SERIES_DATA }));

    expect(paths).toHaveLength(2);
    expect(paths[0].style?.stroke).not.toEqual(paths[1].style?.stroke);
  });

  // Happy path：单 line + categorical color 字段（无 series）→ 隐式拆系列（修「静默丢弃」）
  it('单行分类颜色隐式分割', () => {
    const spec = specOf({
      type: 'path',
      encodings: {
        order: 't',
        color: { field: 'city', scale: 'col' },
        position: { x: { field: 't' }, y: { field: 'v' } },
      },
    });
    const paths = collectPaths(firstLayer(spec, { d: SERIES_DATA }));

    expect(paths).toHaveLength(2); // 旧行为是 1 条 currentColor 线；现按 city 拆 2 条
  });

  // 关键：隐式拆产物等价于显式 series（locator parity）
  it('隐式拆分与显式系列等价', () => {
    const implicit = specOf({
      type: 'path',
      encodings: {
        order: 't',
        color: { field: 'city', scale: 'col' },
        position: { x: { field: 't' }, y: { field: 'v' } },
      },
    });
    const explicit = specOf({
      type: 'path',
      encodings: {
        series: 'city',
        order: 't',
        color: { field: 'city', scale: 'col' },
        position: { x: { field: 't' }, y: { field: 'v' } },
      },
    });

    expect(firstLayer(implicit, { d: SERIES_DATA })).toEqual(firstLayer(explicit, { d: SERIES_DATA }));
  });

  // Happy path：area 同理隐式拆
  it('单个闭合路径分类颜色隐式分割', () => {
    const spec = specOf({
      type: 'path',
      encodings: {
        order: 't',
        color: { field: 'city', scale: 'col' },
        position: { x: { field: 't' }, y: { field: 'v' } },
      },
      properties: { closure: { kind: 'baseline' } },
    });
    const paths = collectPaths(firstLayer(spec, { d: SERIES_DATA }));

    expect(paths).toHaveLength(2);
  });

  // point 按 datum 着色，不拆系列（B/C：非 path mark 不引入 series）
  it('每个基准的点颜色，无系列', () => {
    const spec = specOf({
      type: 'point',
      encodings: { color: { field: 'city', scale: 'col' }, position: { x: { field: 't' }, y: { field: 'v' } } },
    });
    const nodes = collectNodes(firstLayer(spec, { d: SERIES_DATA }));

    expect(nodes).toHaveLength(4); // 每行一点，按 city 分色（子 Scope），不拆 path
  });
});

describe('绘图主题默认调色板', () => {
  it('没有颜色的标记默认使用共享分类', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        { type: 'path', encodings: { order: 'x', position: { x: { field: 'x' }, y: { field: 'y' } } } },
        { type: 'interval', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } },
      ],
    });
    const root = expandOf(spec, {
      d: [
        { x: 'A', y: 1 },
        { x: 'B', y: 2 },
      ],
    });
    const [lineLayer, barLayerNode] = root.children as Array<IRScope>;

    expect(lineLayer.defaults?.path?.style?.stroke).toBe(sharedCategorical[0]);
    expect(barLayerNode.defaults?.node?.style?.fill).toBe(sharedCategorical[1]);
  });

  it('无颜色标记按图层索引使用绘图调色板', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      defaultPlot: { palette: { series: ['#2563eb', '#f97316', 'currentColor'] } },
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        { type: 'path', encodings: { order: 'x', position: { x: { field: 'x' }, y: { field: 'y' } } } },
        { type: 'interval', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } },
        { type: 'point', encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } } },
      ],
    });
    const root = expandOf(spec, {
      d: [
        { x: 'A', y: 1 },
        { x: 'B', y: 2 },
      ],
    });
    const [lineLayer, barLayerNode, pointLayer] = root.children as Array<IRScope>;

    expect(lineLayer.defaults?.path?.style?.stroke).toBe('#2563eb');
    expect(barLayerNode.defaults?.node?.style?.fill).toBe('#f97316');
    expect(pointLayer.defaults?.node?.style?.fill).toBe('currentColor');
  });

  it('分类颜色使用绘图调色板作为序数范围', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      defaultPlot: { palette: { categorical: ['#2563eb', '#f97316'] } },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'ordinal', name: 'col' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          encodings: { color: { field: 'city', scale: 'col' }, position: { x: { field: 'x' }, y: { field: 'y' } } },
        },
      ],
    });
    const layer = firstLayer(spec, {
      d: [
        { x: 0, y: 1, city: 'A' },
        { x: 1, y: 2, city: 'B' },
        { x: 2, y: 3, city: 'C' },
      ],
    });
    const colorScopes = layer.children as Array<IRScope>;

    expect(colorScopes.map(scope => scope.defaults?.node?.style?.fill)).toEqual(['#2563eb', '#f97316']);
    expect(colorScopes.map(scope => scope.children.length)).toEqual([2, 1]);
  });
});

describe('color 类型兼容校验（contract）', () => {
  it('连续类型的颜色字段明确报错', () => {
    const spec = specOf({
      type: 'point',
      encodings: { color: 'v', position: { x: { field: 'x' }, y: { field: 'y' } } },
    });

    expect(() =>
      expandOf(spec, {
        d: [
          { x: 0, y: 0, v: 1.5 },
          { x: 1, y: 1, v: 2.5 },
        ],
      }),
    ).toThrow(/continuous\/temporal color/);
  });

  it('时间色场明确报错', () => {
    const spec = specOf({
      type: 'point',
      encodings: { color: 'date', position: { x: { field: 'x' }, y: { field: 'y' } } },
    });

    expect(() =>
      expandOf(spec, {
        d: [
          { x: 0, y: 0, date: '2024-01-01' },
          { x: 1, y: 1, date: '2024-02-01' },
        ],
      }),
    ).toThrow(/continuous\/temporal color/);
  });
});

describe('series + color 冲突（contract）', () => {
  it('同一系列内颜色不一致时明确报错', () => {
    // series=city 但 color=shade 在同一 city 内多值 → fail-loud
    const spec = specOf({
      type: 'path',
      encodings: {
        series: 'city',
        order: 't',
        color: { field: 'shade', scale: 'col' },
        position: { x: { field: 't' }, y: { field: 'v' } },
      },
    });
    const data = [
      { t: 0, v: 1, city: 'X', shade: 'a' },
      { t: 1, v: 3, city: 'X', shade: 'b' },
    ];

    expect(() => expandOf(spec, { d: data })).toThrow(/not constant within series/);
  });

  it('颜色字段与系列字段相同时可正常处理', () => {
    const spec = specOf({
      type: 'path',
      encodings: {
        series: 'city',
        order: 't',
        color: { field: 'city', scale: 'col' },
        position: { x: { field: 't' }, y: { field: 'v' } },
      },
    });

    expect(() => expandOf(spec, { d: SERIES_DATA })).not.toThrow();
  });
});
