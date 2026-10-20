import type { IRChild, IRNode, IRPath, IRScope } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { lowerPlot } from '../../src/pipeline/expand/lower';
import { preparePlotData } from '../../src/pipeline/expand/preparation';
import { createPlotLineageLocator, lowerPlotWithLineage } from '../../src/pipeline/lineage';
import { MarkOperationSchema, PlotSchema } from '../../src/schemas';
import { measureLabel } from '../helpers/text-measurement';

const leaves = (child: IRChild): Array<IRNode | IRPath> =>
  child.type === 'scope'
    ? (child as IRScope).children.flatMap(leaves)
    : child.type === 'node' || child.type === 'path'
      ? child.id === 'chart.plotArea'
        ? []
        : [child as IRNode | IRPath]
      : [];

const plot = (marks: Array<unknown>) =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    id: 'chart',
    data: { reference: 'rows' },
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    scales: [
      { type: 'linear', name: 'x', domain: [0, 10], domainPadding: 0 },
      { type: 'linear', name: 'y', domain: [0, 10], domainPadding: 0 },
    ],
    marks,
  });
const point = { type: 'point', kind: 'annotation', position: { x: 1, y: 2 }, fill: 'red', color: 'red' };
const path = {
  type: 'path',
  kind: 'annotation',
  from: { x: { edge: 'start' }, y: { field: 'mean' } },
  to: { x: { edge: 'end' }, y: { field: 'mean' } },
};
const summarize = [
  { operation: { kind: 'summarize', params: { groupBy: [], metrics: [{ kind: 'mean', field: 'y', as: 'mean' }] } } },
];
const rows = [
  { x: 2, y: 2 },
  { x: 8, y: 8 },
];
const options = { textMeasurer: measureLabel };

