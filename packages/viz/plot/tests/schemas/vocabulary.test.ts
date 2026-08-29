import { BendDirection } from '@retikz/core';
import { FieldOrderMode } from '@retikz/data';
import { DataSortOrder, ReducerOperationKind, RowSelectorTie, SelectorOperationKind } from '@retikz/data';
import {
  AxisLineExtentTarget,
  AxisTitleBaseline,
  CoordinateArrangementKind,
  CoordinateViewPlacementKind,
  DensityBandwidthKind,
  JitterAxis,
  NormalizeBasis,
  PairMeasureOperationKind,
  ReferenceMarkKind,
  RelationOrthogonalLabelStep,
  RelationRouteStepKind,
  RelationRoutingKind,
  SmoothMethodKind,
  TransformSchema,
} from '@retikz/plot';
import { RibbonAlignment, RibbonTaperInterpolation } from '@retikz/standard/ribbon';
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
    expect(Object.values(FieldOrderMode).sort()).toEqual(['appearance', 'ascending', 'descending']);
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
    expect(Object.values(SmoothMethodKind)).toEqual([
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
        selector: {
          kind: SelectorOperationKind.Top,
          by: 'value',
          n: 1,
          tie: RowSelectorTie.All,
        },
      }),
    ).toEqual({
      kind: 'select',
      selector: {
        kind: 'top',
        by: 'value',
        n: 1,
        tie: 'all',
      },
    });
  });
});
