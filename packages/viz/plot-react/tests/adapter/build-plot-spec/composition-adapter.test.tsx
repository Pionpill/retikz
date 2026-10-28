import type { IRPlot } from '@retikz/plot';
import { AxisGridApplyTo, PlotSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { buildPlotIR } from '../../../src/adapter';
import { PlotAxis } from '../../../src/components/guides';
import { IntervalMark, PointMark } from '../../../src/components/marks';
import { PlotScale } from '../../../src/components/scales';

describe('buildPlotIR 组成适配器表面', () => {
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

  it('通过 schema 传递组合 coordinateView 和轴放置', () => {
    const spec = buildPlotIR(
      <>
        <PointMark
          coordinateView="temp"
          encodings={{ position: { x: { field: 'day' }, y: { field: 'temperature' } } }}
        />
        <IntervalMark
          coordinateView="rain"
          encodings={{ position: { x: { field: 'day' }, y: { field: 'rainfall' } } }}
        />
        <PlotAxis coordinateView="rain" dimension="y" placement={{ kind: 'side', side: 'right' }} title="Rainfall" />
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

  it('通过 schema 传递轴网格目标选择器', () => {
    const spec = buildPlotIR(
      <>
        <PointMark
          coordinateView="temp"
          encodings={{ position: { x: { field: 'day' }, y: { field: 'temperature' } } }}
        />
        <PlotAxis
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

  it('从声明的比例填充合成视图坐标比例绑定', () => {
    const spec = buildPlotIR(
      <>
        <PlotScale dimension="x" type="linear" />
        <PlotScale dimension="y" type="linear" />
        <PointMark encodings={{ position: { x: { field: 'day' }, y: { field: 'temperature' } } }} />
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

  it('从声明的比例填充共享基础结构坐标比例绑定', () => {
    const spec = buildPlotIR(
      <>
        <PlotScale dimension="x" type="linear" />
        <PlotScale dimension="y" type="linear" />
        <PointMark coordinateView="events" encodings={{ position: { x: { field: 'week' }, y: { field: 'count' } } }} />
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
