import type { IRNode, IRPath, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { type LowerPlotsOptions, lowerPlots } from '../../src/lower/expand';

const cartOpts: LowerPlotsOptions = { width: 480, height: 300 };

const expandOf = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>): IRScope => {
  const [def] = lowerPlots(datasets, cartOpts);
  return def.expand(spec) as IRScope;
};

const firstLayer = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>): IRScope => expandOf(spec, datasets).children[0] as IRScope;

const collectPaths = (layer: IRScope): Array<IRPath> => {
  const out: Array<IRPath> = [];
  const walk = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const node = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (node.type === 'path') out.push(node as unknown as IRPath);
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
      if (node.type === 'node') out.push(node as unknown as IRNode);
      else if (node.type === 'scope' && node.children) walk(node.children);
    }
  };
  walk(layer.children);
  return out;
};

/** 建 spec：x/y linear + ordinal 色 scale，单 mark */
const specOf = (mark: Record<string, unknown>): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [{ type: 'linear', name: 'x' }, { type: 'linear', name: 'y' }, { type: 'ordinal', name: 'col' }],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [mark],
  });

const SERIES_DATA = [
  { t: 0, v: 1, city: 'X' },
  { t: 1, v: 3, city: 'X' },
  { t: 0, v: 2, city: 'Y' },
  { t: 1, v: 4, city: 'Y' },
];

describe('color × series · B/C 收口（alpha.7 ADR-03）', () => {
  // Happy path：多系列 line 显式 series → 每系列一条着色线
  it('explicit_series_line_splits_and_colors', () => {
    const spec = specOf({ type: 'line', series: 'city', order: 't', encoding: { x: { field: 't' }, y: { field: 'v' }, color: { field: 'city', scale: 'col' } } });
    const paths = collectPaths(firstLayer(spec, { d: SERIES_DATA }));
    expect(paths).toHaveLength(2);
    expect(paths[0].stroke).not.toEqual(paths[1].stroke);
  });

  // Happy path：单 line + categorical color 字段（无 series）→ 隐式拆系列（修「静默丢弃」）
  it('single_line_categorical_color_implicitly_splits', () => {
    const spec = specOf({ type: 'line', order: 't', encoding: { x: { field: 't' }, y: { field: 'v' }, color: { field: 'city', scale: 'col' } } });
    const paths = collectPaths(firstLayer(spec, { d: SERIES_DATA }));
    expect(paths).toHaveLength(2); // 旧行为是 1 条 currentColor 线；现按 city 拆 2 条
  });

  // 关键：隐式拆产物等价于显式 series（locator parity）
  it('implicit_split_equals_explicit_series', () => {
    const implicit = specOf({ type: 'line', order: 't', encoding: { x: { field: 't' }, y: { field: 'v' }, color: { field: 'city', scale: 'col' } } });
    const explicit = specOf({ type: 'line', series: 'city', order: 't', encoding: { x: { field: 't' }, y: { field: 'v' }, color: { field: 'city', scale: 'col' } } });
    expect(firstLayer(implicit, { d: SERIES_DATA })).toEqual(firstLayer(explicit, { d: SERIES_DATA }));
  });

  // Happy path：area 同理隐式拆
  it('single_area_categorical_color_implicitly_splits', () => {
    const spec = specOf({ type: 'area', order: 't', encoding: { x: { field: 't' }, y: { field: 'v' }, color: { field: 'city', scale: 'col' } } });
    const paths = collectPaths(firstLayer(spec, { d: SERIES_DATA }));
    expect(paths).toHaveLength(2);
  });

  // point 按 datum 着色，不拆系列（B/C：非 path mark 不引入 series）
  it('point_colors_per_datum_no_series', () => {
    const spec = specOf({ type: 'point', encoding: { x: { field: 't' }, y: { field: 'v' }, color: { field: 'city', scale: 'col' } } });
    const nodes = collectNodes(firstLayer(spec, { d: SERIES_DATA }));
    expect(nodes).toHaveLength(4); // 每行一点，按 city 分色（子 Scope），不拆 path
  });
});

describe('color 类型兼容校验（alpha.7 ADR-03）', () => {
  it('continuous_color_field_fails_loud', () => {
    const spec = specOf({ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' }, color: { field: 'v' } } });
    expect(() => expandOf(spec, { d: [{ x: 0, y: 0, v: 1.5 }, { x: 1, y: 1, v: 2.5 }] })).toThrow(/continuous\/temporal color/);
  });

  it('temporal_color_field_fails_loud', () => {
    const spec = specOf({ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' }, color: { field: 'date' } } });
    expect(() => expandOf(spec, { d: [{ x: 0, y: 0, date: '2024-01-01' }, { x: 1, y: 1, date: '2024-02-01' }] })).toThrow(/continuous\/temporal color/);
  });
});

describe('series + color 冲突（alpha.7 ADR-03）', () => {
  it('color_not_constant_within_series_fails_loud', () => {
    // series=city 但 color=shade 在同一 city 内多值 → fail-loud
    const spec = specOf({ type: 'line', series: 'city', order: 't', encoding: { x: { field: 't' }, y: { field: 'v' }, color: { field: 'shade', scale: 'col' } } });
    const data = [
      { t: 0, v: 1, city: 'X', shade: 'a' },
      { t: 1, v: 3, city: 'X', shade: 'b' },
    ];
    expect(() => expandOf(spec, { d: data })).toThrow(/not constant within series/);
  });

  it('color_equals_series_field_ok', () => {
    const spec = specOf({ type: 'line', series: 'city', order: 't', encoding: { x: { field: 't' }, y: { field: 'v' }, color: { field: 'city', scale: 'col' } } });
    expect(() => expandOf(spec, { d: SERIES_DATA })).not.toThrow();
  });
});
