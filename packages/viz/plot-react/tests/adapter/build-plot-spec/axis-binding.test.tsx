import { PlotSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { buildPlotIR } from '../../../src/adapter';
import { PlotAxis } from '../../../src/components/guides';
import { PathMark, PointMark } from '../../../src/components/marks';

describe('buildPlotIR alpha.14 ADR-08 axis binding sugar', () => {
  it('react_y_axis_binding_generates_overlay_composition', () => {
    const spec = buildPlotIR(
      <>
        <PlotAxis dimension="x" title="day" />
        <PlotAxis id="temperature" dimension="y" placement={{ kind: 'side', side: 'left' }} title="Temperature" />
        <PlotAxis id="rainfall" dimension="y" placement={{ kind: 'side', side: 'right' }} title="Rainfall" grid />
        <PathMark x="day" y="temperature" yAxisId="temperature" />
        <PathMark x="day" y="rainfall" yAxisId="rainfall" />
      </>,
      'weather',
    );

    expect(spec.coordinate).toBeUndefined();
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
    expect(spec.scales).toEqual([
      { type: 'linear', name: '__x' },
      { type: 'linear', name: '__y.default' },
      { type: 'linear', name: '__y.temperature' },
      { type: 'linear', name: '__y.rainfall' },
    ]);
    expect(spec.marks).toMatchObject([
      { type: 'path', coordinateView: 'temperature' },
      { type: 'path', coordinateView: 'rainfall' },
    ]);
    expect(spec.guides).toMatchObject([
      { type: 'axis', dimension: 'x' },
      { type: 'axis', id: 'temperature', dimension: 'y', coordinateView: 'temperature' },
      { type: 'axis', id: 'rainfall', dimension: 'y', coordinateView: 'rainfall', grid: true },
    ]);
    expect(JSON.stringify(spec)).not.toContain('yAxisId');
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('y_axis_binding_supplies_scales_when_position_inference_is_deferred', () => {
    const spec = buildPlotIR(
      <>
        <PlotAxis dimension="x" title="day" />
        <PlotAxis id="temperature" dimension="y" title="temperature" />
        <PlotAxis id="rainfall" dimension="y" title="rainfall" />
        <PathMark x="day" y="temperature" yAxisId="temperature" />
        <PathMark x="day" y="rainfall" yAxisId="rainfall" />
      </>,
      'weather',
      { deferPositionScaleInference: true },
    );

    expect(spec.scales).toEqual([
      { type: 'linear', name: '__x' },
      { type: 'linear', name: '__y.default' },
      { type: 'linear', name: '__y.temperature' },
      { type: 'linear', name: '__y.rainfall' },
    ]);
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('react_x_axis_binding_generates_overlay_composition', () => {
    const spec = buildPlotIR(
      <>
        <PlotAxis id="elapsed" dimension="x" placement={{ kind: 'side', side: 'bottom' }} title="elapsed day" />
        <PlotAxis id="date" dimension="x" placement={{ kind: 'side', side: 'top' }} title="date" />
        <PlotAxis dimension="y" title="revenue" />
        <PathMark x="elapsedDay" y="revenue" xAxisId="elapsed" />
        <PointMark x="dateIndex" y="revenue" xAxisId="date" />
      </>,
      'schedule',
    );

    expect(spec.coordinate).toBeUndefined();
    expect(spec.composition).toEqual({
      defaultView: 'default',
      views: [
        { id: 'default', coordinate: { type: 'cartesian2D', x: '__x.default', y: '__y' } },
        {
          id: 'elapsed',
          coordinate: { type: 'cartesian2D', x: '__x.elapsed', y: '__y' },
          placement: { kind: 'overlay', target: 'default' },
        },
        {
          id: 'date',
          coordinate: { type: 'cartesian2D', x: '__x.date', y: '__y' },
          placement: { kind: 'overlay', target: 'default' },
        },
      ],
    });
    expect(spec.scales).toEqual([
      { type: 'linear', name: '__x.default' },
      { type: 'linear', name: '__x.elapsed' },
      { type: 'linear', name: '__x.date' },
      { type: 'linear', name: '__y' },
    ]);
    expect(spec.marks).toMatchObject([
      { type: 'path', coordinateView: 'elapsed' },
      { type: 'point', coordinateView: 'date' },
    ]);
    expect(spec.guides).toMatchObject([
      { type: 'axis', id: 'elapsed', dimension: 'x', coordinateView: 'elapsed' },
      { type: 'axis', id: 'date', dimension: 'x', coordinateView: 'date' },
      { type: 'axis', dimension: 'y' },
    ]);
    expect(JSON.stringify(spec)).not.toContain('xAxisId');
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('axis_binding_omitted_keeps_single_coordinate', () => {
    const spec = buildPlotIR(
      <>
        <PlotAxis dimension="x" />
        <PlotAxis id="temperature" dimension="y" />
        <PathMark x="day" y="temperature" />
      </>,
      'weather',
    );

    expect(spec.coordinate).toEqual({ type: 'cartesian2D', x: '__x', y: '__y' });
    expect(spec.composition).toBeUndefined();
  });

  it('marks_without_y_axis_id_bind_to_default_axis_in_binding_mode', () => {
    const spec = buildPlotIR(
      <>
        <PlotAxis id="temperature" dimension="y" />
        <PlotAxis id="rainfall" dimension="y" />
        <PathMark x="day" y="temperature" yAxisId="temperature" />
        <PointMark x="day" y="label" />
      </>,
      'weather',
    );

    expect(spec.marks).toMatchObject([
      { type: 'path', coordinateView: 'temperature' },
      { type: 'point', coordinateView: 'default' },
    ]);
  });

  it('default_y_axis_id_binds_to_dimension_default_scope', () => {
    const spec = buildPlotIR(
      <>
        <PlotAxis id="rainfall" dimension="y" />
        <PathMark x="day" y="temperature" yAxisId="default" />
        <PathMark x="day" y="rainfall" yAxisId="rainfall" />
      </>,
      'weather',
    );

    expect(spec.composition).toMatchObject({
      defaultView: 'default',
      views: [
        { id: 'default', coordinate: { y: '__y.default' } },
        { id: 'rainfall', coordinate: { y: '__y.rainfall' }, placement: { kind: 'overlay', target: 'default' } },
      ],
    });
    expect(spec.marks).toMatchObject([
      { type: 'path', coordinateView: 'default' },
      { type: 'path', coordinateView: 'rainfall' },
    ]);
  });

  it('explicit_composition_with_same_named_scope_accepts_y_axis_id', () => {
    const spec = buildPlotIR(
      <>
        <PlotAxis id="temperature" dimension="y" />
        <PlotAxis id="rainfall" dimension="y" />
        <PathMark x="day" y="temperature" yAxisId="temperature" />
        <PathMark x="day" y="rainfall" yAxisId="rainfall" />
      </>,
      'weather',
      {
        composition: {
          defaultView: 'default',
          views: [
            { id: 'default', coordinate: { type: 'cartesian2D' } },
            {
              id: 'temperature',
              coordinate: { type: 'cartesian2D' },
              placement: { kind: 'overlay', target: 'default' },
            },
            { id: 'rainfall', coordinate: { type: 'cartesian2D' }, placement: { kind: 'overlay', target: 'default' } },
          ],
        },
      },
    );

    expect(spec.composition?.defaultView).toBe('default');
    expect(spec.marks).toMatchObject([
      { type: 'path', coordinateView: 'temperature' },
      { type: 'path', coordinateView: 'rainfall' },
    ]);
    expect(spec.guides).toMatchObject([
      { type: 'axis', id: 'temperature', coordinateView: 'temperature' },
      { type: 'axis', id: 'rainfall', coordinateView: 'rainfall' },
    ]);
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('rejects invalid y axis binding inputs', () => {
    expect(() =>
      buildPlotIR(
        <>
          <PlotAxis id="left" dimension="y" />
          <PathMark x="day" y="temperature" yAxisId="missing" />
        </>,
        'weather',
      ),
    ).toThrow(/missing.*y axis/i);

    expect(() =>
      buildPlotIR(
        <>
          <PlotAxis id="left" dimension="x" />
          <PathMark x="day" y="temperature" yAxisId="left" />
        </>,
        'weather',
      ),
    ).toThrow(/dimension.*y/i);

    expect(() =>
      buildPlotIR(
        <>
          <PlotAxis id="left" dimension="y" />
          <PlotAxis id="left" dimension="y" />
          <PathMark x="day" y="temperature" yAxisId="left" />
        </>,
        'weather',
      ),
    ).toThrow(/duplicate.*axis id/i);

    expect(() =>
      buildPlotIR(
        <>
          <PlotAxis id="left" dimension="y" />
          <PathMark coordinateView="left" x="day" y="temperature" yAxisId="left" />
        </>,
        'weather',
      ),
    ).toThrow(/coordinateView.*yAxisId/i);
  });

  it('rejects axis binding outside cartesian2D and missing explicit scopes', () => {
    expect(() =>
      buildPlotIR(
        <>
          <PlotAxis id="left" dimension="y" />
          <PathMark x="day" y="temperature" yAxisId="left" />
        </>,
        'weather',
        { coordinate: 'polar2D' },
      ),
    ).toThrow(/cartesian2D/i);

    expect(() =>
      buildPlotIR(
        <>
          <PlotAxis id="left" dimension="y" />
          <PathMark x="day" y="temperature" yAxisId="left" />
        </>,
        'weather',
        { composition: { defaultView: 'default', views: [{ id: 'default', coordinate: { type: 'cartesian2D' } }] } },
      ),
    ).toThrow(/left.*view/i);
  });
});
