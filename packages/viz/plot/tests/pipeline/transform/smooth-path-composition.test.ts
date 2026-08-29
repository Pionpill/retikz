import type { IRPath, IRScope } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import type { IRPlot } from '../../../src/schemas';

import { lowerPlotWithLineage } from '../../../src';
import { lowerPlot } from '../../../src/pipeline/expand/lower';
import { PlotSchema } from '../../../src/schemas';

const opts: LowerPlotsOptions = { width: 480, height: 300 };

const expandOf = (
  spec: IRPlot,
  datasets: Record<string, Array<Record<string, unknown>>>,
  options?: LowerPlotsOptions,
): IRScope => {
  return lowerPlot(spec, datasets, options) as IRScope;
};

describe('smooth path composition (contract)', () => {
  const samples = [
    { group: 'A', time: 0, value: 1 },
    { group: 'A', time: 1, value: 3 },
    { group: 'A', time: 2, value: 5 },
    { group: 'B', time: 0, value: 10 },
    { group: 'B', time: 1, value: 8 },
    { group: 'B', time: 2, value: 6 },
  ];

  it('smooth rows can be consumed by PathMark without SmoothMark', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'samples' },
      transform: [
        {
          kind: 'smooth',
          x: 'time',
          y: 'value',
          groupBy: ['group'],
          sampleCount: 4,
          xAs: 'trendX',
          yAs: 'trendY',
        },
      ],
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'ordinal', name: 'color' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'path',
          series: 'group',
          order: 'trendX',
          encoding: { x: { field: 'trendX' }, y: { field: 'trendY' }, color: { field: 'group', scale: 'color' } },
        },
      ],
    });

    const layer = expandOf(spec, { samples }, opts).children[0] as IRScope;
    expect(layer.children).toHaveLength(2);
    for (const seriesScope of layer.children as Array<IRScope>) {
      expect(seriesScope.type).toBe('scope');
      const path = seriesScope.children[0] as IRPath;
      expect(path.type).toBe('path');
      expect(path.children).toHaveLength(4);
      expect(path.children.at(-1)).not.toEqual({ type: 'step', kind: 'cycle' });
    }
  });

  it('smooth mark-local transform only affects the path layer that declares it', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'samples' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        { type: 'point', encoding: { x: { field: 'time' }, y: { field: 'value' } } },
        {
          type: 'path',
          transform: [{ kind: 'smooth', x: 'time', y: 'value', sampleCount: 5, xAs: 'trendX', yAs: 'trendY' }],
          order: 'trendX',
          encoding: { x: { field: 'trendX' }, y: { field: 'trendY' } },
        },
      ],
    });

    const outer = expandOf(spec, { samples: samples.slice(0, 3) }, opts);
    const pointLayer = outer.children[0] as IRScope;
    const pathLayer = outer.children[1] as IRScope;
    expect(pointLayer.children).toHaveLength(3);
    expect(pathLayer.children).toHaveLength(1);
    expect((pathLayer.children[0] as IRPath).children).toHaveLength(5);
  });

  it('fits the current rows of every facet panel and records the actual mark outputs', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'facetRows' },
      scales: [
        { type: 'linear', name: 'xScale' },
        { type: 'linear', name: 'yScale' },
      ],
      composition: {
        defaultView: 'root',
        views: [{ id: 'root', coordinate: { type: 'cartesian2D', x: 'xScale', y: 'yScale' } }],
        arrangements: [{ kind: 'facet', id: 'panel', view: 'root', column: { field: 'panel' } }],
      },
      marks: [
        {
          type: 'path',
          order: 'trendX',
          transform: [{ kind: 'smooth', x: 'x', y: 'y', sampleCount: 2, xAs: 'trendX', yAs: 'trendY' }],
          encoding: { x: { field: 'trendX' }, y: { field: 'trendY' } },
        },
      ],
    });
    const result = lowerPlotWithLineage(
      spec,
      {
        facetRows: [
          { panel: 'A', x: 1, y: 2 },
          { panel: 'A', x: 2, y: 4 },
          { panel: 'B', x: 1, y: 10 },
          { panel: 'B', x: 2, y: 20 },
        ],
      },
      {
        width: 480,
        height: 300,
        lineage: { rowValues: { maxRows: 10, fields: ['trendX', 'trendY'] } },
      },
    );

    expect(result.lineage.marks[0]?.rowValues).toEqual([
      { trendX: 1, trendY: 2 },
      { trendX: 2, trendY: 4 },
      { trendX: 1, trendY: 10 },
      { trendX: 2, trendY: 20 },
    ]);
  });

  it('keeps grouped regression rows in data space when coordinate projection changes', () => {
    const specOf = (coordinate: Readonly<Record<string, unknown>>): IRPlot =>
      PlotSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'coordinateRows' },
        scales: [
          { type: 'linear', name: 'xScale' },
          { type: 'linear', name: 'yScale' },
          { type: 'ordinal', name: 'colorScale' },
        ],
        coordinate,
        marks: [
          {
            type: 'path',
            series: 'series',
            order: 'trendX',
            transform: [
              {
                kind: 'smooth',
                x: 'x',
                y: 'y',
                groupBy: ['series'],
                sampleCount: 2,
                xAs: 'trendX',
                yAs: 'trendY',
              },
            ],
            encoding: {
              x: { field: 'trendX' },
              y: { field: 'trendY' },
              color: { field: 'series', scale: 'colorScale' },
            },
          },
        ],
      });
    const coordinateRows = [
      { series: 'A', x: 1, y: 2 },
      { series: 'A', x: 2, y: 4 },
      { series: 'B', x: 1, y: 3 },
      { series: 'B', x: 2, y: 5 },
    ];
    const options = {
      width: 480,
      height: 300,
      lineage: { rowValues: { maxRows: 10, fields: ['series', 'trendX', 'trendY'] } },
    };
    const cartesian = lowerPlotWithLineage(
      specOf({ type: 'cartesian2D', x: 'xScale', y: 'yScale' }),
      { coordinateRows },
      options,
    );
    const polar = lowerPlotWithLineage(
      specOf({ type: 'polar2D', angle: 'xScale', radius: 'yScale' }),
      { coordinateRows },
      options,
    );

    expect(cartesian.lineage.marks[0]?.rowValues).toEqual([
      { series: 'A', trendX: 1, trendY: 2 },
      { series: 'A', trendX: 2, trendY: 4 },
      { series: 'B', trendX: 1, trendY: 3 },
      { series: 'B', trendX: 2, trendY: 5 },
    ]);
    expect(polar.lineage.marks[0]?.rowValues).toEqual(cartesian.lineage.marks[0]?.rowValues);
    expect(polar.children).not.toEqual(cartesian.children);
  });
});
