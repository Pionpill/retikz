import type { IRChild, IRNode, IRPath, IRScope } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { createDataTransformExecutor } from '@retikz/data';
import { describe, expect, it, vi } from 'vitest';

import type { MarkChannels } from '../../src/contract';
import type { CoordinateFrame, PositionScale } from '../../src/contract';
import { lowerPlot } from '../../src/pipeline/expand/lower';
import { preparePlotData } from '../../src/pipeline/expand/preparation';
import { lowerPlotWithLineage } from '../../src/pipeline/lineage';
import { lowerMark, MARK_REGISTRY } from '../../src/providers';
import { createCartesianCoordinate } from '../../src/providers';
import { resolveMarkOperation, resolveMarkInstances } from '../../src/resolve/mark';
import type { IRPlotMark } from '../../src/schemas';
import { PointMarkSchema } from '../../src/schemas';
import { MarkSchema, PlotSchema } from '../../src/schemas';
import { measureLabel } from '../helpers/text-measurement';

const point = {
  type: 'point',
  encodings: { position: { x: { value: 5 }, y: { value: 5 } } },
  properties: { text: 'target' },
  contributeToDomain: false,
};
const plot = (marks: Array<unknown> = [point]) =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'data' },
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    scales: [
      { type: 'linear', name: 'x', domain: [0, 10], domainPadding: 0 },
      { type: 'linear', name: 'y', domain: [0, 10], domainPadding: 0 },
    ],
    marks,
  });
const nodes = (child: IRChild): Array<IRNode> =>
  child.type === 'node' ? [child as IRNode] : child.type === 'scope' ? (child as IRScope).children.flatMap(nodes) : [];
const paths = (child: IRChild): Array<IRPath> =>
  child.type === 'path' ? [child as IRPath] : child.type === 'scope' ? (child as IRScope).children.flatMap(paths) : [];

