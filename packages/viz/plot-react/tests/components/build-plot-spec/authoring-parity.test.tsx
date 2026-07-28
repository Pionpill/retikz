import { createPlotSpec, lowerPlots } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { buildPlotSpec } from '../../../src/components/build-plot-spec';
import { Facet, Scaffold, Track } from '../../../src/components/composition';
import { Axis } from '../../../src/components/guides';
import { PathMark, PointMark } from '../../../src/components/marks';
import { Scale } from '../../../src/components/scales';

describe('React 与 framework-neutral authoring parity', () => {
  it('单 facet 产出完全一致的 PlotSpec', () => {
    const react = buildPlotSpec(
      <>
        <Facet id="sales" row="channel" column="region" />
        <PathMark facetId="sales" x="month" y="revenue" order="month" />
        <Axis facetId="sales" dimension="y" grid />
      </>,
      'sales',
    );
    const plain = createPlotSpec({
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: '__x' },
        { type: 'linear', name: '__y' },
      ],
      coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
      facets: [{ id: 'sales', row: 'channel', column: 'region' }],
      marks: [
        {
          type: 'path',
          facetId: 'sales',
          order: 'month',
          encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
        },
      ],
      guides: [{ type: 'axis', facetId: 'sales', dimension: 'y', grid: true }],
    });

    expect(react).toEqual(plain);
  });

  it('单 scaffold 产出完全一致的 PlotSpec', () => {
    const react = buildPlotSpec(
      <>
        <Scaffold id="ops" sharedRoles={['x']}>
          <Track id="incidents" band={{ role: 'y', start: 0, end: 0.42 }} />
          <Track id="load" band={{ role: 'y', start: 0.58, end: 1 }} />
        </Scaffold>
        <PathMark trackId="incidents" x="week" y="incidents" order="week" />
        <PathMark trackId="load" x="week" y="load" order="week" />
        <Axis scaffoldId="ops" dimension="x" grid />
      </>,
      'ops',
    );
    const plain = createPlotSpec({
      data: { reference: 'ops' },
      scales: [
        { type: 'linear', name: '__x' },
        { type: 'linear', name: '__y' },
      ],
      coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
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
      marks: [
        {
          type: 'path',
          trackId: 'incidents',
          order: 'week',
          encoding: { x: { field: 'week' }, y: { field: 'incidents' } },
        },
        {
          type: 'path',
          trackId: 'load',
          order: 'week',
          encoding: { x: { field: 'week' }, y: { field: 'load' } },
        },
      ],
      guides: [{ type: 'axis', scaffoldId: 'ops', dimension: 'x', grid: true }],
    });

    expect(react).toEqual(plain);
  });

  it('facet 在 model 驱动推断时不把分类位置字段固定为 linear scale', () => {
    const spec = buildPlotSpec(
      <>
        <Facet id="sales" column="region" />
        <PointMark facetId="sales" x="month" y="revenue" />
      </>,
      'sales',
      {
        model: [
          { name: 'region', type: 'categorical' },
          { name: 'month', type: 'categorical' },
          { name: 'revenue', type: 'continuous' },
        ],
      },
    );

    expect(spec.scales).toEqual([]);
    expect(spec.composition?.views).toEqual([{ id: 'salesPanel', coordinate: { type: 'cartesian2D' } }]);
    expect(() =>
      lowerPlots({ sales: [{ region: 'north', month: 'Jan', revenue: 10 }] })[0]?.expand(spec),
    ).not.toThrow();
  });

  it('facet 在 model 驱动推断时保留显式位置 scale', () => {
    const spec = buildPlotSpec(
      <>
        <Facet id="sales" column="region" />
        <Scale dimension="x" type="time" />
        <PointMark facetId="sales" x="month" y="revenue" />
      </>,
      'sales',
      {
        model: [
          { name: 'region', type: 'categorical' },
          { name: 'month', type: 'temporal' },
          { name: 'revenue', type: 'continuous' },
        ],
      },
    );

    expect(spec.scales).toEqual([{ type: 'time', name: '__x' }]);
    expect(spec.composition?.views).toEqual([{ id: 'salesPanel', coordinate: { type: 'cartesian2D', x: '__x' } }]);
    expect(() =>
      lowerPlots({
        sales: [
          { region: 'north', month: '2026-01-01', revenue: 10 },
          { region: 'north', month: '2026-02-01', revenue: 12 },
        ],
      })[0]?.expand(spec),
    ).not.toThrow();
  });

  it('scaffold 在延迟推断时不把分类位置字段固定为 linear scale', () => {
    const spec = buildPlotSpec(
      <>
        <Scaffold id="ops" sharedRoles={['x']}>
          <Track id="incidents" band={{ role: 'y', start: 0, end: 0.42 }} />
          <Track id="load" band={{ role: 'y', start: 0.58, end: 1 }} />
        </Scaffold>
        <PointMark trackId="incidents" x="week" y="incidents" />
        <PointMark trackId="load" x="week" y="load" />
      </>,
      'ops',
      { deferPositionScaleInference: true },
    );

    expect(spec.scales).toEqual([]);
    expect(spec.composition?.arrangements?.[0]).toMatchObject({
      kind: 'tracks',
      coordinate: { type: 'cartesian2D' },
    });
    expect(() => lowerPlots({ ops: [{ week: 'W1', incidents: 2, load: 0.5 }] })[0]?.expand(spec)).not.toThrow();
  });

  it('scaffold viewIdTemplate 在 React 与 plain authoring 中派生相同 scope', () => {
    const react = buildPlotSpec(
      <>
        <Scaffold id="ops" sharedRoles={['x']} viewIdTemplate="{arrangement}.panel.{track}">
          <Track id="load" band={{ role: 'y', start: 0, end: 0.42 }} />
          <Track id="incidents" view="manual.incidents" band={{ role: 'y', start: 0.58, end: 1 }} />
        </Scaffold>
        <PathMark trackId="load" x="week" y="load" order="week" />
        <Axis trackId="incidents" dimension="y" />
        <Axis scaffoldId="ops" dimension="x" />
      </>,
      'ops',
    );
    const plain = createPlotSpec({
      data: { reference: 'ops' },
      scales: [
        { type: 'linear', name: '__x' },
        { type: 'linear', name: '__y' },
      ],
      coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
      scaffolds: [
        {
          id: 'ops',
          sharedRoles: ['x'],
          viewIdTemplate: '{arrangement}.panel.{track}',
          tracks: [
            { id: 'load', band: { role: 'y', start: 0, end: 0.42 } },
            { id: 'incidents', view: 'manual.incidents', band: { role: 'y', start: 0.58, end: 1 } },
          ],
        },
      ],
      marks: [
        {
          type: 'path',
          trackId: 'load',
          order: 'week',
          encoding: { x: { field: 'week' }, y: { field: 'load' } },
        },
      ],
      guides: [
        { type: 'axis', trackId: 'incidents', dimension: 'y' },
        { type: 'axis', scaffoldId: 'ops', dimension: 'x' },
      ],
    });

    expect(react).toEqual(plain);
  });

  it('多轴绑定产出完全一致的 PlotSpec', () => {
    const react = buildPlotSpec(
      <>
        <Axis dimension="x" />
        <Axis id="temperature" dimension="y" />
        <Axis id="rainfall" dimension="y" grid />
        <PathMark x="day" y="temperature" yAxisId="temperature" />
        <PointMark x="day" y="rainfall" yAxisId="rainfall" />
      </>,
      'weather',
    );
    const plain = createPlotSpec({
      data: { reference: 'weather' },
      scales: [
        { type: 'linear', name: '__x' },
        { type: 'linear', name: '__y' },
      ],
      coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
      marks: [
        {
          type: 'path',
          yAxisId: 'temperature',
          encoding: { x: { field: 'day' }, y: { field: 'temperature' } },
        },
        {
          type: 'point',
          yAxisId: 'rainfall',
          encoding: { x: { field: 'day' }, y: { field: 'rainfall' } },
        },
      ],
      guides: [
        { type: 'axis', dimension: 'x' },
        { type: 'axis', id: 'temperature', dimension: 'y' },
        { type: 'axis', id: 'rainfall', dimension: 'y', grid: true },
      ],
    });

    expect(react).toEqual(plain);
  });

  it('显式 composition 的 scale binding 产出完全一致', () => {
    const composition = {
      defaultView: 'temp',
      views: [
        { id: 'temp', coordinate: { type: 'cartesian2D' as const } },
        {
          id: 'rain',
          coordinate: { type: 'cartesian2D' as const },
          placement: { kind: 'overlay' as const, target: 'temp' },
        },
      ],
    };
    const react = buildPlotSpec(
      <>
        <Scale dimension="x" type="linear" />
        <Scale dimension="y" type="linear" />
        <PointMark x="day" y="temperature" />
      </>,
      'weather',
      { composition },
    );
    const plain = createPlotSpec({
      data: { reference: 'weather' },
      scales: [
        { type: 'linear', name: '__x' },
        { type: 'linear', name: '__y' },
      ],
      coordinate: { type: 'cartesian2D', x: '__x', y: '__y' },
      composition,
      marks: [
        {
          type: 'point',
          encoding: { x: { field: 'day' }, y: { field: 'temperature' } },
        },
      ],
    });

    expect(react).toEqual(plain);
  });

  it('冲突输入共享 plot authoring 核心错误语义', () => {
    const plain = () =>
      createPlotSpec({
        data: { reference: 'sales' },
        scales: [],
        facets: [{ id: 'sales', row: 'region' }],
        marks: [
          {
            type: 'point',
            facetId: 'sales',
            yAxisId: 'right',
            encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
          },
        ],
        guides: [{ type: 'axis', id: 'right', dimension: 'y' }],
      });
    const react = () =>
      buildPlotSpec(
        <>
          <Facet id="sales" row="region" />
          <Axis id="right" dimension="y" />
          <PointMark facetId="sales" yAxisId="right" x="month" y="revenue" />
        </>,
        'sales',
      );

    expect(plain).toThrow(/plot authoring:.*multiple binding props/i);
    expect(react).toThrow(/plot authoring:.*multiple binding props/i);
  });
});
