import { NonBlankStringSchema } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';
import { literal, strictObject } from 'zod';

import type { DataView } from '../../src';
import {
  defineTransformImplementation,
  createDataView,
  applyTransformsToDataView,
  DataFieldType,
  defineTransform,
  resolveTransformRegistry,
} from '../../src';

const sourceView = (): DataView =>
  createDataView(
    [{ source: 2, stale: 'old' }],
    [
      { name: 'source', type: DataFieldType.Continuous },
      { name: 'stale', type: DataFieldType.Categorical },
    ],
  );

describe('resolved data view transforms', () => {
  it('preserves input field evidence and adds descriptor-derived output evidence', () => {
    const copyField = defineTransform({
      schema: strictObject({
        kind: literal('copy-field'),
        field: NonBlankStringSchema,
        as: NonBlankStringSchema,
      }),
      inputFields: operation => [operation.field],
      outputModel: operation => ({
        kind: 'preserve',
        outputs: [{ field: operation.as, type: { from: operation.field } }],
      }),
    });
    const copyFieldImplementation = defineTransformImplementation({
      definition: copyField,
      apply: (rows, operation) => rows.map(row => ({ ...row, [operation.as]: row[operation.field] })),
    });

    const result = applyTransformsToDataView(sourceView(), [{ kind: 'copy-field', field: 'source', as: 'copy' }], {
      registry: resolveTransformRegistry([copyField]),
      transformImplementations: [copyFieldImplementation],
    });

    expect(result.rows).toEqual([{ source: 2, stale: 'old', copy: 2 }]);
    expect(result.model).toEqual([
      { name: 'source', type: DataFieldType.Continuous },
      { name: 'stale', type: DataFieldType.Categorical },
      { name: 'copy', type: DataFieldType.Continuous },
    ]);
  });

  it('rebuilds replace output maps without retaining stale input evidence', () => {
    const replaceRows = defineTransform({
      schema: strictObject({ kind: literal('replace-rows'), as: NonBlankStringSchema }),
      outputModel: operation => ({
        kind: 'replace',
        fields: [{ field: operation.as, type: DataFieldType.Continuous }],
      }),
    });
    const replaceRowsImplementation = defineTransformImplementation({
      definition: replaceRows,
      apply: (_rows, operation) => [{ [operation.as]: 7 }],
    });

    const result = applyTransformsToDataView(sourceView(), [{ kind: 'replace-rows', as: 'value' }], {
      registry: resolveTransformRegistry([replaceRows]),
      transformImplementations: [replaceRowsImplementation],
    });

    expect(result.rows).toEqual([{ value: 7 }]);
    expect(result.model).toEqual([{ name: 'value', type: DataFieldType.Continuous }]);
  });

  it('rejects an unresolved descriptor source before executing the operation', () => {
    let applyCalls = 0;
    const invalidOutput = defineTransform({
      schema: strictObject({ kind: literal('invalid-output'), as: NonBlankStringSchema }),
      outputModel: operation => ({
        kind: 'preserve',
        outputs: [{ field: operation.as, type: { from: 'missing' } }],
      }),
    });
    const invalidOutputImplementation = defineTransformImplementation({
      definition: invalidOutput,
      apply: (rows, operation) => {
        applyCalls += 1;
        return rows.map(row => ({ ...row, [operation.as]: 1 }));
      },
    });

    expect(() =>
      applyTransformsToDataView(sourceView(), [{ kind: 'invalid-output', as: 'value' }], {
        registry: resolveTransformRegistry([invalidOutput]),
        transformImplementations: [invalidOutputImplementation],
      }),
    ).toThrow('data: output references unknown field "missing"');
    expect(applyCalls).toBe(0);
  });

  it('replaces stale evidence and observes scalar types for explicitly untyped output fields', () => {
    const untypedReplace = defineTransform({
      schema: strictObject({ kind: literal('untyped-replace') }),
      outputModel: () => ({
        kind: 'replace',
        fields: [{ field: 'derived' }],
      }),
    });
    const untypedReplaceImplementation = defineTransformImplementation({
      definition: untypedReplace,
      apply: () => [{ derived: 1 }],
    });

    const result = applyTransformsToDataView(sourceView(), [{ kind: 'untyped-replace' }], {
      registry: resolveTransformRegistry([untypedReplace]),
      transformImplementations: [untypedReplaceImplementation],
    });

    expect(result.rows).toEqual([{ derived: 1 }]);
    expect(result.model).toEqual([{ name: 'derived', type: 'continuous' }]);
  });

  it('rebuilds summarize fields from group keys and reducer descriptors', () => {
    const view = createDataView(
      [
        { month: 'Jan', revenue: 2 },
        { month: 'Jan', revenue: 3 },
      ],
      [
        { name: 'month', type: DataFieldType.Categorical },
        { name: 'revenue', type: DataFieldType.Continuous },
      ],
    );

    const result = applyTransformsToDataView(view, [
      {
        kind: 'summarize',
        groupBy: ['month'],
        metrics: [{ kind: 'sum', field: 'revenue', as: 'totalRevenue' }],
      },
    ]);

    expect(result.rows).toEqual([{ month: 'Jan', totalRevenue: 5 }]);
    expect(result.model).toEqual([
      { name: 'month', type: DataFieldType.Categorical },
      { name: 'totalRevenue', type: DataFieldType.Continuous },
    ]);
  });
});