describe('independent annotations', () => {
  it.each([
    { name: 'label only', properties: {}, encodings: undefined, expected: undefined },
    { name: 'fixed body text', properties: { text: 'Body' }, encodings: undefined, expected: 'Body' },
    { name: 'encoded body text', properties: {}, encodings: { text: 'title' }, expected: 'Bound body' },
    {
      name: 'missing encoded text',
      properties: { text: 'Fallback' },
      encodings: { text: 'missing' },
      expected: undefined,
    },
  ])('keeps point annotation body and attached label separate: $name', ({ properties, encodings, expected }) => {
    const source = plot([
      {
        type: 'point',
        encodings: { ...encodings, position: { x: { value: 5 }, y: { value: 5 } } },
        properties: {
          ...properties,
          shape: 'circle',
          label: { text: 'A', position: 'top', distance: 8 },
        },
        contributeToDomain: false,
      },
    ]);
    const output = nodes(lowerPlot(source, { data: [{ title: 'Bound body' }] }, { textMeasurer: measureLabel }));
    expect(output).toHaveLength(1);
    expect(output[0].text).toBe(expected);
    expect(output[0].label).toMatchObject({ text: 'A', position: 'top', distance: 8 });
  });

  it('uses coordinate connections by default and preserves explicit straight connections in JSON', () => {
    const path = {
      type: 'path',
      encodings: { from: { x: { value: 0 }, y: { value: 5 } }, to: { x: { value: 5 }, y: { value: 5 } } },
      properties: {},
      contributeToDomain: false,
    };
    expect(MarkSchema.parse(path)).toHaveProperty('properties.connection', 'coordinate');
    const straight = MarkSchema.parse({
      ...path,

      properties: { ...path.properties, connection: 'straight' },
    });
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(straight)))).toEqual(straight);
    expect(MarkSchema.safeParse({ ...path, connection: 'invalid' }).success).toBe(false);
  });

  it('passes through intermediate categories for paths and includes both interval boundaries', () => {
    const source = plot([
      {
        type: 'path',
        encodings: { from: { x: { value: 'A' }, y: { value: 5 } }, to: { x: { value: 'C' }, y: { value: 5 } } },
        properties: {},
        contributeToDomain: false,
      },
      {
        type: 'point',
        encodings: { position: { x: { value: 'B' }, y: { value: 5 } } },
        properties: {},
        contributeToDomain: false,
      },
      {
        type: 'interval',
        encodings: {
          bounds: { x: { from: { value: 'B' }, to: { value: 'E' } }, y: { from: { value: 2 }, to: { value: 8 } } },
        },
        properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'extent' } } },
        contributeToDomain: false,
      },
    ]);
    source.coordinate = { type: 'polar2D', angle: 'x', radius: 'y' };
    source.scales[0] = {
      type: 'band',
      name: 'x',
      domain: ['A', 'B', 'C', 'D', 'E', 'F'],
      paddingInner: 0,
      paddingOuter: 0,
    };
    const output = lowerPlot(PlotSchema.parse(source), { data: [] }, { textMeasurer: measureLabel });
    const steps = paths(output)[0].children;
    expect(steps).toHaveLength(3);
    expect(steps[1]).toMatchObject({ kind: 'line', to: nodes(output)[0].position });
    const region = nodes(output)[1];
    expect(region.shape).toMatchObject({ type: 'contour' });
    if (typeof region.shape === 'object' && region.shape.type === 'contour') {
      expect(region.shape.params?.points).toHaveLength(8);
    }
    source.marks[0] = MarkSchema.parse({
      ...source.marks[0],

      properties: { ...source.marks[0].properties, connection: 'straight' },
    });
    expect(
      paths(lowerPlot(PlotSchema.parse(source), { data: [] }, { textMeasurer: measureLabel }))[0].children,
    ).toHaveLength(2);
  });

  it('uses declared coordinate roles and final reversed ranges for edges', () => {
    const scale: PositionScale = {
      coordinate: value => Number(value) * 10,
      domain: () => [0, 10],
      bandwidth: 0,
      step: 0,
      range: () => [100, -20],
      setRange: () => undefined,
      ticks: () => ({ values: [], labels: [] }),
    };
    const base = createCartesianCoordinate(scale, scale);
    const frame: CoordinateFrame = { ...base, roles: ['x', 'y'], roleScales: { x: scale, y: scale } };
    const mark = PointMarkSchema.parse({
      type: 'point',
      encodings: { position: { x: { edge: 'end' }, y: { value: 2 } } },
      properties: {},
      contributeToDomain: false,
    });
    expect(nodes(lowerGeometry(mark, frame, {})!)[0].position).toEqual([-20, 20]);
    const { projectMappedRoles: _project, ...unsupported } = frame;
    expect(() => lowerGeometry(mark, unsupported, {})).toThrow(/projection/i);
  });

  it('does not let a reference constant expand the data domain unless opted in', () => {
    const dataMark = {
      type: 'point',
      encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
      properties: { autoPadding: false },
    };
    const source = plot([
      dataMark,
      {
        ...point,
        encodings: { position: { x: { value: 5 }, y: { value: 100 } } },
        properties: { ...point.properties },
      },
    ]);
    source.scales = [
      { type: 'linear', name: 'x', domainPadding: 0 },
      { type: 'linear', name: 'y', domainPadding: 0 },
    ];
    const data = {
      data: [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
    };
    const without = nodes(lowerPlot(source, data, { textMeasurer: measureLabel }));
    source.marks[1] = PointMarkSchema.parse({
      ...point,
      contributeToDomain: true,

      encodings: { position: { x: { value: 5 }, y: { value: 100 } } },
      properties: { ...point.properties },
    });
    const withContribution = nodes(lowerPlot(source, data, { textMeasurer: measureLabel }));
    expect(without[1].position).not.toEqual(withContribution[1].position);
  });
  it('retains declaration identity without claiming row values or transform lineage', () => {
    const source = plot([{ ...point, id: 'reference', properties: { ...point.properties } }]);
    const result = lowerPlotWithLineage(
      source,
      { data: [{ privateValue: 17 }] },
      {
        environment: {},
        lineage: { rowValues: { maxRows: 5, fields: ['privateValue'] }, transformScopes: true, markIdentity: true },
      },
    );
    expect(result.lineage.marks[0]).toMatchObject({ markId: 'reference' });
    expect(result.lineage.marks[0]).not.toHaveProperty('rowValues');
    expect(result.lineage.marks[0]).not.toHaveProperty('transformScope');
    expect(result.lineage.data.marks).toEqual([]);
  });

  it('draws once per actual facet without fabricating missing partitions', () => {
    const source = plot([{ ...point, id: 'reference', properties: { ...point.properties } }]);
    delete source.coordinate;
    source.composition = {
      defaultView: 'main',
      views: [{ id: 'main', coordinate: { type: 'cartesian2D', x: 'x', y: 'y' } }],
      arrangements: [{ kind: 'facet', id: 'groups', view: 'main', column: { field: 'group' } }],
    };
    const output = lowerPlot(
      source,
      { data: [{ group: 'a' }, { group: 'a' }, { group: 'b' }] },
      { textMeasurer: measureLabel },
    );
    expect(nodes(output).filter(node => node.text === 'target')).toHaveLength(2);
    expect(() => compileToScene({ type: 'scene', version: 1, children: [output] })).not.toThrow();
  });
  it('emits JSON-safe Kernel IR that compiles without a separate renderer', () => {
    const output = lowerPlot(plot(), { data: [] }, { textMeasurer: measureLabel });
    expect(() => compileToScene({ type: 'scene', version: 1, children: [output] })).not.toThrow();
  });
  it('executes only the root data scope for annotation-only plots', async () => {
    const executor = createDataTransformExecutor();
    const prepare = vi.spyOn(executor, 'prepare');
    const preparation = await preparePlotData(plot(), {
      dataBindings: { data: { kind: 'rows', rows: [] } },
      dataTransformExecutor: executor,
    });
    const result = await preparation.execute();
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(result.marks).toEqual([undefined]);
    expect(result.root.rows).toEqual([]);
  });

  it('draws a reference line across the final view edges and an independent region', () => {
    const source = plot([
      {
        type: 'path',
        encodings: { from: { x: { edge: 'start' }, y: { value: 5 } }, to: { x: { edge: 'end' }, y: { value: 5 } } },
        properties: { stroke: 'red' },
        contributeToDomain: false,
      },
      {
        type: 'interval',
        encodings: {
          bounds: { x: { from: { value: 2 }, to: { value: 8 } }, y: { from: { value: 2 }, to: { value: 8 } } },
        },
        properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'extent' } }, fill: 'blue' },
        contributeToDomain: false,
      },
    ]);
    const output = lowerPlot(source, { data: [] }, { textMeasurer: measureLabel });
    expect(paths(output)).toHaveLength(1);
    expect(paths(output)[0].children).toHaveLength(2);
    expect(paths(output)[0].style?.stroke).toBe('red');
    expect(nodes(output)).toHaveLength(1);
    expect((output as IRScope).children[1]).toMatchObject({ defaults: { node: { style: { fill: 'blue' } } } });
  });

  it('preserves polar interpolation and projects intervals as sectors', () => {
    const source = plot([
      {
        type: 'path',
        encodings: { from: { x: { value: 0 }, y: { value: 5 } }, to: { x: { value: 5 }, y: { value: 5 } } },
        properties: {},
        contributeToDomain: false,
      },
      {
        type: 'interval',
        encodings: {
          bounds: { x: { from: { value: 0 }, to: { value: 5 } }, y: { from: { value: 2 }, to: { value: 8 } } },
        },
        properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'extent' } } },
        contributeToDomain: false,
      },
    ]);
    source.coordinate = { type: 'polar2D', angle: 'x', radius: 'y' };
    const output = lowerPlot(source, { data: [] }, { textMeasurer: measureLabel });
    expect(paths(output)[0].children.length).toBeGreaterThan(2);
    expect(nodes(output)[0].shape).toMatchObject({ type: 'sector' });
  });

  it('uses explicit literal domain contributions without requiring rows', () => {
    const source = plot([{ ...point, contributeToDomain: true, properties: { ...point.properties } }]);
    source.scales = [
      { type: 'linear', name: 'x', domainPadding: 0 },
      { type: 'linear', name: 'y', domainPadding: 0 },
    ];
    expect(nodes(lowerPlot(source, { data: [] }, { textMeasurer: measureLabel }))).toHaveLength(1);
  });
  it('round-trips direct constants without interpreting strings as fields', () => {
    const parsed = MarkSchema.parse(point);
    expect(MarkSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it.each(['encoding', 'field', 'dataset', 'series', 'order'])('rejects unsupported property %s', key => {
    expect(MarkSchema.safeParse({ ...point, [key]: 'value' }).success).toBe(false);
  });

  it.each([
    { rows: [] },
    {
      rows: [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ],
    },
  ])('creates exactly one point with bound rows $rows', ({ rows }) => {
    const result = lowerPlot(plot(), { data: rows }, { textMeasurer: measureLabel });
    expect(nodes(result)).toHaveLength(1);
    expect(nodes(result)[0].text).toBe('target');
  });

  it('requires a root data declaration even with only annotations', () => {
    const { data: _data, ...source } = plot();
    expect(PlotSchema.safeParse(source).success).toBe(false);
  });

  it('rejects missing root binding in synchronous and asynchronous entry points', async () => {
    expect(() => lowerPlot(plot(), {}, { textMeasurer: measureLabel })).toThrow(/data|binding|reference/i);
    await expect(preparePlotData(plot(), { dataBindings: {} })).rejects.toThrow(/binding/i);
  });

  it('maps point constants through the same coordinate frame as data marks', () => {
    const annotation = lowerPlot(plot(), { data: [] }, { textMeasurer: measureLabel });
    const data = lowerPlot(
      plot([
        {
          type: 'point',
          encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
          properties: { autoPadding: false },
        },
      ]),
      { data: [{ x: 5, y: 5 }] },
      { textMeasurer: measureLabel },
    );
    expect(nodes(annotation)[0].position).toEqual(nodes(data)[0].position);
  });

  it('rejects missing and unknown coordinate roles', () => {
    for (const position of [{ x: 5 }, { x: 5, y: 5, z: 1 }]) {
      expect(() =>
        lowerPlot(
          plot([{ ...point, position, properties: { ...point.properties } }]),
          { data: [] },
          { textMeasurer: measureLabel },
        ),
      ).toThrow(/role|position/i);
    }
  });
});

/** 通过普通 Mark 注册入口验证坐标能力 */
const lowerGeometry = (mark: IRPlotMark, frame: CoordinateFrame, channels: MarkChannels) => {
  const resolution = resolveMarkOperation(mark, { registry: MARK_REGISTRY });
  return lowerMark(resolution, resolveMarkInstances(resolution, []), frame, channels);
};