describe('data-bound annotations', () => {
  it('preserves empty transforms and field bindings through JSON', () => {
    const source = MarkOperationSchema.parse({
      ...point,
      transform: [],
      position: { x: { field: 'x' }, y: { value: 2 } },
    });
    expect(MarkOperationSchema.parse(JSON.parse(JSON.stringify(source)))).toEqual(source);
    expect(MarkOperationSchema.safeParse({ ...point, position: { x: { field: 'x', value: 1 }, y: 2 } }).success).toBe(
      false,
    );
    expect(MarkOperationSchema.safeParse({ ...point, position: { x: { value: { edge: 'end' } }, y: 2 } }).success).toBe(
      false,
    );
  });

  it('distinguishes independent constants from an explicitly empty data chain', () => {
    expect(leaves(lowerPlot(plot([point]), { rows }, options))).toHaveLength(1);
    expect(leaves(lowerPlot(plot([{ ...point, transform: [] }]), { rows }, options))).toHaveLength(2);
    expect(leaves(lowerPlot(plot([{ ...point, transform: [] }]), { rows: [] }, options))).toHaveLength(0);
  });

  it('projects each point and interval row identically to explicit constants', () => {
    const data = plot([
      { ...point, id: 'points', position: { x: { field: 'x' }, y: { field: 'y' } } },
      {
        type: 'interval',
        kind: 'annotation',
        id: 'regions',
        fill: 'blue',
        bounds: { x: { from: 0, to: { field: 'x' } }, y: { from: 0, to: { field: 'y' } } },
      },
    ]);
    const output = lowerPlot(data, { rows }, options);
    const constant = plot([
      ...rows.map(row => ({ ...point, position: row })),
      ...rows.map(row => ({
        type: 'interval',
        kind: 'annotation',
        fill: 'blue',
        bounds: { x: { from: 0, to: row.x }, y: { from: 0, to: row.y } },
      })),
    ]);
    expect(leaves(output).map(({ id: _id, ...geometry }) => geometry)).toEqual(
      leaves(lowerPlot(constant, { rows: [] }, options)),
    );
    expect(() => compileToScene({ type: 'scene', version: 1, children: [output] })).not.toThrow();
  });

  it('computes a local mean without mutating a sibling data view', () => {
    const output = lowerPlot(
      plot([
        { ...path, transform: summarize },
        { ...point, position: { x: { field: 'x' }, y: { field: 'y' } } },
      ]),
      { rows },
      options,
    );
    const expected = lowerPlot(
      plot([{ ...path, from: { x: { edge: 'start' }, y: 5 }, to: { x: { edge: 'end' }, y: 5 } }]),
      { rows: [] },
      options,
    );
    expect(leaves(output)[0]).toEqual(leaves(expected)[0]);
    expect(leaves(output)).toHaveLength(3);
  });

  it('uses the same aggregated results for asynchronous preparation and lineage', async () => {
    const source = plot([{ ...path, id: 'mean', transform: summarize }]);
    const prepared = await (
      await preparePlotData(source, { dataBindings: { rows: { kind: 'rows', rows } } })
    ).execute();
    expect(prepared.marks[0]?.rows).toMatchObject([{ mean: 5 }]);
    const asyncOutput = lowerPlot(source, { rows }, options, undefined, prepared);
    expect(leaves(asyncOutput)).toEqual(leaves(lowerPlot(source, { rows }, options)));
    const result = lowerPlotWithLineage(
      source,
      { rows },
      {
        ...options,
        environment: {},
        lineage: { rowValues: { maxRows: 5, fields: ['mean'] }, transformScopes: true, markIdentity: true },
      },
    );
    expect(result.lineage.marks[0]).toMatchObject({ markId: 'mean', transformScope: { mark: ['summarize'] } });
    expect(result.lineage.data.marks).toHaveLength(1);
  });

  it('rejects fields removed by aggregation and unmappable row values', () => {
    expect(() =>
      lowerPlot(plot([{ ...point, transform: summarize, position: { x: { field: 'x' }, y: 2 } }]), { rows }, options),
    ).toThrow(/field|map|x/i);
    expect(() =>
      lowerPlot(plot([{ ...point, position: { x: { field: 'x' }, y: 2 } }]), { rows: [{ x: null }] }, options),
    ).toThrow();
  });

  it('creates independent group spans and exposes one datum with aggregate provenance per path', () => {
    const source = plot([
      {
        ...path,
        id: 'groups',
        transform: [
          {
            operation: {
              kind: 'summarize',
              params: {
                groupBy: ['group'],
                metrics: [
                  { kind: 'median', field: 'y', as: 'mean' },
                  { kind: 'min', field: 'x', as: 'start' },
                  { kind: 'max', field: 'x', as: 'end' },
                ],
              },
            },
          },
        ],
        from: { x: { field: 'start' }, y: { field: 'mean' } },
        to: { x: { field: 'end' }, y: { field: 'mean' } },
      },
    ]);
    const data = {
      rows: [
        { group: 'a', x: 1, y: 2 },
        { group: 'a', x: 4, y: 4 },
        { group: 'b', x: 6, y: 7 },
        { group: 'b', x: 9, y: 9 },
      ],
    };
    const result = leaves(lowerPlot(source, data, options));
    expect(result).toHaveLength(2);
    expect(result.map(child => (child.type === 'path' ? child.children : []))).toMatchObject([
      [{ to: [48, 210] }, { to: [192, 210] }],
      [{ to: [288, expect.closeTo(60)] }, { to: [432, expect.closeTo(60)] }],
    ]);
    const locator = createPlotLineageLocator(source, data, { ...options, environment: {} });
    expect(locator.datum(0, { markIndex: 0 })?.anchor.meta.sourceIndices).toEqual([0, 1]);
    expect(locator.datum(1, { markIndex: 0 })?.anchor.meta.sourceIndices).toEqual([2, 3]);
    expect(locator.datum(2, { markIndex: 0 })).toBeNull();
  });

  it('aggregates the actual facet partition and preserves scoped locator identity', async () => {
    const source = plot([{ ...path, transform: summarize }]);
    delete source.coordinate;
    source.composition = {
      defaultView: 'main',
      views: [{ id: 'main', coordinate: { type: 'cartesian2D', x: 'x', y: 'y' } }],
      arrangements: [{ kind: 'facet', id: 'groups', view: 'main', column: { field: 'group' } }],
    };
    const data = {
      rows: [
        { group: 'a', y: 2 },
        { group: 'a', y: 4 },
        { group: 'b', y: 8 },
      ],
    };
    const prepared = await (
      await preparePlotData(source, { dataBindings: { rows: { kind: 'rows', rows: data.rows } } })
    ).execute();
    expect(prepared.panels.map(panel => panel[0]?.rows)).toMatchObject([[{ mean: 3 }], [{ mean: 8 }]]);
    expect(leaves(lowerPlot(source, data, options, undefined, prepared))).toEqual(
      leaves(lowerPlot(source, data, options)),
    );
    const locator = createPlotLineageLocator(source, data, { ...options, environment: {} });
    const a = locator.datum(0, { markIndex: 0, facet: { id: 'groups', column: 'a' } });
    const b = locator.datum(0, { markIndex: 0, facet: { id: 'groups', column: 'b' } });
    expect(a?.anchor.meta.sourceIndices).toEqual([0, 1]);
    expect(b?.anchor.meta.sourceIndices).toEqual([2]);
    expect(a?.anchor.position).not.toEqual(b?.anchor.position);
  });

  it('only contributes final data positions to an inferred domain when enabled', () => {
    const source = plot([
      { type: 'point', autoPadding: false, encoding: { x: { field: 'x' }, y: { field: 'y' } } },
      { ...point, position: { x: 5, y: { field: 'limit' } } },
    ]);
    source.scales = [
      { type: 'linear', name: 'x', domainPadding: 0 },
      { type: 'linear', name: 'y', domainPadding: 0 },
    ];
    const data = {
      rows: [
        { x: 0, y: 0, limit: 100 },
        { x: 10, y: 10, limit: 100 },
      ],
    };
    const original = leaves(lowerPlot(source, data, options));
    source.marks[1] = MarkOperationSchema.parse({ ...source.marks[1], contributeToDomain: true });
    const included = leaves(lowerPlot(source, data, options));
    expect(original[1]).not.toEqual(included[1]);
    expect(included).toHaveLength(4);
  });

  it('retains coordinate connection semantics for field-driven polar paths and regions', () => {
    const source = plot([
      { ...path, from: { x: 0, y: { field: 'y' } }, to: { x: 5, y: { field: 'y' } } },
      { type: 'interval', kind: 'annotation', bounds: { x: { from: 0, to: 5 }, y: { from: 1, to: { field: 'y' } } } },
    ]);
    source.coordinate = { type: 'polar2D', angle: 'x', radius: 'y' };
    const result = leaves(lowerPlot(source, { rows: [{ y: 5 }] }, options));
    expect(result[0].type === 'path' && result[0].children.length).toBeGreaterThan(2);
    expect(result[1]).toHaveProperty('shape.type', 'sector');
  });

  it('applies marks execution policy and declaration overrides to annotation transforms', () => {
    const source = plot([{ ...path, transform: summarize }]);
    source.dataExecution = { root: { mode: 'builtin' }, marks: { mode: 'external', external: 'fixture' } };
    expect(() => lowerPlot(source, { rows }, options)).toThrow(/async preparation/i);
    source.marks[0] = MarkOperationSchema.parse({
      ...path,
      transform: summarize.map(declaration => ({
        ...declaration,
        dataExecution: { mode: 'builtin' },
      })),
    });
    expect(leaves(lowerPlot(source, { rows }, options))).toHaveLength(1);
  });
});
