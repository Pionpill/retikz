import type { IRPlot } from '@retikz/plot';
import { resolveLabelOf, normalizePlotDeclarations } from '@retikz/plot-vanilla';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { buildPlotIR } from '../../../src/adapter';
import { PlotAxis, PlotLegend } from '../../../src/components/guides';
import { IntervalMark, PathMark, PointMark } from '../../../src/components/marks';
import { PlotScale } from '../../../src/components/scales';
import { PlotTransform } from '../../../src/components/transform';
import { resolvePlotAuthoring } from '../../../src/plot-runtime';

describe('Plot member extraction characterization', () => {
  it.each([false, 'max-radius', { kind: 'point-aware', clearance: { left: 0, default: 8 } }] as const)(
    'preserves autoPadding %j identically through React and Vanilla',
    autoPadding => {
      const react = buildPlotIR(
        <PointMark encodings={{ position: { x: 'x', y: 'y' } }} properties={{ autoPadding }} />,
        'rows',
      );
      const vanilla = normalizePlotDeclarations(
        {
          declarations: [
            {
              kind: 'point-mark',
              props: { encodings: { position: { x: 'x', y: 'y' } }, properties: { autoPadding } },
              path: [0],
            },
          ],
          runtimeSources: [],
        },
        { data: { reference: 'rows' }, mode: 'plot-root' },
      );
      expect(react.marks[0]).toEqual(vanilla.fragment.marks?.[0]);
      expect(react.marks[0]).toMatchObject({ properties: { autoPadding } });
    },
  );
  it('preserves mixed members, automatic bindings, shortcuts, and runtime callbacks', () => {
    const resolvePointLabel = (row: Record<string, unknown>): string => String(row.category);
    const spec = buildPlotIR(
      <>
        <PlotTransform operation={{ kind: 'sort', params: { field: 'y', order: 'descending' } }} />
        <PointMark
          id="points"
          resolveLabel={resolvePointLabel}
          encodings={{ fill: 'category', position: { x: 'x', y: 'y' } }}
        />
        <PathMark id="trend" encodings={{ order: 'x', series: 'category', position: { x: 'x', y: 'y' } }} />
        <IntervalMark id="bars" encodings={{ position: { x: 'category', y: 'value' } }} />
        <PlotScale dimension="y" type="log" base={2} />
        <PlotAxis dimension="x" grid />
        <PlotLegend channel="color" title="Category" />
      </>,
      'rows',
      {
        transforms: [{ operation: { kind: 'sort', params: { field: 'category', order: 'ascending' } } }],
        markTransformShortcuts: [
          {
            markType: 'point',
            build: () => [{ kind: 'sort', params: { field: 'x', order: 'ascending' } }],
          },
        ],
        dataFieldNames: new Set(['x', 'y', 'value', 'category']),
      },
    );
    const expected: IRPlot = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'rows' },
      transform: [
        { operation: { kind: 'sort', params: { field: 'category', order: 'ascending' } } },
        { operation: { kind: 'sort', params: { field: 'y', order: 'descending' } } },
        { operation: { kind: 'sort', params: { field: 'x', order: 'ascending' } } },
      ],
      scales: [
        { type: 'band', name: '__x' },
        { type: 'log', name: '__y', base: 2 },
        { type: 'ordinal', name: '__color' },
      ],
      coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
      marks: [
        { type: 'point', id: 'points', kind: 'data', encodings: { fill: 'category', position: { x: 'x', y: 'y' } } },
        {
          type: 'path',
          id: 'trend',
          kind: 'data',
          encodings: {
            order: 'x',
            series: 'category',
            color: { field: 'category', scale: '__color' },
            position: { x: 'x', y: 'y' },
          },
        },
        {
          type: 'interval',
          id: 'bars',
          kind: 'data',
          encodings: { position: { x: 'category', y: 'value' } },
          properties: { bounds: { x: { kind: 'band' }, y: { kind: 'span' } } },
        },
      ],
      guides: [
        { type: 'axis', dimension: 'x', grid: true },
        { type: 'legend', channel: 'color', title: 'Category' },
      ],
    };

    expect(spec).toEqual(expected);
    expect(resolveLabelOf(spec)).toEqual({ points: resolvePointLabel });
  });

  it('keeps raw nested arrays and generic iterables behavior-equivalent to flat children', () => {
    const nested: ReactNode = [
      <PointMark key="point" encodings={{ position: { x: 'x', y: 'y' } }} />,
      [null, false, <PathMark key="path" encodings={{ order: 'x', position: { x: 'x', y: 'y' } }} />],
      new Set<ReactNode>([undefined, <PlotAxis key="axis" dimension="y" grid />]),
    ];
    const flat = (
      <>
        <PointMark encodings={{ position: { x: 'x', y: 'y' } }} />
        <PathMark encodings={{ order: 'x', position: { x: 'x', y: 'y' } }} />
        <PlotAxis dimension="y" grid />
      </>
    );

    const nestedSpec = buildPlotIR(nested, 'rows');
    const flatSpec = buildPlotIR(flat, 'rows');

    expect(nestedSpec).toEqual(flatSpec);
    expect(nestedSpec.marks).toEqual([
      { type: 'point', kind: 'data', encodings: { position: { x: 'x', y: 'y' } } },
      { type: 'path', kind: 'data', encodings: { order: 'x', position: { x: 'x', y: 'y' } } },
    ]);
    expect(nestedSpec.guides).toEqual([{ type: 'axis', dimension: 'y', grid: true }]);
  });

  it('collects resolveLabel for polar interval marks through the runtime sidecar', () => {
    const resolveSectorLabel = (row: { category?: string }) => row.category ?? '';
    const spec = buildPlotIR(
      <IntervalMark id="sectors" angle="value" resolveLabel={resolveSectorLabel} encodings={{ color: 'category' }} />,
      'rows',
      { coordinate: 'polar2D' },
    );

    expect(resolveLabelOf(spec)).toEqual({ sectors: resolveSectorLabel });
    expect(JSON.stringify(spec)).not.toContain('resolveLabel');
  });

  it('preserves explicit composition and multi-axis binding normalization', () => {
    const spec = buildPlotIR(
      <>
        <PlotAxis dimension="x" />
        <PlotAxis id="temperature" dimension="y" />
        <PlotAxis id="rainfall" dimension="y" grid />
        <PathMark yAxisId="temperature" encodings={{ position: { x: 'day', y: 'temperature' } }} />
        <PointMark yAxisId="rainfall" encodings={{ position: { x: 'day', y: 'rainfall' } }} />
      </>,
      'weather',
    );

    expect(spec.composition).toEqual({
      defaultView: 'default',
      views: [
        { id: 'default', coordinate: { type: 'cartesian2D', x: '__x', y: '__y.default' } },
        {
          id: 'temperature',
          coordinate: { type: 'cartesian2D', x: '__x', y: '__y.temperature' },
          placement: { kind: 'overlay', target: 'default' },
        },
        {
          id: 'rainfall',
          coordinate: { type: 'cartesian2D', x: '__x', y: '__y.rainfall' },
          placement: { kind: 'overlay', target: 'default' },
        },
      ],
    });
    expect(spec.marks).toMatchObject([
      { type: 'path', coordinateView: 'temperature' },
      { type: 'point', coordinateView: 'rainfall' },
    ]);
    expect(spec.guides).toMatchObject([
      { type: 'axis', dimension: 'x' },
      { type: 'axis', id: 'temperature', dimension: 'y', coordinateView: 'temperature' },
      { type: 'axis', id: 'rainfall', dimension: 'y', grid: true, coordinateView: 'rainfall' },
    ]);
  });

  it('keeps row-derived style fields runtime-only when no model is declared', () => {
    const runtime = resolvePlotAuthoring({
      data: [
        { x: 1, y: 2, category: 'north' },
        { x: 2, y: 3, category: 'south' },
      ],
      children: <PointMark encodings={{ fill: 'category', position: { x: 'x', y: 'y' } }} />,
    });

    expect(runtime.spec.marks[0]).toEqual({
      type: 'point',
      kind: 'data',
      encodings: { fill: 'category', position: { x: 'x', y: 'y' } },
    });
    expect(JSON.stringify(runtime.spec)).not.toContain('dataFieldNames');
  });
});
