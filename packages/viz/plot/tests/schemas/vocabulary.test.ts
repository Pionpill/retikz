import { FieldOrderMode } from '@retikz/data';
import {
  DataSortOrder,
  ReducerOperationKind,
  RowSelectorTie,
  SelectorOp,
} from '@retikz/data';
import {
  TransformSchema,
} from '@retikz/plot';
import { describe, expect, it } from 'vitest';

describe('schema vocabulary constants', () => {
  it('exports plot transform and data vocabularies as const objects', () => {
    expect(Object.values(DataSortOrder).sort()).toEqual(['ascending', 'descending']);
    expect(Object.values(RowSelectorTie).sort()).toEqual(['all', 'first', 'last']);
    expect(Object.values(ReducerOperationKind).sort()).toEqual([
      'count',
      'extent',
      'max',
      'mean',
      'median',
      'min',
      'quantile',
      'quantile-band',
      'sum',
    ]);
    expect(Object.values(SelectorOp).sort()).toEqual([
      'bottom',
      'first',
      'last',
      'max',
      'min',
      'nth',
      'outside-quantile-band',
      'top',
    ]);
    expect(Object.values(FieldOrderMode).sort()).toEqual(['ascending', 'data', 'descending']);
  });

  it('uses the shared vocabulary values in transform schema parsing', () => {
    expect(
      TransformSchema.parse({
        kind: 'select',
        selector: {
          op: SelectorOp.Top,
          by: 'value',
          n: 1,
          tie: RowSelectorTie.All,
        },
      }),
    ).toEqual({
      kind: 'select',
      selector: {
        op: 'top',
        by: 'value',
        n: 1,
        tie: 'all',
      },
    });
  });
});
