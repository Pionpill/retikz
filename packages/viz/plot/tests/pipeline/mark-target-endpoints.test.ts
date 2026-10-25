import type { CompileWarning, IRChild, IRPath, IRScope, ScenePrimitive } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { describe, expect, it, vi } from 'vitest';

import { lowerPlot } from '../../src/pipeline/expand/lower';
import { PlotSchema } from '../../src/schemas';
import { measureLabel } from '../helpers/text-measurement';

const lower = (
  source: Parameters<typeof lowerPlot>[0],
  datasets: Parameters<typeof lowerPlot>[1],
  options: Partial<Parameters<typeof lowerPlot>[2]> = {},
) => lowerPlot(source, datasets, { textMeasurer: measureLabel, ...options });

const rows = [
  { id: 'a', x: 2, y: 3, source: 'a', target: 'b' },
  { id: 'b', x: 8, y: 7, source: 'b', target: 'a' },
];
const nodes = {
  type: 'point',
  id: 'nodes',
  encodings: { anchorId: 'id', position: { x: { field: 'x' }, y: { field: 'y' } } },
  properties: { anchorId: { prefix: 'custom' } },
};
const connection = {
  type: 'path',
  id: 'links',
  encodings: {
    from: { mark: 'nodes', key: { field: 'source' } },
    to: { mark: 'nodes', key: { field: 'target' } },
  },
};
const plot = (marks: Array<unknown>) =>
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
const paths = (child: IRChild): Array<IRPath> =>
  child.type === 'path' ? [child as IRPath] : child.type === 'scope' ? (child as IRScope).children.flatMap(paths) : [];

const flatten = (items: Array<ScenePrimitive>): Array<ScenePrimitive> =>
  items.flatMap(item => (item.type === 'group' ? flatten(item.children) : [item]));

