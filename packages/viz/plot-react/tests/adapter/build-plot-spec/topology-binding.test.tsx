import { PlotSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { buildPlotIR } from '../../../src/adapter';
import { PlotFacet, PlotScaffold, PlotTrack } from '../../../src/components/composition';
import { PlotAxis } from '../../../src/components/guides';
import { PathMark, PointMark } from '../../../src/components/marks';

describe('buildPlotIR alpha.14 topology binding sugar', () => {
  it('track_binding_generates_shared_scaffold_composition', () => {
    const spec = buildPlotIR(
      <>
        <PlotScaffold
          id="ops"
          sharedRoles={['x']}
          spacing={{ trackGap: 24, axisGap: 8, labelGap: 6 }}
          resolve={{ grid: { x: 'all', y: 'all' } }}
        >
          <PlotTrack id="incidents" band={{ role: 'y', start: 0, end: 0.42 }} />
          <PlotTrack id="load" band={{ role: 'y', start: 0.58, end: 1 }} />
        </PlotScaffold>
        <PathMark trackId="incidents" x="week" y="incidents" order="week" />
        <PathMark trackId="load" x="week" y="load" order="week" />
        <PlotAxis scaffoldId="ops" dimension="x" grid title="week" />
        <PlotAxis trackId="load" dimension="y" title="load" />
      </>,
      'ops',
    );

    expect(spec.coordinate).toBeUndefined();
    expect(spec.composition).toEqual({
      defaultView: 'incidents',
      arrangements: [
        {
          kind: 'tracks',
          id: 'ops',
          coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
          sharedRoles: ['x'],
          spacing: { trackGap: 24, axisGap: 8, labelGap: 6 },
          resolve: { grid: { x: 'all', y: 'all' } },
          tracks: [
            { id: 'incidents', view: 'incidents', band: { role: 'y', start: 0, end: 0.42 } },
            { id: 'load', view: 'load', band: { role: 'y', start: 0.58, end: 1 } },
          ],
        },
      ],
    });
    expect(spec.marks).toMatchObject([
      { type: 'path', coordinateView: 'incidents' },
      { type: 'path', coordinateView: 'load' },
    ]);
    expect(spec.guides).toMatchObject([
      { type: 'axis', dimension: 'x', coordinateView: 'incidents', grid: true },
      { type: 'axis', dimension: 'y', coordinateView: 'load' },
    ]);
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('track_binding_inherits_plot_coordinate_when_scaffold_coordinate_is_omitted', () => {
    const spec = buildPlotIR(
      <>
        <PlotScaffold id="radar" sharedRoles={['x']}>
          <PlotTrack id="signal" band={{ role: 'y', start: 0.12, end: 0.48 }} />
          <PlotTrack id="capacity" band={{ role: 'y', start: 0.58, end: 0.96 }} />
        </PlotScaffold>
        <PathMark trackId="signal" x="area" y="signal" order="order" />
        <PathMark trackId="capacity" x="area" y="capacity" order="order" />
        <PlotAxis scaffoldId="radar" dimension="x" grid title="area" />
      </>,
      'radar',
      { coordinate: { type: 'polar2D' } },
    );

    expect(spec.composition?.arrangements?.[0]).toMatchObject({
      kind: 'tracks',
      coordinate: {
        type: 'polar2D',
        angle: '__angle',
        radius: '__radius',
      },
    });
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('scaffold_track_container_scopes_child_axes_and_marks', () => {
    const spec = buildPlotIR(
      <PlotScaffold id="ops" sharedRoles={['x']}>
        <PlotAxis dimension="x" grid title="week" />
        <PlotTrack id="incidents" band={{ role: 'y', start: 0, end: 0.42 }}>
          <PlotAxis dimension="y" title="incidents" />
          <PathMark x="week" y="incidents" order="week" />
        </PlotTrack>
        <PlotTrack id="load" band={{ role: 'y', start: 0.58, end: 1 }}>
          <PlotAxis dimension="y" title="load" />
          <PointMark x="week" y="load" />
        </PlotTrack>
      </PlotScaffold>,
      'ops',
    );

    expect(spec.composition).toMatchObject({
      defaultView: 'incidents',
      arrangements: [
        {
          kind: 'tracks',
          id: 'ops',
          sharedRoles: ['x'],
          tracks: [
            { id: 'incidents', view: 'incidents', band: { role: 'y', start: 0, end: 0.42 } },
            { id: 'load', view: 'load', band: { role: 'y', start: 0.58, end: 1 } },
          ],
        },
      ],
    });
    expect(spec.marks).toMatchObject([
      { type: 'path', coordinateView: 'incidents' },
      { type: 'point', coordinateView: 'load' },
    ]);
    expect(spec.guides).toMatchObject([
      { type: 'axis', dimension: 'x', coordinateView: 'incidents', grid: true },
      { type: 'axis', dimension: 'y', coordinateView: 'incidents' },
      { type: 'axis', dimension: 'y', coordinateView: 'load' },
    ]);
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('facet_binding_generates_facet_composition', () => {
    const spec = buildPlotIR(
      <>
        <PlotFacet
          id="sales"
          row={{ field: 'channel', order: ['online', 'store'] }}
          column={{ field: 'region', order: ['north', 'south', 'west'] }}
          resolve={{ scale: { y: 'shared' }, axis: { x: 'outer', y: 'outer' }, grid: { x: 'local', y: 'local' } }}
          header={{ row: true, column: true }}
          spacing={{ panelGap: 24, axisGap: 8, labelGap: 6 }}
        />
        <PathMark facetId="sales" x="month" y="revenue" order="month" />
        <PointMark facetId="sales" x="month" y="revenue" />
        <PlotAxis facetId="sales" dimension="x" title="month" />
        <PlotAxis facetId="sales" dimension="y" grid title="revenue" />
      </>,
      'sales',
    );

    expect(spec.coordinate).toBeUndefined();
    expect(spec.composition).toEqual({
      defaultView: 'salesPanel',
      views: [{ id: 'salesPanel', coordinate: { type: 'cartesian2D', x: '__x', y: '__y' } }],
      arrangements: [
        {
          kind: 'facet',
          id: 'sales',
          view: 'salesPanel',
          row: { field: 'channel', order: ['online', 'store'] },
          column: { field: 'region', order: ['north', 'south', 'west'] },
          header: { row: true, column: true },
          spacing: { panelGap: 24, axisGap: 8, labelGap: 6 },
          resolve: { scale: { y: 'shared' }, axis: { x: 'outer', y: 'outer' }, grid: { x: 'local', y: 'local' } },
        },
      ],
    });
    expect(spec.marks).toMatchObject([
      { type: 'path', coordinateView: 'salesPanel' },
      { type: 'point', coordinateView: 'salesPanel' },
    ]);
    expect(spec.guides).toMatchObject([
      { type: 'axis', dimension: 'x', coordinateView: 'salesPanel' },
      { type: 'axis', dimension: 'y', coordinateView: 'salesPanel', grid: true },
    ]);
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('facet_container_scopes_child_axes_and_marks', () => {
    const spec = buildPlotIR(
      <PlotFacet id="sales" column="region">
        <PlotAxis dimension="x" title="month" />
        <PlotAxis dimension="y" grid title="revenue" />
        <PathMark x="month" y="revenue" order="month" />
        <PointMark x="month" y="revenue" />
      </PlotFacet>,
      'sales',
    );

    expect(spec.composition).toMatchObject({
      defaultView: 'salesPanel',
      views: [{ id: 'salesPanel', coordinate: { type: 'cartesian2D', x: '__x', y: '__y' } }],
      arrangements: [{ kind: 'facet', id: 'sales', view: 'salesPanel', column: { field: 'region' } }],
    });
    expect(spec.marks).toMatchObject([
      { type: 'path', coordinateView: 'salesPanel' },
      { type: 'point', coordinateView: 'salesPanel' },
    ]);
    expect(spec.guides).toMatchObject([
      { type: 'axis', dimension: 'x', coordinateView: 'salesPanel' },
      { type: 'axis', dimension: 'y', coordinateView: 'salesPanel', grid: true },
    ]);
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('facet_container_accepts_multi_level_row_dimensions', () => {
    const spec = buildPlotIR(
      <PlotFacet
        id="sales"
        row={[
          { field: 'region', order: ['north', 'south'] },
          { field: 'channel', order: ['online', 'store'] },
        ]}
        column="quarter"
      >
        <PlotAxis dimension="x" title="month" />
        <PlotAxis dimension="y" grid title="revenue" />
        <PathMark x="month" y="revenue" order="month" />
      </PlotFacet>,
      'sales',
    );

    expect(spec.composition).toMatchObject({
      defaultView: 'salesPanel',
      views: [{ id: 'salesPanel', coordinate: { type: 'cartesian2D', x: '__x', y: '__y' } }],
      arrangements: [
        {
          kind: 'facet',
          id: 'sales',
          view: 'salesPanel',
          row: [
            { field: 'region', order: ['north', 'south'] },
            { field: 'channel', order: ['online', 'store'] },
          ],
          column: { field: 'quarter' },
        },
      ],
    });
    expect(spec.marks).toMatchObject([{ type: 'path', coordinateView: 'salesPanel' }]);
    expect(() => PlotSchema.parse(spec)).not.toThrow();
  });

  it('rejects missing topology binding targets and conflicting binding props', () => {
    expect(() =>
      buildPlotIR(
        <>
          <PlotScaffold id="ops" sharedRoles={['x']}>
            <PlotTrack id="load" band={{ role: 'y', start: 0, end: 1 }} />
          </PlotScaffold>
          <PathMark trackId="missing" x="week" y="load" />
        </>,
        'ops',
      ),
    ).toThrow(/missing.*track/i);

    expect(() =>
      buildPlotIR(
        <>
          <PlotFacet id="sales" column="region" />
          <PathMark facetId="missing" x="month" y="revenue" />
        </>,
        'sales',
      ),
    ).toThrow(/missing.*facet/i);

    expect(() =>
      buildPlotIR(
        <>
          <PlotFacet id="sales" column="region" />
          <PathMark facetId="sales" coordinateView="salesPanel" x="month" y="revenue" />
        </>,
        'sales',
      ),
    ).toThrow(/coordinateView.*facetId/i);

    expect(() =>
      buildPlotIR(
        <>
          <PlotScaffold id="ops" sharedRoles={['x']}>
            <PlotTrack id="load" band={{ role: 'y', start: 0, end: 1 }} />
          </PlotScaffold>
          <PathMark facetId="sales" trackId="load" x="week" y="load" />
        </>,
        'ops',
      ),
    ).toThrow(/multiple.*binding/i);
  });
});
