import type { IRPlot } from '@retikz/plot';

import { AxisGridApplyTo, PlotSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { buildPlotIR } from '../../../src/adapter';
import { Axis } from '../../../src/components/guides';
import { IntervalMark, PointMark } from '../../../src/components/marks';
import { Scale } from '../../../src/components/scales';

describe('buildPlotIR composition adapter surface', () => {
  const composition: NonNullable<IRPlot['composition']> = {
    defaultView: 'temp',
    views: [
      { id: 'temp', coordinate: { type: 'cartesian2D', x: '__x', y: '__y' } },
      {
        id: 'rain',
        coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
        placement: { kind: 'overlay', target: 'temp' },
      },
    ],
  };

  it('passes composition coordinateView and axis placement through schema', () => {
    const spec = buildPlotIR(
      <>
        <PointMark coordinateView="temp" x="day" y="temperature" />
        <IntervalMark coordinateView="rain" x="day" y="rainfall" />
        <Axis coordinateView="rain" dimension="y" placement={{ kind: 'side', side: 'right' }} title="Rainfall" />
      </>,
      'weather',
      { composition },
    );
    expect(spec.coordinate).toBeUndefined();
    expect(spec.composition).toEqual(composition);
    expect(spec.marks[0]).toMatchObject({ type: 'point', coordinateView: 'temp' });
    expect(spec.marks[1]).toMatchObject({ type: 'interval', coordinateView: 'rain' });
    expect(spec.guides?.[0]).toMatchObject({
      type: 'axis',
      coordinateView: 'rain',
      placement: { kind: 'side', side: 'right' },
      title: 'Rainfall',
    });
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('passes axis grid target selectors through schema', () => {
    const spec = buildPlotIR(
      <>
        <PointMark coordinateView="temp" x="day" y="temperature" />
        <Axis
          coordinateView="temp"
          dimension="y"
          grid={{
            applyTo: AxisGridApplyTo.Selected,
            select: { view: ['temp'] },
          }}
        />
      </>,
      'weather',
      { composition },
    );

    expect(spec.guides?.[0]).toMatchObject({
      type: 'axis',
      dimension: 'y',
      grid: {
        applyTo: 'selected',
        select: { view: ['temp'] },
      },
    });
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('fills composition view coordinate scale bindings from declared scales', () => {
    const spec = buildPlotIR(
      <>
        <Scale dimension="x" type="linear" />
        <Scale dimension="y" type="linear" />
        <PointMark x="day" y="temperature" />
      </>,
      'weather',
      {
        composition: {
          defaultView: 'temp',
          views: [
            { id: 'temp', coordinate: { type: 'cartesian2D' } },
            {
              id: 'rain',
              coordinate: { type: 'cartesian2D' },
              placement: { kind: 'overlay', target: 'temp' },
            },
          ],
        },
      },
    );

    expect(spec.composition?.views?.map(scope => scope.coordinate)).toEqual([
      { type: 'cartesian2D', x: '__x', y: '__y' },
      { type: 'cartesian2D', x: '__x', y: '__y' },
    ]);
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('fills shared scaffold coordinate scale bindings from declared scales', () => {
    const spec = buildPlotIR(
      <>
        <Scale dimension="x" type="linear" />
        <Scale dimension="y" type="linear" />
        <PointMark coordinateView="events" x="week" y="count" />
      </>,
      'ops',
      {
        composition: {
          defaultView: 'events',
          arrangements: [
            {
              kind: 'tracks',
              id: 'ops',
              coordinate: { type: 'cartesian2D' },
              sharedRoles: ['x'],
              tracks: [{ id: 'events', view: 'events', band: { role: 'y', start: 0, end: 1 } }],
            },
          ],
        },
      },
    );

    expect(spec.composition?.arrangements?.[0]).toMatchObject({
      kind: 'tracks',
      coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
    });
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });
});
