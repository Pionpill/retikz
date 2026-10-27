import type { IRNode, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { LowerPlotsOptions } from '../../src/pipeline/expand';
import { lowerPlotWithDataArtifact } from '../../src/pipeline/expand/lower';
import { PlotSchema } from '../../src/schemas';
import { measureLabel } from '../helpers/text-measurement';

const options: LowerPlotsOptions = { layout: { width: 480, height: 300 } };

const rows = [
  { x: 0, y: 1, category: 'A', value: 0 },
  { x: 1, y: 2, category: 'B', value: 50 },
  { x: 2, y: 3, category: 'C', value: 100 },
];

const lower = (source: unknown, extra: LowerPlotsOptions = {}): IRScope =>
  lowerPlotWithDataArtifact(PlotSchema.parse(source), { d: rows }, { textMeasurer: measureLabel, ...options, ...extra })
    .child as IRScope;

const nodesOf = (root: IRScope): Array<IRNode> => {
  const result: Array<IRNode> = [];

  const visit = (children: ReadonlyArray<unknown>): void => {
    for (const child of children) {
      const value = child as { type?: string; children?: ReadonlyArray<unknown> };
      if (value.type === 'node') result.push(child as IRNode);
      if (value.type === 'scope' && value.children) visit(value.children);
    }
  };

  visit(root.children);

  return result;
};

const base = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'd' },
  scales: [
    { type: 'linear', name: 'x' },
    { type: 'linear', name: 'y' },
  ],
  coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
} as const;

describe('Plot 默认调色板消费者', () => {
  it('从 defaultPlot 开始的时序方案到达真正比例尺的消费者', () => {
    const root = lower(
      {
        ...base,
        defaultPlot: { palette: { sequential: 'theme-sequential' } },
        scales: [...base.scales, { type: 'sequential', name: 'color', domain: [0, 100] }],
        marks: [
          {
            type: 'point',
            encodings: {
              color: { field: 'value', scale: 'color' },
              position: { x: { field: 'x' }, y: { field: 'y' } },
            },
          },
        ],
      },
      {
        colorSchemes: {
          'theme-sequential': (t: number): string => (t < 0.5 ? '#102030' : '#d0e0f0'),
        },
      },
    );
    const layers = (root.children[0] as IRScope).children as Array<IRScope>;

    expect(layers.map(layer => layer.defaults?.node?.style?.fill)).toEqual(['#102030', '#d0e0f0']);
    expect(layers.map(layer => layer.children.length)).toEqual([1, 2]);
  });

  it('明确的比例范围和标记颜色保留优先于调色板默认值', () => {
    const source = {
      ...base,
      defaultPlot: { palette: { categorical: ['#default-a', '#default-b'] } },
      scales: [...base.scales, { type: 'ordinal', name: 'color', range: ['#range-a', '#range-b'] }],
      marks: [
        {
          type: 'point',
          encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
          properties: { color: '#mark-color' },
        },
        {
          type: 'point',
          encodings: {
            color: { field: 'category', scale: 'color' },
            position: { x: { field: 'x' }, y: { field: 'y' } },
          },
        },
      ],
    };
    const root = lower(source);
    const [constantLayer, ordinalLayer] = root.children as Array<IRScope>;

    expect((constantLayer.children[0] as IRScope).defaults?.node?.style?.fill).toBe('#mark-color');
    expect((ordinalLayer.children[0] as IRScope).defaults?.node?.style?.fill).toBe('#range-a');
  });

  it('传奇色板消费者的分类调色板', () => {
    const source = {
      ...base,
      defaultPlot: { palette: { categorical: ['#legend-a', '#legend-b'] } },
      scales: [...base.scales, { type: 'ordinal', name: 'color' }],
      marks: [
        {
          type: 'point',
          encodings: {
            color: { field: 'category', scale: 'color' },
            position: { x: { field: 'x' }, y: { field: 'y' } },
          },
        },
      ],
      guides: [{ type: 'legend', channel: 'color', scale: 'color' }],
    };
    const legend = nodesOf(lower(source)).filter(node => node.text === undefined && node.style?.fill !== undefined);

    expect(legend.map(node => node.style?.fill)).toEqual(expect.arrayContaining(['#legend-a', '#legend-b']));
  });
});
