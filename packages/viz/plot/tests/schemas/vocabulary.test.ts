import { BendDirection } from '@retikz/core';
import {
  BuiltinRegressionMethod,
  FieldOrderMode,
  DataSortOrder,
  ReducerOperationKind,
  RowSelectorTie,
  SelectorOperationKind,
  DensityBandwidthKind,
  JitterAxis,
  NormalizeBasis,
  PairMeasureOperationKind,
  TransformSchema,
} from '@retikz/data';
import { RibbonAlignment, RibbonTaperInterpolation } from '@retikz/extension';
import {
  AxisLineExtentTarget,
  AxisTitleBaseline,
  CoordinateArrangementKind,
  CoordinateViewPlacementKind,
  PolarInterpolation,
  PositionScaleContinuity,
  ReferenceMarkKind,
  RelationOrthogonalLabelStep,
  RelationRouteStepKind,
  RelationRoutingKind,
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
    expect(Object.values(SelectorOperationKind).sort()).toEqual([
      'bottom',
      'first',
      'last',
      'max',
      'min',
      'nth',
      'outside-quantile-band',
      'top',
    ]);
    expect(Object.values(FieldOrderMode).sort()).toEqual([
      'appearance',
      'ascending',
      'descending',
      'naturalAscending',
      'naturalDescending',
    ]);
  });

  it('exports closed plot schema vocabularies from their owners', () => {
    expect(Object.values(CoordinateViewPlacementKind).sort()).toEqual(['overlay', 'root', 'slot']);
    expect(Object.values(CoordinateArrangementKind).sort()).toEqual(['facet', 'tracks']);
    expect(Object.values(AxisLineExtentTarget)).toEqual(['plotArea']);
    expect(Object.values(AxisTitleBaseline).sort()).toEqual(['bottom', 'middle', 'top']);
    expect(Object.values(PairMeasureOperationKind)).toEqual(['difference']);
    expect(Object.values(NormalizeBasis).sort()).toEqual(['fraction', 'percent']);
    expect(Object.values(JitterAxis).sort()).toEqual(['both', 'x', 'y']);
    expect(Object.values(DensityBandwidthKind).sort()).toEqual(['silverman', 'value']);
    expect(Object.values(BuiltinRegressionMethod)).toEqual([
      'linear',
      'quadratic',
      'polynomial',
      'logarithmic',
      'exponential',
      'power',
    ]);
    expect(Object.values(RelationRouteStepKind).sort()).toEqual(['bend', 'cubic', 'curve', 'fold', 'line', 'move']);
    expect(Object.values(RelationRoutingKind).sort()).toEqual(['bend', 'line', 'orthogonal']);
    expect(Object.values(RelationOrthogonalLabelStep).sort()).toEqual(['last', 'main']);
    expect(Object.values(ReferenceMarkKind)).toEqual(['region']);
    expect(Object.values(PolarInterpolation).sort()).toEqual(['chord', 'polar']);
    expect(Object.values(PositionScaleContinuity).sort()).toEqual(['continuous', 'discrete']);
  });

  it('reuses core path vocabularies for relation routing and ribbon options', () => {
    expect(Object.values(BendDirection).sort()).toEqual(['left', 'right']);
    expect(Object.values(RibbonTaperInterpolation).sort()).toEqual(['linear', 'smooth']);
    expect(Object.values(RibbonAlignment).sort()).toEqual(['center', 'left', 'right']);
  });

  it('uses the shared vocabulary values in transform schema parsing', () => {
    expect(
      TransformSchema.parse({
        kind: 'select',
        params: {
          selector: {
            kind: SelectorOperationKind.Top,
            by: 'value',
            n: 1,
            tie: RowSelectorTie.All,
          },
        },
      }),
    ).toEqual({
      kind: 'select',
      params: {
        selector: {
          kind: 'top',
          by: 'value',
          n: 1,
          tie: 'all',
        },
      },
    });
  });
});
