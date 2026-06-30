import type { PlotSpec } from '@retikz/plot';

import { AxisGridApplyTo, PlotSpecSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { buildPlotSpec } from '../../../src/components/build-plot-spec';
import { Axis } from '../../../src/components/guides';
import { IntervalMark, PointMark } from '../../../src/components/marks';
import { Scale } from '../../../src/components/scales';

describe('buildPlotSpec alpha.14 ADR-06 composition adapter surface', () => {
  const composition: NonNullable<PlotSpec['composition']> = {
    defaultScope: 'temp',
    scopes: [
      { id: 'temp', coordinate: { type: 'cartesian2D', x: '__x', y: '__y' } },
      {
        id: 'rain',
        coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
        placement: { kind: 'overlay', target: 'temp' },
      },
    ],
  };

  it('passes composition coordinateScope and axis placement through schema', () => {
    const spec = buildPlotSpec(
      <>
        <PointMark coordinateScope="temp" x="day" y="temperature" />
        <IntervalMark coordinateScope="rain" x="day" y="rainfall" />
        <Axis coordinateScope="rain" dimension="y" placement={{ kind: 'side', side: 'right' }} title="Rainfall" />
      </>,
      'weather',
      { composition },
    );
    expect(spec.coordinate).toBeUndefined();
    expect(spec.composition).toEqual(composition);
    expect(spec.marks[0]).toMatchObject({ type: 'point', coordinateScope: 'temp' });
    expect(spec.marks[1]).toMatchObject({ type: 'interval', coordinateScope: 'rain' });
    expect(spec.guides?.[0]).toMatchObject({
      type: 'axis',
      coordinateScope: 'rain',
      placement: { kind: 'side', side: 'right' },
      title: 'Rainfall',
    });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('passes axis grid target selectors through schema', () => {
    const spec = buildPlotSpec(
      <>
        <PointMark coordinateScope="temp" x="day" y="temperature" />
        <Axis
          coordinateScope="temp"
          dimension="y"
          grid={{
            applyTo: AxisGridApplyTo.Selected,
            select: { scopes: ['temp'] },
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
        select: { scopes: ['temp'] },
      },
    });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('fills composition scope coordinate scale bindings from declared scales', () => {
    const spec = buildPlotSpec(
      <>
        <Scale dimension="x" type="linear" />
        <Scale dimension="y" type="linear" />
        <PointMark x="day" y="temperature" />
      </>,
      'weather',
      {
        composition: {
          defaultScope: 'temp',
          scopes: [
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

    expect(spec.composition?.scopes.map(scope => scope.coordinate)).toEqual([
      { type: 'cartesian2D', x: '__x', y: '__y' },
      { type: 'cartesian2D', x: '__x', y: '__y' },
    ]);
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('fills shared scaffold coordinate scale bindings from declared scales', () => {
    const spec = buildPlotSpec(
      <>
        <Scale dimension="x" type="linear" />
        <Scale dimension="y" type="linear" />
        <PointMark coordinateScope="events" x="week" y="count" />
      </>,
      'ops',
      {
        composition: {
          defaultScope: 'events',
          scaffolds: [
            {
              id: 'ops',
              coordinate: { type: 'cartesian2D' },
              sharedRoles: ['x'],
              tracks: [{ id: 'events', band: { role: 'y', start: 0, end: 1 } }],
            },
          ],
          scopes: [{ id: 'events', placement: { kind: 'track', scaffold: 'ops', track: 'events' } }],
        },
      },
    );

    expect(spec.composition?.scaffolds?.[0]?.coordinate).toEqual({ type: 'cartesian2D', x: '__x', y: '__y' });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('rejects non-json composition values before they leave the adapter', () => {
    expect(() =>
      buildPlotSpec(<PointMark x="day" y="temperature" />, 'weather', {
        composition: {
          ...composition,
          layout: { panelGap: (() => 12) as unknown as number },
        },
      }),
    ).toThrow();
  });
});
