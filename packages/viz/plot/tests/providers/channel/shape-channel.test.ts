import type { IRNode, IRScope } from '@retikz/core';
import type { IRShapeValue } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import { lowerPlots } from '../../../src/pipeline/expand';
import { lowerPlot } from '../../../src/pipeline/expand/lower';
import { PLOT_SHAPE_PALETTE } from '../../../src/providers';
import type { IRPlot, IRPlotChannel } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

const cartOpts: LowerPlotsOptions = { layout: { width: 480, height: 300 } };

const expandOf = (spec: IRPlot, datasets: Record<string, Array<Record<string, unknown>>>): IRScope => {
  return lowerPlot(spec, datasets, { ...cartOpts, textMeasurer: measureLabel }) as IRScope;
};

const firstLayer = (spec: IRPlot, datasets: Record<string, Array<Record<string, unknown>>>): IRScope =>
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

const pointSpec = (shape: IRPlotChannel | undefined, fixedShape?: IRShapeValue): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [
      {
        type: 'point',
        encodings: { position: { x: { field: 'x' }, y: { field: 'y' } }, ...(shape === undefined ? {} : { shape }) },
        ...(fixedShape === undefined ? {} : { properties: { shape: fixedShape } }),
      },
    ],
  });

describe('shape channel 类别映射', () => {
  it('形状字段将类别映射到调色板', () => {
    const data = [
      { x: 0, y: 0, g: 'A' },
      { x: 1, y: 1, g: 'B' },
      { x: 2, y: 2, g: 'A' },
    ];
    const nodes = collectNodes(firstLayer(pointSpec('g'), { d: data }));

    expect(shapeOf(nodes[0])).toBe(PLOT_SHAPE_PALETTE[0]);
    expect(shapeOf(nodes[1])).toBe(PLOT_SHAPE_PALETTE[1]);
    expect(shapeOf(nodes[2])).toBe(PLOT_SHAPE_PALETTE[0]);
  });

  it('形状调色板循环使用', () => {
    const cats = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
    const data = cats.map((g, i) => ({ x: i, y: i, g }));
    const nodes = collectNodes(firstLayer(pointSpec('g'), { d: data }));

    expect(PLOT_SHAPE_PALETTE).toHaveLength(8);
    expect(nodes.map(shapeOf)).toEqual([...PLOT_SHAPE_PALETTE, PLOT_SHAPE_PALETTE[0]]);
  });

  it('形状调色板与核心形状提供者一起编译', () => {
    const data = [
      { x: 0, y: 0, g: 'A' },
      { x: 1, y: 1, g: 'B' },
      { x: 2, y: 2, g: 'C' },
      { x: 3, y: 3, g: 'D' },
    ];
    const spec = pointSpec('g');
    const [definition] = lowerPlots({ d: data }, cartOpts);

    expect(
      () =>
        compileToScene({ version: 1, type: 'scene', children: [spec] }, { composites: [definition], padding: 0 }).scene,
    ).not.toThrow();
  });

  it('defaultPlot 形状调色板保留结构化参考', () => {
    const custom = [{ type: 'polygon', params: { sides: 5, rotate: -90 } }, 'cross'] satisfies Array<IRShapeValue>;
    const spec = PlotSchema.parse({
      ...pointSpec('g'),
      defaultPlot: { palette: { shape: custom } },
    });
    const data = [
      { x: 0, y: 0, g: 'A' },
      { x: 1, y: 1, g: 'B' },
      { x: 2, y: 2, g: 'C' },
    ];
    const nodes = collectNodes(firstLayer(spec, { d: data }));

    expect(nodes.map(shapeOf)).toEqual([custom[0], custom[1], custom[0]]);
  });

  it('形状值常量', () => {
    const data = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    const nodes = collectNodes(firstLayer(pointSpec(undefined, 'diamond'), { d: data }));

    expect(nodes.every(n => shapeOf(n) === 'diamond')).toBe(true);
  });

  it('形状无通道无形状覆盖', () => {
    const data = [{ x: 0, y: 0 }];
    const nodes = collectNodes(firstLayer(pointSpec(undefined), { d: data }));

    expect(nodes.every(n => shapeOf(n) === undefined)).toBe(true);
  });

  // continuous / temporal 字段必须 fail-loud
  it('连续类型的形状字段明确报错', () => {
    const data = [
      { x: 0, y: 0, v: 1.5 },
      { x: 1, y: 1, v: 2.5 },
    ];

    expect(() => expandOf(pointSpec('v'), { d: data })).toThrow(/shape requires a categorical field/);
  });

  it('时间类型的形状字段明确报错', () => {
    const data = [
      { x: 0, y: 0, t: '2024-01-01' },
      { x: 1, y: 1, t: '2024-02-01' },
    ];

    expect(() => expandOf(pointSpec('t'), { d: data })).toThrow(/shape requires a categorical field/);
  });

  // shape、color 与 size 可以同时生效
  it('形状与颜色和尺寸共存', () => {
    const spec = PlotSchema.parse({
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
          encodings: {
            shape: 'g',
            size: 'p',
            color: { field: 'g', scale: 'col' },
            position: { x: { field: 'x' }, y: { field: 'y' } },
          },
        },
      ],
    });
    const data = [
      { x: 0, y: 0, g: 'A', p: 1 },
      { x: 1, y: 1, g: 'B', p: 4 },
    ];
    const nodes = collectNodes(firstLayer(spec, { d: data }));

    expect(nodes.every(n => shapeOf(n) !== undefined && n.layout?.minimumSize !== undefined)).toBe(true);
  });
});
