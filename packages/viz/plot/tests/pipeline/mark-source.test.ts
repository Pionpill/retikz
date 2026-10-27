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
    const properties = { autoPadding: false };
    const [point] = render(
      [
        {
          type: 'point',
          encodings: { position: { x: { field: 'x' }, y: { edge: 'end' } } },
          properties,
        },
      ],
      [{ x: 2 }],
    );
    const [annotation] = render([
      {
        type: 'point',
        encodings: { position: { x: { value: 2 }, y: { edge: 'end' } } },
        properties: {},
        contributeToDomain: false,
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
            encodings: { position: { x: { edge: 'end' }, y: { field: 'y' } } },
            properties: { ...(closure === undefined ? {} : { closure }) },
          },
        ],
        rows,
      );
      const [expected] = render(
        [
          {
            type: 'path',
            encodings: { position: { x: { value: 10 }, y: { field: 'y' } } },
            properties: { ...(closure === undefined ? {} : { closure }) },
          },
        ],
        rows,
      );
      expect(path).toBeDefined();
      expect(path).toEqual(expected);
    },
  );
  it('projects fixed path endpoint edges through the final coordinate range', () => {
    const path = (x: { value: number } | { edge: 'end' }) => ({
      type: 'path',
      encodings: {
        from: { x: { value: 0 }, y: { field: 'start' } },
        to: { x, y: { field: 'end' } },
      },
      properties: {},
    });
    const rows = [{ start: 2, end: 8 }];
    const actual = render([path({ edge: 'end' })], rows);
    const expected = render([path({ value: 10 })], rows);
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
          type: 'path',
          encodings: {
            from: { x: { value: 1 }, y: { value: 2 } },
            to: { x: { value: 8 }, y: { value: 6 } },
            ribbon: { width: { field: 'amount', scale: 'width' } },
          },
          properties: {
            kind: 'ribbon',
            ribbon: { width: { kind: 'fixed', value: 99 } },
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
          encodings: { position: { y: { value: 3 }, x: { field: 'x' } } },
          properties: { autoPadding: false },
        },
      ],
      [{ x: 2 }],
    );
    const [expected] = render(
      [
        {
          type: 'point',
          encodings: { position: { x: { field: 'x' }, y: { field: 'y' } } },
          properties: { autoPadding: false },
        },
      ],
      [{ x: 2, y: 3 }],
    );
    expect(actual).toMatchObject({ position: expected.type === 'node' ? expected.position : undefined });
  });
  it('keeps constant marks independent with an omitted or empty transform chain', () => {
    const mark = {
      type: 'point',
      encodings: { position: { x: { value: 2 }, y: { value: 3 } } },
      properties: {},
      contributeToDomain: false,
    };
    expect(render([mark])).toHaveLength(1);
    expect(render([{ ...mark, transforms: [] }])).toHaveLength(1);
    expect(render([{ ...mark, transforms: [] }], [{ x: 1 }, { x: 2 }])).toHaveLength(1);
  });

  it('combines field and fixed roles without treating fixed positions as pixels', () => {
    const source = {
      type: 'point',
      encodings: { position: { y: { value: 3 }, x: { field: 'value' } } },
      properties: {},
      contributeToDomain: false,
    };
    const actual = render([source], [{ value: 2 }])[0];
    const expected = render([
      {
        type: 'point',
        encodings: { position: { x: { value: 2 }, y: { value: 3 } } },
        properties: {},
        contributeToDomain: false,
      },
    ])[0];
    expect(actual).toMatchObject({ position: expected.type === 'node' ? expected.position : undefined });
  });

  it('resolves each label at its corresponding property index', () => {
    const [node] = render(
      [
        {
          type: 'point',
          encodings: {
            position: { x: { field: 'x' }, y: { field: 'y' } },
            label: [{ text: 'a' }, { text: 'b' }],
          },
          properties: { label: [{ position: 'left', text: 'ignored' }, { position: 'right' }] },
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
          encodings: { text: 'name', position: { x: { value: 2 }, y: { value: 3 } } },
          properties: { text: 'fallback' },
          contributeToDomain: false,
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
            encodings: { position: { y: { value: 3 }, x: { field: 'missing' } } },
            properties: {},
            contributeToDomain: false,
          },
        ],
        [{ x: 1 }],
      ),
    ).toThrow();
  });
});
