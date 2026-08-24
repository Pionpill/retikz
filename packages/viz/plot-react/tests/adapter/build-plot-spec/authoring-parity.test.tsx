import { compileToScene } from '@retikz/core';
import { lowerPlots } from '@retikz/plot';
import { normalizePlot } from '@retikz/plot-vanilla';
import { describe, expect, it } from 'vitest';

import { buildPlotIR } from '../../../src/adapter';
import { PlotFacet, PlotScaffold, PlotTrack } from '../../../src/components/composition';
import { PlotAxis } from '../../../src/components/guides';
import { PathMark, PointMark } from '../../../src/components/marks';
import { PlotScale } from '../../../src/components/scales';

describe('React 与 framework-neutral authoring parity', () => {
  it('单 facet 产出完全一致的 IRPlot', () => {
    const react = buildPlotIR(
      <>
        <PlotFacet id="sales" row="channel" column="region" />
        <PathMark facetId="sales" x="month" y="revenue" order="month" />
        <PlotAxis facetId="sales" dimension="y" grid />
      </>,
      'sales',
    );
    const plain = normalizePlot({
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

  it('单 scaffold 产出完全一致的 IRPlot', () => {
    const react = buildPlotIR(
      <>
        <PlotScaffold id="ops" sharedRoles={['x']}>
          <PlotTrack id="incidents" band={{ role: 'y', start: 0, end: 0.42 }} />
          <PlotTrack id="load" band={{ role: 'y', start: 0.58, end: 1 }} />
        </PlotScaffold>
        <PathMark trackId="incidents" x="week" y="incidents" order="week" />
        <PathMark trackId="load" x="week" y="load" order="week" />
        <PlotAxis scaffoldId="ops" dimension="x" grid />
      </>,
      'ops',
    );
    const plain = normalizePlot({
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
    const spec = buildPlotIR(
      <>
        <PlotFacet id="sales" column="region" />
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
      compileToScene(
        { version: 1, type: 'scene', children: [spec] },
        { composites: lowerPlots({ sales: [{ region: 'north', month: 'Jan', revenue: 10 }] }) },
      ),
    ).not.toThrow();
  });

  it('facet 在 model 驱动推断时保留显式位置 scale', () => {
    const spec = buildPlotIR(
      <>
        <PlotFacet id="sales" column="region" />
        <PlotScale dimension="x" type="time" />
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
      compileToScene(
        { version: 1, type: 'scene', children: [spec] },
        {
          composites: lowerPlots({
            sales: [
              { region: 'north', month: '2026-01-01', revenue: 10 },
              { region: 'north', month: '2026-02-01', revenue: 12 },
            ],
          }),
        },
      ),
    ).not.toThrow();
  });

  it('scaffold 在延迟推断时不把分类位置字段固定为 linear scale', () => {
    const spec = buildPlotIR(
      <>
        <PlotScaffold id="ops" sharedRoles={['x']}>
          <PlotTrack id="incidents" band={{ role: 'y', start: 0, end: 0.42 }} />
          <PlotTrack id="load" band={{ role: 'y', start: 0.58, end: 1 }} />
        </PlotScaffold>
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
    expect(() =>
      compileToScene(
        { version: 1, type: 'scene', children: [spec] },
        { composites: lowerPlots({ ops: [{ week: 'W1', incidents: 2, load: 0.5 }] }) },
      ),
    ).not.toThrow();
  });

  it('scaffold viewIdTemplate 在 React 与 plain authoring 中派生相同 scope', () => {
    const react = buildPlotIR(
      <>
        <PlotScaffold id="ops" sharedRoles={['x']} viewIdTemplate="{arrangement}.panel.{track}">
          <PlotTrack id="load" band={{ role: 'y', start: 0, end: 0.42 }} />
          <PlotTrack id="incidents" view="manual.incidents" band={{ role: 'y', start: 0.58, end: 1 }} />
        </PlotScaffold>
        <PathMark trackId="load" x="week" y="load" order="week" />
        <PlotAxis trackId="incidents" dimension="y" />
        <PlotAxis scaffoldId="ops" dimension="x" />
      </>,
      'ops',
    );
    const plain = normalizePlot({
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

  it('多轴绑定产出完全一致的 IRPlot', () => {
    const react = buildPlotIR(
      <>
        <PlotAxis dimension="x" />
        <PlotAxis id="temperature" dimension="y" />
        <PlotAxis id="rainfall" dimension="y" grid />
        <PathMark x="day" y="temperature" yAxisId="temperature" />
        <PointMark x="day" y="rainfall" yAxisId="rainfall" />
      </>,
      'weather',
    );
    const plain = normalizePlot({
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
    const react = buildPlotIR(
      <>
        <PlotScale dimension="x" type="linear" />
        <PlotScale dimension="y" type="linear" />
        <PointMark x="day" y="temperature" />
      </>,
      'weather',
      { composition },
    );
    const plain = normalizePlot({
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
      normalizePlot({
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
      buildPlotIR(
        <>
          <PlotFacet id="sales" row="region" />
          <PlotAxis id="right" dimension="y" />
          <PointMark facetId="sales" yAxisId="right" x="month" y="revenue" />
        </>,
        'sales',
      );

    expect(plain).toThrow(/plot authoring:.*multiple binding props/i);
    expect(react).toThrow(/plot authoring:.*multiple binding props/i);
  });
});