describe('Mark target connections', () => {
  it('resolves step targets and rejects their forward declarations even for empty data', () => {
    const stepped = {
      type: 'path',
      encodings: {
        steps: [
          { kind: 'move', to: connection.encodings.from },
          { kind: 'bend', to: connection.encodings.to, outAngle: 30, inAngle: 150 },
        ],
      },
    };
    const lowered = lower(plot([nodes, stepped]), { data: rows });
    expect(paths(lowered)).toHaveLength(2);
    expect(paths(lowered)[0].children).toMatchObject([
      { kind: 'move', to: { id: 'custom.a' } },
      { kind: 'bend', to: { id: 'custom.b' }, outAngle: 30, inAngle: 150 },
    ]);
    expect(() => compileToScene({ version: 1, type: 'scene', children: [lowered] })).not.toThrow();
    expect(() => lower(plot([stepped, nodes]), { data: [] })).toThrow(/declared before/);
  });
  it('resolves target identity and compiles actual geometry', () => {
    const lowered = lower(plot([nodes, connection]), { data: rows }, { textMeasurer: measureLabel });
    const links = paths(lowered);
    expect(links).toHaveLength(2);
    expect(links[0].children).toMatchObject([
      { kind: 'move', to: { id: 'custom.a' } },
      { kind: 'line', to: { id: 'custom.b' } },
    ]);
    const warnings: Array<CompileWarning> = [];
    const result = compileToScene(
      { version: 1, type: 'scene', children: [lowered] },
      { onWarn: warning => warnings.push(warning) },
    );
    expect(warnings).toEqual([]);
    expect(flatten(result.scene.primitives).filter(item => item.type === 'path')).toHaveLength(2);
  });

  it('rejects targets declared after their connection', () => {
    expect(() => lower(plot([connection, nodes]), { data: rows }, { textMeasurer: measureLabel })).toThrow(
      /declared before/,
    );
  });

  it('validates declaration order even when the data is empty', () => {
    expect(() => lower(plot([connection, nodes]), { data: [] })).toThrow(/declared before/);
  });

  it('rejects duplicate declarations and targets without exposed identities', () => {
    expect(() => lower(plot([nodes, nodes, connection]), { data: rows })).toThrow(/Duplicate mark id/);
    const unnamedIdentity = { ...nodes, encodings: { position: nodes.encodings.position }, properties: {} };
    expect(() => lower(plot([unnamedIdentity, connection]), { data: rows })).toThrow(/does not expose anchorId/);
  });

  it('does not treat an entire endpoint path as a node target', () => {
    const target = {
      type: 'path',
      id: 'nodes',
      encodings: { from: { x: { value: 0 }, y: { value: 0 } }, to: { x: { value: 1 }, y: { value: 1 } } },
      properties: { anchorId: { template: 'a' } },
    };
    expect(() => lower(plot([target, connection]), { data: rows })).toThrow(/whole-path/);
  });

  it('does not infer a position domain from identity keys', () => {
    const spec = plot([nodes, connection]);
    const inferred = { ...spec, scales: spec.scales.map(scale => ({ ...scale, domain: undefined })) };
    const compile = (data: typeof rows) =>
      flatten(
        compileToScene({ type: 'scene', version: 1, children: [lower(inferred, { data })] }).scene.primitives,
      ).filter(item => item.type === 'path');
    const renamed = rows.map(row => ({
      ...row,
      id: row.id === 'a' ? '1000000' : '2000000',
      source: row.source === 'a' ? '1000000' : '2000000',
      target: row.target === 'a' ? '1000000' : '2000000',
    }));
    expect(compile(rows)).toEqual(compile(renamed));
  });

  it('generates one constant connection independently of data row count', () => {
    const fixed = {
      ...connection,
      encodings: { from: { mark: 'nodes', key: { value: 'a' } }, to: { x: { value: 0 }, y: { value: 0 } } },
    };
    expect(paths(lower(plot([nodes, fixed]), { data: rows }, { textMeasurer: measureLabel }))).toHaveLength(1);
  });

  it('diagnoses missing keys rather than falling back to a coordinate', () => {
    const fixed = {
      ...connection,
      encodings: { from: { mark: 'nodes', key: { value: 'missing' } }, to: { x: { value: 0 }, y: { value: 0 } } },
    };
    expect(() => lower(plot([nodes, fixed]), { data: rows }, { textMeasurer: measureLabel })).toThrow(/missing/);
  });

  it('rejects coordinate interpolation for geometry references', () => {
    expect(() =>
      lower(
        plot([nodes, { ...connection, properties: { connection: 'coordinate' } }]),
        { data: rows },
        { textMeasurer: measureLabel },
      ),
    ).toThrow(/coordinate/);
  });

  it('preserves identity after rows are reordered', () => {
    const fixed = {
      ...connection,
      encodings: { from: { mark: 'nodes', key: { value: 'a' } }, to: { mark: 'nodes', key: { value: 'b' } } },
    };
    const compile = (data: typeof rows) =>
      flatten(
        compileToScene({ type: 'scene', version: 1, children: [lower(plot([nodes, fixed]), { data })] }).scene
          .primitives,
      ).filter(item => item.type === 'path');
    expect(compile(rows)).toEqual(compile([...rows].reverse()));
  });

  it('evaluates target generators once and uses their returned key', () => {
    const generator = vi.fn(() => 'generated');
    const target = {
      ...nodes,
      encodings: { position: { x: { value: 2 }, y: { value: 3 } } },
      properties: { anchorId: { generator: 'identity' } },
    };
    const fixed = {
      ...connection,
      encodings: { from: { mark: 'nodes', key: { value: 'generated' } }, to: { x: { value: 0 }, y: { value: 0 } } },
    };
    const lowered = lower(plot([target, fixed]), { data: [] }, { anchorIdGenerators: { identity: generator } });
    expect(generator).toHaveBeenCalledTimes(1);
    expect(paths(lowered)[0].children[0]).toMatchObject({ to: { id: 'generated' } });
  });

  it('uses a constant template identity without inventing a data row', () => {
    const target = {
      ...nodes,
      encodings: { position: { x: { value: 2 }, y: { value: 3 } } },
      properties: { anchorId: { template: 'fixed' } },
    };
    const fixed = {
      ...connection,
      encodings: { from: { mark: 'nodes', key: { value: 'fixed' } }, to: { x: { value: 0 }, y: { value: 0 } } },
    };
    expect(paths(lower(plot([target, fixed]), { data: [] }))[0].children[0]).toMatchObject({ to: { id: 'fixed' } });
  });

  it.each([null, '', {}, true])('rejects invalid identity data %j', id => {
    expect(() => lower(plot([nodes, connection]), { data: [{ ...rows[0], id }] })).toThrow(/key|anchorId/);
  });

  it('rejects numeric/string identity collisions', () => {
    expect(() =>
      lower(plot([nodes, connection]), {
        data: [
          { ...rows[0], id: 1 },
          { ...rows[1], id: '1' },
        ],
      }),
    ).toThrow(/duplicate/i);
  });

  it('does not register targets whose geometry is missing', () => {
    expect(() => lower(plot([nodes, connection]), { data: [{ ...rows[0], x: null }, rows[1]] })).toThrow(
      /Missing mark target key/,
    );
  });

  it('references path vertices but rejects shape boundaries on them', () => {
    const vertices = { type: 'path', id: 'nodes', encodings: nodes.encodings };
    expect(paths(lower(plot([vertices, connection]), { data: rows }))).toHaveLength(3);
    const bounded = {
      ...connection,
      encodings: { ...connection.encodings, from: { ...connection.encodings.from, boundary: 'shape' } },
    };
    expect(() => lower(plot([vertices, bounded]), { data: rows })).toThrow(/Coordinate target/);
  });

  it('references interval region nodes', () => {
    const intervals = {
      type: 'interval',
      id: 'nodes',
      encodings: {
        anchorId: 'id',
        bounds: { x: { from: { field: 'x' }, to: { value: 9 } }, y: { from: { value: 0 }, to: { field: 'y' } } },
      },
      properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'extent' } } },
    };
    const lowered = lower(plot([intervals, connection]), { data: rows });
    const warnings: Array<CompileWarning> = [];
    compileToScene({ type: 'scene', version: 1, children: [lowered] }, { onWarn: warning => warnings.push(warning) });
    expect(warnings).toEqual([]);
    expect(paths(lowered)).toHaveLength(2);
  });

  it('isolates repeated target identities in facet panels', () => {
    const source = plot([nodes, connection]);
    const faceted = PlotSchema.parse({
      ...source,
      coordinate: undefined,
      composition: {
        defaultView: 'root',
        views: [{ id: 'root', coordinate: { type: 'cartesian2D', x: 'x', y: 'y' } }],
        arrangements: [{ kind: 'facet', id: 'panels', view: 'root', column: { field: 'panel' } }],
      },
    });
    const data = ['left', 'right'].flatMap(panel => rows.map(row => ({ ...row, panel })));
    const lowered = lower(faceted, { data }, { textMeasurer: measureLabel });
    expect(paths(lowered)).toHaveLength(4);
    expect(() =>
      lower(
        faceted,
        { data: data.filter(row => !(row.panel === 'right' && row.id === 'b')) },
        { textMeasurer: measureLabel },
      ),
    ).toThrow(/Missing mark target key/);
  });

  it('does not generate field-bound connections for an empty result', () => {
    expect(paths(lower(plot([nodes, connection]), { data: [] }))).toHaveLength(0);
  });
});
