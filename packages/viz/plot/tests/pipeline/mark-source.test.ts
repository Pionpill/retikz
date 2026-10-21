import type { IRChild, IRNode, IRPath, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { lowerPlot } from '../../src/pipeline/expand/lower';
import { PlotSchema } from '../../src/schemas';
import { measureLabel } from '../helpers/text-measurement';

const leaves = (child: IRChild): Array<IRNode | IRPath> =>
  child.type === 'scope'
    ? (child as IRScope).children.flatMap(leaves)
    : child.type === 'node' || child.type === 'path'
      ? child.id === 'chart.plotArea'
        ? []
        : [child as IRNode | IRPath]
      : [];

const render = (marks: Array<unknown>, rows: Array<Record<string, string | number>> = []) =>
  leaves(
    lowerPlot(
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
      }),
      { rows },
      { textMeasurer: measureLabel },
    ),
  );

describe('mark field and property lowering', () => {
  it('uses the same final range edge for data points and annotations', () => {
    const properties = { position: { y: { edge: 'end' } }, autoPadding: false };
    const [point] = render(
      [
        {
          type: 'point',
          kind: 'data',
          encodings: { position: { x: 'x' } },
          properties,
        },
      ],
      [{ x: 2 }],
    );
    const [annotation] = render([
      {
        type: 'point',
        kind: 'annotation',
        properties: { position: { x: 2, y: { edge: 'end' } } },
      },
    ]);
    expect(point).toMatchObject({ position: annotation.type === 'node' ? annotation.position : undefined });
  });
  it.each([undefined, { kind: 'baseline', baseline: 0 }])(
    'projects path edges and closure on the same final range: %j',
    closure => {
      const rows = [{ y: 2 }, { y: 8 }];
      const [path] = render(
        [
          {
            type: 'path',
            kind: 'data',
            encodings: { position: { y: 'y' } },
            properties: { position: { x: { edge: 'end' } }, ...(closure === undefined ? {} : { closure }) },
          },
        ],
        rows,
      );
      const [expected] = render(
        [
          {
            type: 'path',
            kind: 'data',
            encodings: { position: { y: 'y' } },
            properties: { position: { x: 10 }, ...(closure === undefined ? {} : { closure }) },
          },
        ],
        rows,
      );
      expect(path).toBeDefined();
      expect(path).toEqual(expected);
    },
  );
  it('projects fixed relation target edges through the final coordinate range', () => {
    const relation = (x: number | { edge: 'end' }) => ({
      type: 'relation',
      kind: 'data',
      encodings: { source: { position: { y: 'start' } }, target: { position: { y: 'end' } } },
      properties: { geometry: { kind: 'path' }, source: { position: { x: 0 } }, target: { position: { x } } },
    });
    const rows = [{ start: 2, end: 8 }];
    const actual = render([relation({ edge: 'end' })], rows);
    const expected = render([relation(10)], rows);
    expect(expected).toHaveLength(1);
    expect(actual).toEqual(expected);
  });
  it('maps ribbon widths through their named scale', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'rows' },
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      scales: [
        { type: 'linear', name: 'x', domain: [0, 10], domainPadding: 0 },
        { type: 'linear', name: 'y', domain: [0, 10], domainPadding: 0 },
        { type: 'linear', name: 'width', domain: [0, 10], range: [2, 12] },
      ],
      marks: [
        {
          type: 'relation',
          kind: 'data',
          encodings: { geometry: { width: { field: 'amount', scale: 'width' } } },
          properties: {
            source: { position: { x: 1, y: 2 } },
            target: { position: { x: 8, y: 6 } },
            geometry: { kind: 'ribbon', width: 99 },
          },
        },
      ],
    });
    const [path] = leaves(lowerPlot(spec, { rows: [{ amount: 5 }] }, { textMeasurer: measureLabel }));
    expect(path).toMatchObject({ kind: 'ribbon', kindOptions: { width: { kind: 'fixed', value: 7 } } });
  });
  it('combines data point field positions with fixed data-space positions', () => {
    const [actual] = render(
      [
        {
          type: 'point',
          kind: 'data',
          encodings: { position: { x: 'x' } },
          properties: { position: { y: 3 }, autoPadding: false },
        },
      ],
      [{ x: 2 }],
    );
    const [expected] = render(
      [
        {
          type: 'point',
          kind: 'data',
          encodings: { position: { x: 'x', y: 'y' } },
          properties: { autoPadding: false },
        },
      ],
      [{ x: 2, y: 3 }],
    );
    expect(actual).toMatchObject({ position: expected.type === 'node' ? expected.position : undefined });
  });
  it('keeps fixed annotations independent but preserves an explicitly empty transform chain', () => {
    const mark = { type: 'point', kind: 'annotation', properties: { position: { x: 2, y: 3 } } };
    expect(render([mark])).toHaveLength(1);
    expect(render([{ ...mark, transforms: [] }])).toHaveLength(0);
    expect(render([{ ...mark, transforms: [] }], [{ x: 1 }, { x: 2 }])).toHaveLength(2);
  });

  it('combines field and fixed roles without treating fixed positions as pixels', () => {
    const source = {
      type: 'point',
      kind: 'annotation',
      encodings: { position: { x: 'value' } },
      properties: { position: { y: 3 } },
    };
    const actual = render([source], [{ value: 2 }])[0];
    const expected = render([{ type: 'point', kind: 'annotation', properties: { position: { x: 2, y: 3 } } }])[0];
    expect(actual).toMatchObject({ position: expected.type === 'node' ? expected.position : undefined });
  });

  it('resolves each label at its corresponding property index', () => {
    const [node] = render(
      [
        {
          type: 'point',
          kind: 'data',
          encodings: { position: { x: 'x', y: 'y' }, label: [{ content: 'a' }, { content: 'b' }] },
          properties: { label: [{ position: 'left', content: 'ignored' }, { position: 'right' }] },
        },
      ],
      [{ x: 2, y: 3, a: 'first', b: 'second' }],
    );
    expect(node).toMatchObject({
      label: [
        { position: 'left', text: 'first' },
        { position: 'right', text: 'second' },
      ],
    });
  });

  it('uses nonposition annotation encodings to determine row instances', () => {
    const nodes = render(
      [
        {
          type: 'point',
          kind: 'annotation',
          encodings: { text: 'name' },
          properties: { position: { x: 2, y: 3 }, text: 'fallback' },
        },
      ],
      [{ name: 'one' }, { name: 'two' }],
    );
    expect(nodes.map(node => (node.type === 'node' ? node.text : undefined))).toEqual(['one', 'two']);
  });

  it('does not fall back to fixed positions for missing encoded values', () => {
    expect(() =>
      render(
        [
          {
            type: 'point',
            kind: 'annotation',
            encodings: { position: { x: 'missing' } },
            properties: { position: { x: 2, y: 3 } },
          },
        ],
        [{ x: 1 }],
      ),
    ).toThrow();
  });
});
