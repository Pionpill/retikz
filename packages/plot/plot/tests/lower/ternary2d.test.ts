import type { IRNode, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { type PlotSpec, PlotSpecSchema } from '../../src/ir';
import { type LowerPlotsOptions, lowerPlots } from '../../src/compile/expand';

type Datasets = Record<string, Array<Record<string, unknown>>>;

const expandOf = (spec: PlotSpec, datasets: Datasets, options?: LowerPlotsOptions): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

const firstLayer = (spec: PlotSpec, datasets: Datasets, options?: LowerPlotsOptions): IRScope =>
  expandOf(spec, datasets, options).children[0] as IRScope;

const positionsOf = (layer: IRScope): Array<[number, number]> =>
  layer.children.map(child => (child as IRNode).position as [number, number]);

const opts: LowerPlotsOptions = { width: 400, height: 400 };

const ternarySpec = (extra: Record<string, unknown> = {}): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [],
    coordinate: { type: 'ternary2D' },
    marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' }, z: { field: 'z' } } }],
    ...extra,
  });

const pureVertices = (): { vx: [number, number]; vy: [number, number]; vz: [number, number] } => {
  const positions = positionsOf(firstLayer(ternarySpec(), { d: [{ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }] }, opts));
  return { vx: positions[0], vy: positions[1], vz: positions[2] };
};

describe('ternary2D barycentric projection', () => {
  it('pure_components_land_on_vertices', () => {
    const { vx, vy, vz } = pureVertices();
    expect(vx[1]).toBeLessThan(vy[1]);
    expect(vx[1]).toBeLessThan(vz[1]);
    expect(vy[0]).toBeGreaterThan(vx[0]);
    expect(vz[0]).toBeLessThan(vx[0]);
  });

  it('balanced_lands_on_centroid', () => {
    const { vx, vy, vz } = pureVertices();
    const centroid: [number, number] = [(vx[0] + vy[0] + vz[0]) / 3, (vx[1] + vy[1] + vz[1]) / 3];
    const [p] = positionsOf(firstLayer(ternarySpec(), { d: [{ x: 1, y: 1, z: 1 }] }, opts));
    expect(p[0]).toBeCloseTo(centroid[0], 4);
    expect(p[1]).toBeCloseTo(centroid[1], 4);
  });

  it('auto_normalization_scale_invariant', () => {
    const [p1] = positionsOf(firstLayer(ternarySpec(), { d: [{ x: 1, y: 1, z: 1 }] }, opts));
    const [p10] = positionsOf(firstLayer(ternarySpec(), { d: [{ x: 10, y: 10, z: 10 }] }, opts));
    expect(p10[0]).toBeCloseTo(p1[0], 6);
    expect(p10[1]).toBeCloseTo(p1[1], 6);
  });

  it('non_normalized_triple_normalized', () => {
    const { vx, vy, vz } = pureVertices();
    const expected: [number, number] = [0.5 * vx[0] + 0.3 * vy[0] + 0.2 * vz[0], 0.5 * vx[1] + 0.3 * vy[1] + 0.2 * vz[1]];
    const [p] = positionsOf(firstLayer(ternarySpec(), { d: [{ x: 50, y: 30, z: 20 }] }, opts));
    expect(p[0]).toBeCloseTo(expected[0], 4);
    expect(p[1]).toBeCloseTo(expected[1], 4);
  });

  it('zero_component_on_edge', () => {
    const { vy, vz } = pureVertices();
    const mid: [number, number] = [(vy[0] + vz[0]) / 2, (vy[1] + vz[1]) / 2];
    const [p] = positionsOf(firstLayer(ternarySpec(), { d: [{ x: 0, y: 1, z: 1 }] }, opts));
    expect(p[0]).toBeCloseTo(mid[0], 4);
    expect(p[1]).toBeCloseTo(mid[1], 4);
  });

  it('multiple_points_placed', () => {
    const rows = [{ x: 1, y: 1, z: 1 }, { x: 2, y: 1, z: 1 }, { x: 1, y: 2, z: 1 }];
    expect(positionsOf(firstLayer(ternarySpec(), { d: rows }, opts))).toHaveLength(3);
  });
});

