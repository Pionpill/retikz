import { PlotSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { buildPlotIR } from '../../../src/adapter';
import { PlotFacet, PlotScaffold, PlotTrack } from '../../../src/components/composition';
import { PlotAxis } from '../../../src/components/guides';
import { PathMark, PointMark } from '../../../src/components/marks';

describe('buildPlotIR alpha.14 拓扑结合糖', () => {
  it('轨道绑定生成共享支架组合物', () => {
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
        <PathMark
          trackId="incidents"
          encodings={{ order: 'week', position: { x: { field: 'week' }, y: { field: 'incidents' } } }}
        />
        <PathMark
          trackId="load"
          encodings={{ order: 'week', position: { x: { field: 'week' }, y: { field: 'load' } } }}
        />
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

  it('基础结构省略坐标配置时轨道绑定继承 Plot 坐标', () => {
    const spec = buildPlotIR(
      <>
        <PlotScaffold id="radar" sharedRoles={['x']}>
          <PlotTrack id="signal" band={{ role: 'y', start: 0.12, end: 0.48 }} />
          <PlotTrack id="capacity" band={{ role: 'y', start: 0.58, end: 0.96 }} />
        </PlotScaffold>
        <PathMark
          trackId="signal"
          encodings={{ order: 'order', position: { x: { field: 'area' }, y: { field: 'signal' } } }}
        />
        <PathMark
          trackId="capacity"
          encodings={{ order: 'order', position: { x: { field: 'area' }, y: { field: 'capacity' } } }}
        />
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

  it('轨道容器基础结构为子坐标轴及标记建立作用域', () => {
    const spec = buildPlotIR(
      <PlotScaffold id="ops" sharedRoles={['x']}>
        <PlotAxis dimension="x" grid title="week" />
        <PlotTrack id="incidents" band={{ role: 'y', start: 0, end: 0.42 }}>
          <PlotAxis dimension="y" title="incidents" />
          <PathMark encodings={{ order: 'week', position: { x: { field: 'week' }, y: { field: 'incidents' } } }} />
        </PlotTrack>
        <PlotTrack id="load" band={{ role: 'y', start: 0.58, end: 1 }}>
          <PlotAxis dimension="y" title="load" />
          <PointMark encodings={{ position: { x: { field: 'week' }, y: { field: 'load' } } }} />
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

  it('facet 绑定生成 facet 组合', () => {
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
        <PathMark
          facetId="sales"
          encodings={{ order: 'month', position: { x: { field: 'month' }, y: { field: 'revenue' } } }}
        />
        <PointMark facetId="sales" encodings={{ position: { x: { field: 'month' }, y: { field: 'revenue' } } }} />
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

  it('构面容器范围子轴和标记', () => {
    const spec = buildPlotIR(
      <PlotFacet id="sales" column="region">
        <PlotAxis dimension="x" title="month" />
        <PlotAxis dimension="y" grid title="revenue" />
        <PathMark encodings={{ order: 'month', position: { x: { field: 'month' }, y: { field: 'revenue' } } }} />
        <PointMark encodings={{ position: { x: { field: 'month' }, y: { field: 'revenue' } } }} />
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

  it('构面容器接受多级行维度', () => {
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
        <PathMark encodings={{ order: 'month', position: { x: { field: 'month' }, y: { field: 'revenue' } } }} />
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

  it('拒绝缺失的拓扑绑定目标和冲突的绑定属性', () => {
    expect(() =>
      buildPlotIR(
        <>
          <PlotScaffold id="ops" sharedRoles={['x']}>
            <PlotTrack id="load" band={{ role: 'y', start: 0, end: 1 }} />
          </PlotScaffold>
          <PathMark trackId="missing" encodings={{ position: { x: { field: 'week' }, y: { field: 'load' } } }} />
        </>,
        'ops',
      ),
    ).toThrow(/missing.*track/i);

    expect(() =>
      buildPlotIR(
        <>
          <PlotFacet id="sales" column="region" />
          <PathMark facetId="missing" encodings={{ position: { x: { field: 'month' }, y: { field: 'revenue' } } }} />
        </>,
        'sales',
      ),
    ).toThrow(/missing.*facet/i);

    expect(() =>
      buildPlotIR(
        <>
          <PlotFacet id="sales" column="region" />
          <PathMark
            facetId="sales"
            coordinateView="salesPanel"
            encodings={{ position: { x: { field: 'month' }, y: { field: 'revenue' } } }}
          />
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
          <PathMark
            facetId="sales"
            trackId="load"
            encodings={{ position: { x: { field: 'week' }, y: { field: 'load' } } }}
          />
        </>,
        'ops',
      ),
    ).toThrow(/multiple.*binding/i);
  });
});
