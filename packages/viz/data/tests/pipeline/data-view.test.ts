import { NonBlankStringSchema } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';
import { literal, strictObject } from 'zod';

import type { DataView } from '../../src';

import { applyTransformsToDataView, DataFieldType, defineTransform, resolveTransformRegistry } from '../../src';

const sourceView = (): DataView => ({
  rows: [{ source: 2, stale: 'old' }],
  fieldTypes: new Map([
    ['source', DataFieldType.Continuous],
    ['stale', DataFieldType.Categorical],
  ]),
  fieldTypeEvidence: new Set(['source', 'stale']),
});

describe('resolved data view transforms', () => {
  it('preserves input field evidence and adds descriptor-derived output evidence', () => {
    const copyField = defineTransform({
      schema: strictObject({
        kind: literal('copy-field'),
        field: NonBlankStringSchema,
        as: NonBlankStringSchema,
      }),
      inputFields: operation => [operation.field],
      outputFields: operation => [operation.as],
      outputModel: operation => ({
        kind: 'preserve',
        outputs: [{ field: operation.as, type: { from: operation.field } }],
      }),
      apply: (rows, operation) => rows.map(row => ({ ...row, [operation.as]: row[operation.field] })),
    });

    const result = applyTransformsToDataView(
      sourceView(),
      [{ kind: 'copy-field', field: 'source', as: 'copy' }],
      resolveTransformRegistry([copyField]),
    );

    expect(result.rows).toEqual([{ source: 2, stale: 'old', copy: 2 }]);
    expect([...result.fieldTypes]).toEqual([
      ['source', DataFieldType.Continuous],
      ['stale', DataFieldType.Categorical],
      ['copy', DataFieldType.Continuous],
    ]);
    expect([...result.fieldTypeEvidence]).toEqual(['source', 'stale', 'copy']);
  });

  it('rebuilds replace output maps without retaining stale input evidence', () => {
    const replaceRows = defineTransform({
      schema: strictObject({ kind: literal('replace-rows'), as: NonBlankStringSchema }),
      outputFields: operation => [operation.as],
      outputModel: operation => ({
        kind: 'replace',
        fields: [{ field: operation.as, type: DataFieldType.Continuous }],
      }),
      apply: (_rows, operation) => [{ [operation.as]: 7 }],
    });

    const result = applyTransformsToDataView(
      sourceView(),
      [{ kind: 'replace-rows', as: 'value' }],
      resolveTransformRegistry([replaceRows]),
    );

    expect(result.rows).toEqual([{ value: 7 }]);
    expect([...result.fieldTypes]).toEqual([['value', DataFieldType.Continuous]]);
    expect([...result.fieldTypeEvidence]).toEqual(['value']);
  });

  it('rejects an unresolved descriptor source before executing the operation', () => {
    let applyCalls = 0;
    const invalidOutput = defineTransform({
      schema: strictObject({ kind: literal('invalid-output'), as: NonBlankStringSchema }),
      outputFields: operation => [operation.as],
      outputModel: operation => ({
        kind: 'preserve',
        outputs: [{ field: operation.as, type: { from: 'missing' } }],
      }),
      apply: (rows, operation) => {
        applyCalls += 1;
        return rows.map(row => ({ ...row, [operation.as]: 1 }));
      },
    });

    expect(() =>
      applyTransformsToDataView(
        sourceView(),
        [{ kind: 'invalid-output', as: 'value' }],
        resolveTransformRegistry([invalidOutput]),
      ),
    ).toThrow('data: transform output descriptor references unknown field "missing"');
    expect(applyCalls).toBe(0);
  });

  it('clears stale type evidence when an operation has no output model', () => {
    const untypedReplace = defineTransform({
      schema: strictObject({ kind: literal('untyped-replace') }),
      outputFields: () => ['derived'],
      apply: () => [{ derived: 1 }],
    });

    const result = applyTransformsToDataView(
      sourceView(),
      [{ kind: 'untyped-replace' }],
      resolveTransformRegistry([untypedReplace]),
    );

    expect(result.rows).toEqual([{ derived: 1 }]);
    expect([...result.fieldTypes]).toEqual([]);
    expect([...result.fieldTypeEvidence]).toEqual([]);
  });

  it('rebuilds summarize fields from group keys and reducer descriptors', () => {
    const view: DataView = {
      rows: [
        { month: 'Jan', revenue: 2 },
        { month: 'Jan', revenue: 3 },
      ],
      fieldTypes: new Map([
        ['month', DataFieldType.Categorical],
        ['revenue', DataFieldType.Continuous],
      ]),
      fieldTypeEvidence: new Set(['month', 'revenue']),
    };

    const result = applyTransformsToDataView(view, [
      {
        kind: 'summarize',
        groupBy: ['month'],
        metrics: [{ kind: 'sum', field: 'revenue', as: 'totalRevenue' }],
      },
    ]);

    expect(result.rows).toEqual([{ month: 'Jan', totalRevenue: 5 }]);
    expect([...result.fieldTypes]).toEqual([
      ['month', DataFieldType.Categorical],
      ['totalRevenue', DataFieldType.Continuous],
    ]);
    expect([...result.fieldTypeEvidence]).toEqual(['month', 'totalRevenue']);
  });
});
