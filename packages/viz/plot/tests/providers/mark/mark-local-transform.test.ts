import type { IRScope } from '@retikz/core';
import { defineTransformImplementation } from '@retikz/data';
import type { ExternalRow } from '@retikz/data';
import { defineTransform, resolveTransformRegistry, DataTransformDeclarationSchema } from '@retikz/data';
import { JsonValueSchema, NonBlankStringSchema } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';
import type { infer as ZodInfer } from 'zod';
import { array, literal, looseObject, object } from 'zod';

import { defineMark } from '../../../src/contract';
import type { LowerPlotsOptions } from '../../../src/pipeline/expand';
import { lowerPlot, lowerPlotWithDataArtifact } from '../../../src/pipeline/expand/lower';
import { collectSourceFields } from '../../../src/pipeline/source-fields';
import type { IRPlot } from '../../../src/schemas';
import { EncodingSchema, PlotSchema } from '../../../src/schemas';

type Datasets = Record<string, Array<Record<string, unknown>>>;

const DotMarkSchema = looseObject({
  type: literal('dot'),
  encoding: EncodingSchema.optional(),
  transform: array(DataTransformDeclarationSchema).optional(),
}).catchall(JsonValueSchema);

type DotMark = ZodInfer<typeof DotMarkSchema>;

const opts: LowerPlotsOptions = { width: 480, height: 300 };

const expandOf = (spec: IRPlot, datasets: Datasets, options?: LowerPlotsOptions): IRScope => {
  return lowerPlot(spec, datasets, options) as IRScope;
};

const firstLayer = (spec: IRPlot, datasets: Datasets, options?: LowerPlotsOptions): IRScope =>
  expandOf(spec, datasets, options).children[0] as IRScope;

const groupPointSpec = (): IRPlot =>
  PlotSchema.parse({
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
        transform: [
          {
            operation: {
              kind: 'summarize',
              groupBy: ['category'],
              metrics: [{ kind: 'sum', field: 'value', as: 'total' }],
            },
          },
        ],
        encoding: { x: { field: 'category' }, y: { field: 'total' } },
      },
    ],
  });

const doubleTransform = defineTransform({
  schema: object({
    kind: literal('double-local'),
    field: NonBlankStringSchema,
    as: NonBlankStringSchema,
  }),
  inputFields: operation => [operation.field],
  outputModel: operation => ({ kind: 'preserve', outputs: [{ field: operation.as }] }),
});
const doubleTransformImplementation = defineTransformImplementation({
  definition: doubleTransform,
  apply: (rows, operation) =>
    rows.map(row => ({
      ...row,
      [operation.as]: Number(row[operation.field]) * 2,
    })),
});

const recorderMark = (record: { rows: Array<ExternalRow> }) =>
  defineMark<DotMark>({
    schema: DotMarkSchema,
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
  it('retains unknown output fields and category order across empty root and mark scopes', () => {
    const spec = PlotSchema.parse({
      namespace: 'plot',
      type: 'plot',
      data: {
        reference: 'rows',
        model: [
          { name: 'group', type: 'categorical', order: ['B', 'A'] },
          { name: 'value', type: 'continuous' },
        ],
      },
      transform: [
        {
          operation: {
            kind: 'summarize',
            groupBy: ['group'],
            metrics: [{ kind: 'extent', field: 'value', as: 'range' }],
          },
        },
      ],
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          transform: [{ operation: { kind: 'sort', field: 'range' } }],
          encoding: { x: { field: 'group' }, y: { field: 'range' } },
        },
      ],
    });
    const { dataArtifact } = lowerPlotWithDataArtifact(spec, { rows: [] });
    const expectedModel = [{ name: 'group', type: 'categorical', order: ['B', 'A'] }, { name: 'range' }];
    expect(dataArtifact.rootDataView.model).toEqual(expectedModel);
    expect(dataArtifact.markDataViews[0].dataView.model).toEqual(expectedModel);
    expect(dataArtifact.markDataViews[0].dataView.model.find(field => field.name === 'range')).toEqual({
      name: 'range',
    });
    expect(dataArtifact.markDataViews[0].dataView.rows).toEqual([]);
  });
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

  it('mark_local_same_name_output_keeps_source_field', () => {
    const spec = PlotSchema.parse({
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
          transform: [{ operation: { kind: 'normalize', field: 'value', as: 'value' } }],
          encoding: { x: { field: 'x' }, y: { field: 'value' } },
        },
      ],
    });

    expect([...collectSourceFields(spec)].sort()).toEqual(['value', 'x']);
  });

  it('custom_mark_receives_local_transform_rows', () => {
    const record = { rows: [] as Array<ExternalRow> };
    const spec = PlotSchema.parse({
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
          transform: [
            {
              operation: {
                kind: 'summarize',
                groupBy: ['category'],
                metrics: [{ kind: 'sum', field: 'value', as: 'total' }],
              },
            },
          ],
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
      PlotSchema.parse({
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
            transform: [{ operation: { kind: 'double-local', field: 'value', as: 'double' } }],
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
      { ...opts, transformDefinitions: [doubleTransform], transformImplementations: [doubleTransformImplementation] },
    );

    expect(layer.children).toHaveLength(2);
  });

  it('mark_local_custom_transform_fields_use_same_registry', () => {
    const spec = PlotSchema.parse({
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
          transform: [{ operation: { kind: 'double-local', field: 'value', as: 'double' } }],
          encoding: { x: { field: 'x' }, y: { field: 'double' } },
        },
      ],
    });

    const fields = collectSourceFields(spec, resolveTransformRegistry([doubleTransform]));
    expect([...fields].sort()).toEqual(['value', 'x']);
  });
});
