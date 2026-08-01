import type { IRPlotSpec } from '@retikz/plot';
import type { ReactNode } from 'react';

import { describe, expect, it } from 'vitest';

import { buildPlotSpec, resolveLabelOf } from '../../../src/adapter';
import { Axis, Legend } from '../../../src/components/guides';
import { TitleLabel } from '../../../src/components/labels';
import { IntervalMark, PathMark, PointMark } from '../../../src/components/marks';
import { Scale } from '../../../src/components/scales';
import { Transform } from '../../../src/components/transform';
import { resolvePlotRuntime } from '../../../src/plot-runtime';

describe('Plot member extraction characterization', () => {
  it('preserves mixed members, automatic bindings, shortcuts, labels, and runtime callbacks', () => {
    const resolvePointLabel = (row: Record<string, unknown>): string => String(row.category);
    const spec = buildPlotSpec(
      <>
        <Transform kind="sort" field="y" order="descending" />
        <PointMark id="points" x="x" y="y" fill="category" resolveLabel={resolvePointLabel} />
        <PathMark id="trend" x="x" y="y" order="x" series="category" />
        <IntervalMark id="bars" x="category" y="value" />
        <Scale dimension="y" type="log" base={2} />
        <Axis dimension="x" grid />
        <Legend channel="color" title="Category" />
        <TitleLabel text="Mixed members" />
      </>,
      'rows',
      {
        transforms: [{ kind: 'sort', field: 'category', order: 'ascending' }],
        markTransformShortcuts: [
          {
            markType: 'point',
            build: () => [{ kind: 'sort', field: 'x', order: 'ascending' }],
          },
        ],
        dataFieldNames: new Set(['x', 'y', 'value', 'category']),
      },
    );
    const expected: IRPlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'rows' },
      transform: [
        { kind: 'sort', field: 'category', order: 'ascending' },
        { kind: 'sort', field: 'y', order: 'descending' },
        { kind: 'sort', field: 'x', order: 'ascending' },
      ],
      scales: [
        { type: 'band', name: '__x' },
        { type: 'log', name: '__y', base: 2 },
        { type: 'ordinal', name: '__color' },
      ],
      labels: [{ type: 'text', role: 'title', text: 'Mixed members' }],
      coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
      marks: [
        {
          type: 'point',
          id: 'points',
          fill: { kind: 'field', value: 'category' },
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        },
        {
          type: 'path',
          id: 'trend',
          order: 'x',
          series: 'category',
          encoding: {
            x: { field: 'x' },
            y: { field: 'y' },
            color: { field: 'category', scale: '__color' },
          },
        },
        {
          type: 'interval',
          id: 'bars',
          encoding: { x: { field: 'category' }, y: { field: 'value' } },
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
      <PointMark key="point" x="x" y="y" />,
      [null, false, <PathMark key="path" x="x" y="y" order="x" />],
      new Set<ReactNode>([undefined, <Axis key="axis" dimension="y" grid />]),
    ];
    const flat = (
      <>
        <PointMark x="x" y="y" />
        <PathMark x="x" y="y" order="x" />
        <Axis dimension="y" grid />
      </>
    );

    const nestedSpec = buildPlotSpec(nested, 'rows');
    const flatSpec = buildPlotSpec(flat, 'rows');

    expect(nestedSpec).toEqual(flatSpec);
    expect(nestedSpec.marks).toEqual([
      { type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } },
      { type: 'path', order: 'x', encoding: { x: { field: 'x' }, y: { field: 'y' } } },
    ]);
    expect(nestedSpec.guides).toEqual([{ type: 'axis', dimension: 'y', grid: true }]);
  });

  it('collects resolveLabel for polar interval marks through the runtime sidecar', () => {
    const resolveSectorLabel = (row: { category?: string }) => row.category ?? '';
    const spec = buildPlotSpec(
      <IntervalMark id="sectors" angle="value" color="category" resolveLabel={resolveSectorLabel} />,
      'rows',
      { coordinate: 'polar2D' },
    );

    expect(resolveLabelOf(spec)).toEqual({ sectors: resolveSectorLabel });
    expect(JSON.stringify(spec)).not.toContain('resolveLabel');
  });

  it('preserves explicit composition and multi-axis binding normalization', () => {
    const spec = buildPlotSpec(
      <>
        <Axis dimension="x" />
        <Axis id="temperature" dimension="y" />
        <Axis id="rainfall" dimension="y" grid />
        <PathMark x="day" y="temperature" yAxisId="temperature" />
        <PointMark x="day" y="rainfall" yAxisId="rainfall" />
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
    const runtime = resolvePlotRuntime({
      data: [
        { x: 1, y: 2, category: 'north' },
        { x: 2, y: 3, category: 'south' },
      ],
      children: <PointMark x="x" y="y" fill="category" />,
    });

    expect(runtime.spec.marks[0]).toEqual({
      type: 'point',
      fill: { kind: 'field', value: 'category' },
      encoding: { x: { field: 'x' }, y: { field: 'y' } },
    });
    expect(JSON.stringify(runtime.spec)).not.toContain('dataFieldNames');
  });
});
