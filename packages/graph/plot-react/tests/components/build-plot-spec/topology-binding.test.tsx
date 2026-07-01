import { PlotSpecSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { buildPlotSpec } from '../../../src/components/build-plot-spec';
import { Facet, Scaffold, Track } from '../../../src/components/composition';
import { Axis } from '../../../src/components/guides';
import { PathMark, PointMark } from '../../../src/components/marks';

describe('buildPlotSpec alpha.14 topology binding sugar', () => {
  it('track_binding_generates_shared_scaffold_composition', () => {
    const spec = buildPlotSpec(
      <>
        <Scaffold
          id="ops"
          sharedRoles={['x']}
          layout={{ trackGap: 24, axisGap: 8, labelGap: 6 }}
          guidePolicy={{ gridPlacement: 'sharedRole', trackLabels: 'inline' }}
        >
          <Track id="incidents" band={{ role: 'y', start: 0, end: 0.42 }} />
          <Track id="load" band={{ role: 'y', start: 0.58, end: 1 }} />
        </Scaffold>
        <PathMark trackId="incidents" x="week" y="incidents" order="week" />
        <PathMark trackId="load" x="week" y="load" order="week" />
        <Axis scaffoldId="ops" dimension="x" grid title="week" />
        <Axis trackId="load" dimension="y" title="load" />
      </>,
      'ops',
    );

    expect(spec.coordinate).toBeUndefined();
    expect(spec.composition).toEqual({
      defaultScope: 'incidents',
      scaffolds: [
        {
          id: 'ops',
          coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
          sharedRoles: ['x'],
          tracks: [
            { id: 'incidents', band: { role: 'y', start: 0, end: 0.42 } },
            { id: 'load', band: { role: 'y', start: 0.58, end: 1 } },
          ],
        },
      ],
      scopes: [
        { id: 'incidents', placement: { kind: 'track', scaffold: 'ops', track: 'incidents' } },
        { id: 'load', placement: { kind: 'track', scaffold: 'ops', track: 'load' } },
      ],
      layout: { trackGap: 24, axisGap: 8, labelGap: 6 },
      guidePolicy: { gridPlacement: 'sharedRole', trackLabels: 'inline' },
    });
    expect(spec.marks).toMatchObject([
      { type: 'path', coordinateScope: 'incidents' },
      { type: 'path', coordinateScope: 'load' },
    ]);
    expect(spec.guides).toMatchObject([
      { type: 'axis', dimension: 'x', coordinateScope: 'incidents', grid: true },
      { type: 'axis', dimension: 'y', coordinateScope: 'load' },
    ]);
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('track_binding_inherits_plot_coordinate_when_scaffold_coordinate_is_omitted', () => {
    const spec = buildPlotSpec(
      <>
        <Scaffold id="radar" sharedRoles={['x']}>
          <Track id="signal" band={{ role: 'y', start: 0.12, end: 0.48 }} />
          <Track id="capacity" band={{ role: 'y', start: 0.58, end: 0.96 }} />
        </Scaffold>
        <PathMark trackId="signal" x="area" y="signal" order="order" />
        <PathMark trackId="capacity" x="area" y="capacity" order="order" />
        <Axis scaffoldId="radar" dimension="x" grid title="area" />
      </>,
      'radar',
      { coordinate: { type: 'polar2D' } },
    );

    expect(spec.composition?.scaffolds?.[0]?.coordinate).toMatchObject({
      type: 'polar2D',
      angle: '__angle',
      radius: '__radius',
    });
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('scaffold_track_container_scopes_child_axes_and_marks', () => {
    const spec = buildPlotSpec(
      <Scaffold id="ops" sharedRoles={['x']}>
        <Axis dimension="x" grid title="week" />
        <Track id="incidents" band={{ role: 'y', start: 0, end: 0.42 }}>
          <Axis dimension="y" title="incidents" />
          <PathMark x="week" y="incidents" order="week" />
        </Track>
        <Track id="load" band={{ role: 'y', start: 0.58, end: 1 }}>
          <Axis dimension="y" title="load" />
          <PointMark x="week" y="load" />
        </Track>
      </Scaffold>,
      'ops',
    );

    expect(spec.composition).toMatchObject({
      defaultScope: 'incidents',
      scaffolds: [
        {
          id: 'ops',
          sharedRoles: ['x'],
          tracks: [
            { id: 'incidents', band: { role: 'y', start: 0, end: 0.42 } },
            { id: 'load', band: { role: 'y', start: 0.58, end: 1 } },
          ],
        },
      ],
      scopes: [
        { id: 'incidents', placement: { kind: 'track', scaffold: 'ops', track: 'incidents' } },
        { id: 'load', placement: { kind: 'track', scaffold: 'ops', track: 'load' } },
      ],
    });
    expect(spec.marks).toMatchObject([
      { type: 'path', coordinateScope: 'incidents' },
      { type: 'point', coordinateScope: 'load' },
    ]);
    expect(spec.guides).toMatchObject([
      { type: 'axis', dimension: 'x', coordinateScope: 'incidents', grid: true },
      { type: 'axis', dimension: 'y', coordinateScope: 'incidents' },
      { type: 'axis', dimension: 'y', coordinateScope: 'load' },
    ]);
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('facet_binding_generates_facet_composition', () => {
    const spec = buildPlotSpec(
      <>
        <Facet
          id="sales"
          row={{ field: 'channel', order: ['online', 'store'] }}
          column={{ field: 'region', order: ['north', 'south', 'west'] }}
          scales={{ roles: { y: 'shared' } }}
          layout={{ panelGap: 24, axisGap: 8, labelGap: 6 }}
          guidePolicy={{ axes: 'outerShared', gridPlacement: 'self', facetLabels: 'rowColumn' }}
        />
        <PathMark facetId="sales" x="month" y="revenue" order="month" />
        <PointMark facetId="sales" x="month" y="revenue" />
        <Axis facetId="sales" dimension="x" title="month" />
        <Axis facetId="sales" dimension="y" grid title="revenue" />
      </>,
      'sales',
    );

    expect(spec.coordinate).toBeUndefined();
    expect(spec.composition).toEqual({
      defaultScope: 'salesPanel',
      scopes: [{ id: 'salesPanel', coordinate: { type: 'cartesian2D', x: '__x', y: '__y' } }],
      facets: [
        {
          id: 'sales',
          row: { field: 'channel', order: ['online', 'store'] },
          column: { field: 'region', order: ['north', 'south', 'west'] },
          scales: { roles: { y: 'shared' } },
        },
      ],
      layout: { panelGap: 24, axisGap: 8, labelGap: 6 },
      guidePolicy: { axes: 'outerShared', gridPlacement: 'self', facetLabels: 'rowColumn' },
    });
    expect(spec.marks).toMatchObject([
      { type: 'path', coordinateScope: 'salesPanel' },
      { type: 'point', coordinateScope: 'salesPanel' },
    ]);
    expect(spec.guides).toMatchObject([
      { type: 'axis', dimension: 'x', coordinateScope: 'salesPanel' },
      { type: 'axis', dimension: 'y', coordinateScope: 'salesPanel', grid: true },
    ]);
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('facet_container_scopes_child_axes_and_marks', () => {
    const spec = buildPlotSpec(
      <Facet id="sales" column="region">
        <Axis dimension="x" title="month" />
        <Axis dimension="y" grid title="revenue" />
        <PathMark x="month" y="revenue" order="month" />
        <PointMark x="month" y="revenue" />
      </Facet>,
      'sales',
    );

    expect(spec.composition).toMatchObject({
      defaultScope: 'salesPanel',
      scopes: [{ id: 'salesPanel', coordinate: { type: 'cartesian2D', x: '__x', y: '__y' } }],
      facets: [{ id: 'sales', column: { field: 'region' } }],
    });
    expect(spec.marks).toMatchObject([
      { type: 'path', coordinateScope: 'salesPanel' },
      { type: 'point', coordinateScope: 'salesPanel' },
    ]);
    expect(spec.guides).toMatchObject([
      { type: 'axis', dimension: 'x', coordinateScope: 'salesPanel' },
      { type: 'axis', dimension: 'y', coordinateScope: 'salesPanel', grid: true },
    ]);
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('facet_container_accepts_multi_level_row_dimensions', () => {
    const spec = buildPlotSpec(
      <Facet
        id="sales"
        row={[
          { field: 'region', order: ['north', 'south'] },
          { field: 'channel', order: ['online', 'store'] },
        ]}
        column="quarter"
      >
        <Axis dimension="x" title="month" />
        <Axis dimension="y" grid title="revenue" />
        <PathMark x="month" y="revenue" order="month" />
      </Facet>,
      'sales',
    );

    expect(spec.composition).toMatchObject({
      defaultScope: 'salesPanel',
      scopes: [{ id: 'salesPanel', coordinate: { type: 'cartesian2D', x: '__x', y: '__y' } }],
      facets: [
        {
          id: 'sales',
          row: [
            { field: 'region', order: ['north', 'south'] },
            { field: 'channel', order: ['online', 'store'] },
          ],
          column: { field: 'quarter' },
        },
      ],
    });
    expect(spec.marks).toMatchObject([{ type: 'path', coordinateScope: 'salesPanel' }]);
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('rejects missing topology binding targets and conflicting binding props', () => {
    expect(() =>
      buildPlotSpec(
        <>
          <Scaffold id="ops" sharedRoles={['x']}>
            <Track id="load" band={{ role: 'y', start: 0, end: 1 }} />
          </Scaffold>
          <PathMark trackId="missing" x="week" y="load" />
        </>,
        'ops',
      ),
    ).toThrow(/missing.*track/i);

    expect(() =>
      buildPlotSpec(
        <>
          <Facet id="sales" column="region" />
          <PathMark facetId="missing" x="month" y="revenue" />
        </>,
        'sales',
      ),
    ).toThrow(/missing.*facet/i);

    expect(() =>
      buildPlotSpec(
        <>
          <Facet id="sales" column="region" />
          <PathMark facetId="sales" coordinateScope="salesPanel" x="month" y="revenue" />
        </>,
        'sales',
      ),
    ).toThrow(/coordinateScope.*facetId/i);

    expect(() =>
      buildPlotSpec(
        <>
          <Scaffold id="ops" sharedRoles={['x']}>
            <Track id="load" band={{ role: 'y', start: 0, end: 1 }} />
          </Scaffold>
          <PathMark facetId="sales" trackId="load" x="week" y="load" />
        </>,
        'ops',
      ),
    ).toThrow(/multiple.*binding/i);
  });
});
