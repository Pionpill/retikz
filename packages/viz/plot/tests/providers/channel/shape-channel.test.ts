import type { IRNode, IRScope } from '@retikz/core';
import type { IRShapeValue } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import type { IRPlotSpec } from '../../../src/schemas';

import { lowerPlots } from '../../../src/pipeline/expand';
import { PLOT_SHAPE_PALETTE } from '../../../src/providers';
import { PlotSpecSchema } from '../../../src/schemas';

const cartOpts: LowerPlotsOptions = { width: 480, height: 300 };

const expandOf = (spec: IRPlotSpec, datasets: Record<string, Array<Record<string, unknown>>>): IRScope => {
  const [def] = lowerPlots(datasets, cartOpts);
  return def.expand(spec) as IRScope;
};

const firstLayer = (spec: IRPlotSpec, datasets: Record<string, Array<Record<string, unknown>>>): IRScope =>
  expandOf(spec, datasets).children[0] as IRScope;

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

const shapeOf = (node: IRNode): IRShapeValue | undefined => node.shape;

const pointSpec = (
  shape: { kind: 'field'; value: string } | { kind: 'constant'; value: string } | undefined,
): IRPlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'point', ...(shape ? { shape } : {}), encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
  });

describe('shape channel 类别映射', () => {
  it('shape_field_maps_categories_to_palette', () => {
    const data = [
      { x: 0, y: 0, g: 'A' },
      { x: 1, y: 1, g: 'B' },
      { x: 2, y: 2, g: 'A' },
    ];
    const nodes = collectNodes(firstLayer(pointSpec({ kind: 'field', value: 'g' }), { d: data }));
    expect(shapeOf(nodes[0])).toBe(PLOT_SHAPE_PALETTE[0]);
    expect(shapeOf(nodes[1])).toBe(PLOT_SHAPE_PALETTE[1]);
    expect(shapeOf(nodes[2])).toBe(PLOT_SHAPE_PALETTE[0]);
  });

  it('shape_palette_cycles', () => {
    const cats = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
    const data = cats.map((g, i) => ({ x: i, y: i, g }));
    const nodes = collectNodes(firstLayer(pointSpec({ kind: 'field', value: 'g' }), { d: data }));
    expect(PLOT_SHAPE_PALETTE).toHaveLength(8);
    expect(nodes.map(shapeOf)).toEqual([...PLOT_SHAPE_PALETTE, PLOT_SHAPE_PALETTE[0]]);
  });

  it('plotTheme_shape_palette_preserves_structured_refs', () => {
    const custom = [{ type: 'polygon', params: { sides: 5, rotate: -90 } }, 'cross'] satisfies Array<IRShapeValue>;
    const spec = PlotSpecSchema.parse({
      ...pointSpec({ kind: 'field', value: 'g' }),
      plotTheme: { palette: { shape: custom } },
    });
    const data = [
      { x: 0, y: 0, g: 'A' },
      { x: 1, y: 1, g: 'B' },
      { x: 2, y: 2, g: 'C' },
    ];
    const nodes = collectNodes(firstLayer(spec, { d: data }));
    expect(nodes.map(shapeOf)).toEqual([custom[0], custom[1], custom[0]]);
  });

  it('shape_value_constant', () => {
    const data = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    const nodes = collectNodes(firstLayer(pointSpec({ kind: 'constant', value: 'diamond' }), { d: data }));
    expect(nodes.every(n => shapeOf(n) === 'diamond')).toBe(true);
  });

  it('shape_no_channel_no_shape_override', () => {
    const data = [{ x: 0, y: 0 }];
    const nodes = collectNodes(firstLayer(pointSpec(undefined), { d: data }));
    expect(nodes.every(n => shapeOf(n) === undefined)).toBe(true);
  });

  // continuous / temporal 字段必须 fail-loud
  it('shape_continuous_field_fails_loud', () => {
    const data = [
      { x: 0, y: 0, v: 1.5 },
      { x: 1, y: 1, v: 2.5 },
    ];
    expect(() => expandOf(pointSpec({ kind: 'field', value: 'v' }), { d: data })).toThrow(
      /shape requires a categorical field/,
    );
  });

  it('shape_temporal_field_fails_loud', () => {
    const data = [
      { x: 0, y: 0, t: '2024-01-01' },
      { x: 1, y: 1, t: '2024-02-01' },
    ];
    expect(() => expandOf(pointSpec({ kind: 'field', value: 't' }), { d: data })).toThrow(
      /shape requires a categorical field/,
    );
  });

  // shape、color 与 size 可以同时生效
  it('shape_with_color_and_size_coexist', () => {
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
          shape: { kind: 'field', value: 'g' },
          size: { kind: 'field', value: 'p' },
          color: { kind: 'field', value: 'g', scale: 'col' },
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        },
      ],
    });
    const data = [
      { x: 0, y: 0, g: 'A', p: 1 },
      { x: 1, y: 1, g: 'B', p: 4 },
    ];
    const nodes = collectNodes(firstLayer(spec, { d: data }));
    expect(
      nodes.every(n => shapeOf(n) !== undefined && (n as { minimumSize?: number }).minimumSize !== undefined),
    ).toBe(true);
  });
});
