import type { IRScope } from '@retikz/core';
import { defineTransformImplementation } from '@retikz/data';
import { defineTransform, resolveTransformRegistry } from '@retikz/data';
import { NonBlankStringSchema } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';
import { object } from 'zod';

import type { PlotsLoweringOptions } from '../../../src/pipeline/expand';
import { lowerPlotWithDataArtifact } from '../../../src/pipeline/expand/lower';
import { collectSourceFields } from '../../../src/pipeline/source-fields';
import type { IRPlot } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas';
import { measureLabel } from '../../helpers/text-measurement';

type Datasets = Record<string, Array<Record<string, unknown>>>;

const opts: PlotsLoweringOptions = { layout: { width: 480, height: 300 } };

const expandOf = (spec: IRPlot, datasets: Datasets, options?: PlotsLoweringOptions): IRScope => {
  return lowerPlotWithDataArtifact(spec, datasets, { ...options, textMeasurer: measureLabel }).child as IRScope;
};

const firstLayer = (spec: IRPlot, datasets: Datasets, options?: PlotsLoweringOptions): IRScope =>
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
        transforms: [
          {
            operation: {
              kind: 'summarize',
              params: {
                groupBy: ['category'],
                metrics: [{ kind: 'sum', field: 'value', as: 'total' }],
              },
            },
          },
        ],
        encodings: { position: { x: { field: 'category' }, y: { field: 'total' } } },
      },
    ],
  });

const doubleTransform = defineTransform({
  kind: 'double-local',
  paramsSchema: object({ field: NonBlankStringSchema, as: NonBlankStringSchema }),
  inputFields: operation => [operation.params.field],
  outputModel: operation => ({ kind: 'preserve', outputs: [{ field: operation.params.as }] }),
});

const doubleTransformImplementation = defineTransformImplementation({
  definition: doubleTransform,
  apply: (rows, operation) =>
    rows.map(row => ({
      ...row,
      [operation.params.as]: Number(row[operation.params.field]) * 2,
    })),
});

describe('标记局部变换', () => {
  it('在空根和标记范围内保留未知的输出字段和类别顺序', () => {
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
            kind: 'double-local',
            params: { field: 'value', as: 'range' },
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
          transforms: [{ operation: { kind: 'sort', params: { field: 'range' } } }],
          encodings: { position: { x: { field: 'group' }, y: { field: 'range' } } },
        },
      ],
    });
    const { dataArtifact } = lowerPlotWithDataArtifact(
      spec,
      { rows: [] },
      {
        definitions: { transforms: [doubleTransform] },
        implementations: { transforms: [doubleTransformImplementation] },
        textMeasurer: measureLabel,
      },
    );
    const expectedModel = [
      { name: 'value', type: 'continuous' },
      { name: 'group', type: 'categorical', order: ['B', 'A'] },
      { name: 'range' },
    ];

    expect(dataArtifact.rootDataView.model).toEqual(expectedModel);
    expect(dataArtifact.markDataViews[0].dataView.model).toEqual(expectedModel);
    expect(dataArtifact.markDataViews[0].dataView.model.find(field => field.name === 'range')).toEqual({
      name: 'range',
    });
    expect(dataArtifact.markDataViews[0].dataView.rows).toEqual([]);
  });

  it('内置标记使用局部变换行进行下沉', () => {
    const layer = firstLayer(groupPointSpec(), {
      sales: [
        { category: 'A', value: 4 },
        { category: 'A', value: 6 },
        { category: 'B', value: 3 },
      ],
    });

    expect(layer.children).toHaveLength(2);
  });

  it('标记本地转换字段馈送源字段集合', () => {
    const fields = collectSourceFields(groupPointSpec());

    expect([...fields].sort()).toEqual(['category', 'value']);
  });

  it('标记本地同名输出保留源字段', () => {
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
          transforms: [{ operation: { kind: 'normalize', params: { field: 'value', as: 'value' } } }],
          encodings: { position: { x: { field: 'x' }, y: { field: 'value' } } },
        },
      ],
    });

    expect([...collectSourceFields(spec)].sort()).toEqual(['value', 'x']);
  });

  it('标记数据视图包含本地变换行', () => {
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
          type: 'point',
          transforms: [
            {
              operation: {
                kind: 'summarize',
                params: {
                  groupBy: ['category'],
                  metrics: [{ kind: 'sum', field: 'value', as: 'total' }],
                },
              },
            },
          ],
          encodings: { position: { x: { field: 'category' }, y: { field: 'total' } } },
        },
      ],
    });

    const { dataArtifact } = lowerPlotWithDataArtifact(
      spec,
      {
        sales: [
          { category: 'A', value: 4 },
          { category: 'A', value: 6 },
          { category: 'B', value: 3 },
        ],
      },
      { ...opts, textMeasurer: measureLabel },
    );

    expect(dataArtifact.markDataViews[0].dataView.rows).toEqual([
      expect.objectContaining({ category: 'A', total: 10 }),
      expect.objectContaining({ category: 'B', total: 3 }),
    ]);
  });

  it('标记本地转换使用自定义转换注册表', () => {
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
            transforms: [{ operation: { kind: 'double-local', params: { field: 'value', as: 'double' } } }],
            encodings: { position: { x: { field: 'x' }, y: { field: 'double' } } },
          },
        ],
      }),
      {
        sales: [
          { x: 0, value: 2 },
          { x: 1, value: 5 },
        ],
      },
      {
        definitions: { transforms: [doubleTransform] },
        implementations: { transforms: [doubleTransformImplementation] },
        ...opts,
      },
    );

    expect(layer.children).toHaveLength(2);
  });

  it('标记本地自定义转换字段使用相同的注册表', () => {
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
          transforms: [{ operation: { kind: 'double-local', params: { field: 'value', as: 'double' } } }],
          encodings: { position: { x: { field: 'x' }, y: { field: 'double' } } },
        },
      ],
    });

    const fields = collectSourceFields(spec, resolveTransformRegistry([doubleTransform]));

    expect([...fields].sort()).toEqual(['value', 'x']);
  });
});
