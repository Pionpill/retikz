import { compileToScene } from '@retikz/core';
import type { IRNode, IRPath, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { type LowerPlotsOptions, lowerPlots } from '../../src/lower/expand';

const SALES = [
  { month: 0, revenue: 10 },
  { month: 1, revenue: 14 },
  { month: 2, revenue: 9 },
];

const lineSpec: PlotSpec = PlotSpecSchema.parse({
  namespace: 'plot',
  type: 'plot',
  data: { ref: 'sales' },
  scales: [
    { type: 'linear', name: 'xMonth' },
    { type: 'linear', name: 'yRevenue' },
  ],
  coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
  marks: [{ type: 'line', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
});

const pointSpec = (): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { ref: 'sales' },
    scales: [
      { type: 'linear', name: 'xMonth' },
      { type: 'linear', name: 'yRevenue' },
    ],
    coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
    marks: [{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
  });

const expandOf = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>, options?: LowerPlotsOptions): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

const opts: LowerPlotsOptions = { width: 480, height: 300 };

describe('lowerPlots (ADR-06)', () => {
  // Happy path
  it('lower_line_produces_path', () => {
    const scope = expandOf(lineSpec, { sales: SALES }, opts);
    const path = scope.children[0] as IRPath;
    expect(path.type).toBe('path');
    // domain x [0,2]->[0,480]; y [9,14]->[300,0]
    expect(path.children).toEqual([
      { type: 'step', kind: 'move', to: [0, 240] },
      { type: 'step', kind: 'line', to: [240, 0] },
      { type: 'step', kind: 'line', to: [480, 300] },
    ]);
  });

  it('lower_point_produces_nodes', () => {
    const scope = expandOf(pointSpec(), { sales: SALES }, opts);
    expect(scope.children).toHaveLength(3);
    expect(scope.children.every(c => (c as IRNode).shape === 'circle')).toBe(true);
    expect((scope.children[0] as IRNode).position).toEqual([0, 240]);
  });

  it('compile_line_to_scene_ok', () => {
    const scene = compileToScene(
      { version: 1, type: 'scene', children: [lineSpec] },
      { composites: lowerPlots({ sales: SALES }, opts) },
    );
    expect(scene).toBeTruthy();
    expect(Array.isArray(scene.primitives)).toBe(true);
    expect(scene.primitives.length).toBeGreaterThan(0);
  });

  // 边界
  it('domain_inferred_from_data', () => {
    const scope = expandOf(pointSpec(), { sales: SALES }, opts);
    // 端点：month 0 -> x 0；month 2 -> x 480
    const xs = scope.children.map(c => (c as IRNode).position as [number, number]).map(p => p[0]);
    expect(Math.min(...xs)).toBe(0);
    expect(Math.max(...xs)).toBe(480);
  });

  it('lower_single_datum_point', () => {
    const scope = expandOf(pointSpec(), { sales: [{ month: 1, revenue: 5 }] }, opts);
    expect(scope.children).toHaveLength(1);
    expect((scope.children[0] as IRNode).type).toBe('node');
  });

  // 错误路径
  it('ref_not_in_datasets_throws', () => {
    expect(() => expandOf(lineSpec, { other: SALES }, opts)).toThrow(/sales/);
  });

  it('non_finite_field_skipped', () => {
    const rows = [
      { month: 0, revenue: 10 },
      { month: 'oops', revenue: 14 },
      { month: 2, revenue: 9 },
    ];
    const scope = expandOf(pointSpec(), { sales: rows }, opts);
    expect(scope.children).toHaveLength(2); // 非有限 x 的那行被跳过
  });

  // 交互
  it('explicit_domain_range_respected', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { ref: 'sales' },
      scales: [
        { type: 'linear', name: 'xMonth', domain: [0, 10], range: [0, 100] },
        { type: 'linear', name: 'yRevenue', domain: [0, 100], range: [100, 0] },
      ],
      coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
      marks: [{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
    });
    const scope = expandOf(spec, { sales: [{ month: 5, revenue: 50 }] }, opts);
    // x: 5/10*100=50; y: 100 + 50/100*(0-100)=50
    expect((scope.children[0] as IRNode).position).toEqual([50, 50]);
  });

  it('order_field_sorts_line', () => {
    const shuffled = [
      { month: 2, revenue: 9 },
      { month: 0, revenue: 10 },
      { month: 1, revenue: 14 },
    ];
    const scope = expandOf(lineSpec, { sales: shuffled }, opts);
    const path = scope.children[0] as IRPath;
    // 首点应是 month 最小 (=0) -> x 0
    expect(path.children[0]).toEqual({ type: 'step', kind: 'move', to: [0, 240] });
  });
});
