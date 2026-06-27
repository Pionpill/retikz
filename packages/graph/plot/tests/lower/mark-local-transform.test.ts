import type { IRScope } from '@retikz/core';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { type CustomMark, type ExternalRow, type PlotSpec, PlotSpecSchema } from '../../src/schemas';
import { defineMark, defineTransform } from '../../src/contract';
import { collectSourceFields } from '../../src/pipeline/source-fields';
import { type LowerPlotsOptions, lowerPlots } from '../../src/pipeline/expand';
import { resolveTransformRegistry } from '../../src/providers';

type Datasets = Record<string, Array<Record<string, unknown>>>;

const opts: LowerPlotsOptions = { width: 480, height: 300 };

const expandOf = (spec: PlotSpec, datasets: Datasets, options?: LowerPlotsOptions): IRScope => {
  const [def] = lowerPlots(datasets, options);
  return def.expand(spec) as IRScope;
};

const firstLayer = (spec: PlotSpec, datasets: Datasets, options?: LowerPlotsOptions): IRScope =>
  expandOf(spec, datasets, options).children[0] as IRScope;

const groupPointSpec = (): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'sales' },
    scales: [
      { type: 'band', name: 'category' },
      { type: 'linear', name: 'value' },
    ],
    coordinate: { type: 'cartesian2D', x: 'category', y: 'value' },
    marks: [
      {
        type: 'point',
        transform: [{ kind: 'summarize', groupBy: ['category'], metrics: [{ op: 'sum', field: 'value', as: 'total' }] }],
        encoding: { x: { field: 'category' }, y: { field: 'total' } },
      },
    ],
  });

const doubleTransform = defineTransform({
  schema: z.object({
    kind: z.literal('double-local'),
    field: z.string().min(1),
    as: z.string().min(1),
  }),
  inputFields: operation => [operation.field],
  outputFields: operation => [operation.as],
  apply: (rows, operation) =>
    rows.map(row => ({
      ...row,
      [operation.as]: Number(row[operation.field]) * 2,
    })),
});

const recorderMark = (record: { rows: Array<ExternalRow> }) =>
  defineMark<CustomMark>({
    type: 'dot',
    collectFields: (mark, fields) => {
      fields.addChannel(mark.encoding?.x);
      fields.addChannel(mark.encoding?.y);
    },
    lower: (_mark, rows) => {
      record.rows = rows;
      return { type: 'scope', children: [] };
    },
  });

describe('mark-local transform', () => {
  it('builtin_mark_uses_local_transform_rows_for_lowering', () => {
    const layer = firstLayer(groupPointSpec(), {
      sales: [
        { category: 'A', value: 4 },
        { category: 'A', value: 6 },
        { category: 'B', value: 3 },
      ],
    });

    expect(layer.children).toHaveLength(2);
  });

  it('mark_local_transform_fields_feed_source_field_collection', () => {
    const fields = collectSourceFields(groupPointSpec());
    expect([...fields].sort()).toEqual(['category', 'value']);
  });

  it('custom_mark_receives_local_transform_rows', () => {
    const record = { rows: [] as Array<ExternalRow> };
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      scales: [
        { type: 'band', name: 'category' },
        { type: 'linear', name: 'value' },
      ],
      coordinate: { type: 'cartesian2D', x: 'category', y: 'value' },
      marks: [
        {
          type: 'dot',
          transform: [{ kind: 'summarize', groupBy: ['category'], metrics: [{ op: 'sum', field: 'value', as: 'total' }] }],
          encoding: { x: { field: 'category' }, y: { field: 'total' } },
        },
      ],
    });

    expandOf(
      spec,
      {
        sales: [
          { category: 'A', value: 4 },
          { category: 'A', value: 6 },
          { category: 'B', value: 3 },
        ],
      },
      { ...opts, markDefinitions: [recorderMark(record)] },
    );

    expect(record.rows).toEqual([
      expect.objectContaining({ category: 'A', total: 10 }),
      expect.objectContaining({ category: 'B', total: 3 }),
    ]);
  });

  it('mark_local_transform_uses_custom_transform_registry', () => {
    const layer = firstLayer(
      PlotSpecSchema.parse({
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'sales' },
        scales: [
          { type: 'linear', name: 'x' },
          { type: 'linear', name: 'value' },
        ],
        coordinate: { type: 'cartesian2D', x: 'x', y: 'value' },
        marks: [
          {
            type: 'point',
            transform: [{ kind: 'double-local', field: 'value', as: 'double' }],
            encoding: { x: { field: 'x' }, y: { field: 'double' } },
          },
        ],
      }),
      {
        sales: [
          { x: 0, value: 2 },
          { x: 1, value: 5 },
        ],
      },
      { ...opts, transformDefinitions: [doubleTransform] },
    );

    expect(layer.children).toHaveLength(2);
  });

  it('mark_local_custom_transform_fields_use_same_registry', () => {
    const spec = PlotSpecSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'value' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'value' },
      marks: [
        {
          type: 'point',
          transform: [{ kind: 'double-local', field: 'value', as: 'double' }],
          encoding: { x: { field: 'x' }, y: { field: 'double' } },
        },
      ],
    });

    const fields = collectSourceFields(spec, resolveTransformRegistry([doubleTransform]));
    expect([...fields].sort()).toEqual(['value', 'x']);
  });
});