describe('ternary2D fail-loud', () => {
  it('sum_zero_fails_loud', () => {
    expect(() => expandOf(ternarySpec(), { d: [{ x: 0, y: 0, z: 0 }] }, opts)).toThrow(/ternary|x\+y\+z|> 0/i);
  });

  it('negative_component_fails_loud', () => {
    expect(() => expandOf(ternarySpec(), { d: [{ x: -1, y: 1, z: 1 }] }, opts)).toThrow(/ternary|non-negative|negative/i);
  });

  it('sum_overflow_fails_loud', () => {
    expect(() => expandOf(ternarySpec(), { d: [{ x: 1e308, y: 1e308, z: 1e308 }] }, opts)).toThrow(/ternary|overflow/i);
  });

  it('missing_z_channel_fails_loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [],
      coordinate: { type: 'ternary2D' },
      marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
    });
    expect(() => expandOf(spec, { d: [{ x: 1, y: 1 }] }, opts)).toThrow(/ternary2D|requires|z/i);
  });

  it('interval_fails_loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'band', name: 'xs' }],
      coordinate: { type: 'ternary2D' },
      marks: [{ type: 'interval', encoding: { x: { field: 'cat' }, y: { field: 'v' } } }],
    });
    expect(() => expandOf(spec, { d: [{ cat: 'A', v: 1 }] }, opts)).toThrow(/ternary2D|not supported|interval/i);
  });

  it('angle_dimension_fails_loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [],
      coordinate: { type: 'ternary2D' },
      marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' }, z: { field: 'z' } } }],
      guides: [{ type: 'axis', dimension: 'angle' }],
    });
    expect(() => expandOf(spec, { d: [{ x: 1, y: 1, z: 1 }] }, opts)).toThrow(/ternary2D|not support|dimension|angle/i);
  });
});

describe('ternary2D data contract', () => {
  it('model_omitting_component_fails_loud', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd', model: [{ name: 'sand', type: 'continuous' }] },
      scales: [],
      coordinate: { type: 'ternary2D' },
      marks: [{ type: 'point', encoding: { x: { field: 'sand' }, y: { field: 'silt' }, z: { field: 'clay' } } }],
    });
    expect(() => expandOf(spec, { d: [{ sand: 1, silt: 1, clay: 1 }] }, opts)).toThrow(/unknown field|silt|clay/i);
  });

  it('string_numeric_components_coerced_not_skipped', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: {
        reference: 'd',
        model: [
          { name: 'x', type: 'continuous' },
          { name: 'y', type: 'continuous' },
          { name: 'z', type: 'continuous' },
        ],
      },
      scales: [],
      coordinate: { type: 'ternary2D' },
      marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' }, z: { field: 'z' } } }],
    });
    const layer = firstLayer(spec, { d: [{ x: '1', y: '1', z: '1' }] }, opts);
    expect(positionsOf(layer)).toHaveLength(1);
  });
});

describe('ternary2D guide + color', () => {
  it('triangle_axis_guides_lower', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [],
      coordinate: { type: 'ternary2D' },
      marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' }, z: { field: 'z' } } }],
      guides: [
        { type: 'axis', dimension: 'x' },
        { type: 'axis', dimension: 'y' },
        { type: 'axis', dimension: 'z' },
      ],
    });
    const root = expandOf(spec, { d: [{ x: 1, y: 1, z: 1 }, { x: 2, y: 1, z: 1 }] }, opts);
    expect(root.children.length).toBeGreaterThanOrEqual(4);
  });

  it('ternary_with_color_groups_into_subscopes', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'd' },
      scales: [{ type: 'ordinal', name: 'col', range: ['#aa', '#bb'] }],
      coordinate: { type: 'ternary2D' },
      marks: [{ type: 'point', color: { kind: 'field', value: 'region', scale: 'col' }, encoding: { x: { field: 'x' }, y: { field: 'y' }, z: { field: 'z' } } }],
    });
    const layer = firstLayer(spec, { d: [{ x: 1, y: 1, z: 1, region: 'X' }, { x: 2, y: 1, z: 1, region: 'Y' }] }, opts);
    expect(layer.children).toHaveLength(2);
  });
});
